import { z } from "zod";
import { generateStructured } from "../ai/client";
import {
  getArtifact,
  getIdea,
  getVersion,
  listVersions,
  logUsage,
  saveNameData,
} from "../db";
import { checkDomains, type DomainStatus } from "../domains";

const NamesSchema = z.object({
  names: z.array(z.object({ name: z.string(), rationale: z.string() })).min(4).max(10),
});

export type NameCandidate = {
  name: string;
  rationale: string;
  domains: Record<string, DomainStatus>;
};

/** Generate brand-name candidates for an idea and check domain availability for each. */
export async function generateNames(
  ideaId: string
): Promise<{ candidates: NameCandidate[]; cost: number }> {
  const idea = getIdea(ideaId);
  if (!idea) throw new Error("Idea not found");

  const versions = listVersions(ideaId);
  const version = (idea.chosen_version_id ? getVersion(idea.chosen_version_id) : undefined) ??
    versions[versions.length - 1];
  const brand = version ? getArtifact(version.id, "brand")?.data : undefined;

  const { data, usage, model } = await generateStructured(NamesSchema, {
    role: "writing",
    grounded: false,
    maxTokens: 1500,
    system:
      "You are a startup brand-namer. Propose distinctive, pronounceable, .com-plausible brand names — " +
      "short (ideally 1-2 syllables, <= 12 letters), memorable, and ownable, not generic or descriptive. " +
      "Avoid hyphens, numbers, and obvious trademark clashes. Each entry is one real candidate name.",
    prompt: `Idea: "${idea.title}" — ${version?.statement ?? idea.prompt ?? ""}
${brand ? `Brand context (match this voice/archetype): ${JSON.stringify(brand).slice(0, 1500)}` : ""}
Propose 6-8 brand-name candidates. Return JSON: { "names": [{"name": string, "rationale": string (one line)}] }`,
  });

  const candidates: NameCandidate[] = await Promise.all(
    data.names.map(async (n) => ({ ...n, domains: await checkDomains(n.name) }))
  );

  saveNameData(ideaId, candidates);
  logUsage({ ideaId, versionId: version?.id ?? null, kind: "names", model, usage });
  return { candidates, cost: usage.cost };
}
