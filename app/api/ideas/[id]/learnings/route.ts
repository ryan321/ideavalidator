import { NextResponse } from "next/server";
import { z } from "zod";
import { generateStructured } from "@/lib/ai/client";
import { getIdea, getVersion, listProspects, listVersions, logUsage } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 120;

const LearningsSchema = z.object({
  themes: z.array(z.object({ theme: z.string(), evidence: z.string() })).min(1),
  biggest_objection: z.string().catch(""),
  recommended_change: z.string(),
  suggested_context: z.string(), // a paragraph the founder can feed back into validation
});

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idea = getIdea(id);
  if (!idea) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const prospects = listProspects(id);
  if (!prospects.length)
    return NextResponse.json({ error: "Add some prospects first" }, { status: 400 });

  const versions = listVersions(id);
  const version =
    (idea.chosen_version_id ? getVersion(idea.chosen_version_id) : undefined) ??
    versions[versions.length - 1];

  const notes = prospects
    .map(
      (p) =>
        `- ${p.name}${p.company ? ` (${p.company})` : ""} | status: ${p.status}` +
        `${p.pain ? ` | pain ${p.pain}/5` : ""}${p.objection ? ` | objection: ${p.objection}` : ""}` +
        `${p.next_step ? ` | next: ${p.next_step}` : ""}${p.notes ? ` | notes: ${p.notes}` : ""}`
    )
    .join("\n");

  try {
    const { data, usage, model } = await generateStructured(LearningsSchema, {
      role: "writing",
      grounded: false,
      maxTokens: 1500,
      system:
        "You are a founder-led-sales coach reading a founder's real prospect pipeline. Extract the honest signal " +
        "— recurring pain themes, the objections that actually block deals, and which segment resonates — and say " +
        "plainly what to change about the idea or positioning. Base everything ONLY on the notes provided; do not " +
        "invent prospects or feedback. Be direct, not encouraging-for-its-own-sake.",
      prompt: `Idea: "${idea.title}" — ${version?.statement ?? idea.prompt ?? ""}

Prospect pipeline (real outreach so far):
${notes}

Synthesize what the market is telling this founder. Return JSON:
{
  "themes": [{"theme": string, "evidence": string}],   // recurring patterns + the prospect evidence
  "biggest_objection": string,                          // the single objection blocking deals most
  "recommended_change": string,                         // the concrete change to idea/positioning/offer
  "suggested_context": string                           // a short paragraph the founder can hand to the validator to RE-VALIDATE the idea in light of these real conversations (written as authoritative founder context)
}`,
    });
    logUsage({ ideaId: id, versionId: version?.id ?? null, kind: "learnings", model, usage });
    return NextResponse.json({ learnings: data, cost: usage.cost });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not synthesize learnings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
