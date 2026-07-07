import { NextResponse } from "next/server";
import { createVersion, currentVersion, getEvidence, saveEvidence } from "@/lib/db";
import { apiError, authenticate, requireOwnedIdea } from "@/lib/apiauth";

export const runtime = "nodejs";

// POST /api/v1/ideas/{id}/versions — create a new version of the idea from a rewritten
// statement (e.g. a refine/wedge proposal). Pins the current version's evidence corpus
// so a follow-up validate compares on constant evidence. Free — validate it next.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticate(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const owned = requireOwnedIdea(auth.key, id);
  if ("response" in owned) return owned.response;

  let body: { statement?: string; label?: string; rationale?: string };
  try {
    body = await req.json();
  } catch {
    return apiError("invalid_request", "Body must be JSON.", 400);
  }
  const statement = typeof body.statement === "string" ? body.statement.trim() : "";
  if (statement.length < 8) return apiError("invalid_request", "`statement` must be at least a sentence.", 400);

  const parent = currentVersion(id);
  const version = createVersion(id, {
    statement,
    label: typeof body.label === "string" ? body.label : null,
    origin: "manual",
    parentId: parent?.id ?? null,
    rationale: typeof body.rationale === "string" ? body.rationale : null,
    context: null,
  });
  // corpus pinning: inherit the parent's evidence so scores compare on constant evidence
  if (parent) {
    const corpus = getEvidence(parent.id);
    if (corpus) saveEvidence(version.id, { ...corpus, version_id: version.id, pinned_from: parent.id });
  }
  return NextResponse.json({ version_id: version.id, version: version.n, label: version.label }, { status: 201 });
}
