import { NextResponse } from "next/server";
import { currentVersion, deleteIdea, getArtifact, getEvidence, listVersions } from "@/lib/db";
import { authenticate, requireOwnedIdea } from "@/lib/apiauth";
import { toApiValidation } from "@/lib/apiformat";
import type { Validation } from "@/lib/generators/validation";

export const runtime = "nodejs";

// GET /api/v1/ideas/{id} — the idea, its versions, and the current version's latest
// validation (if any). Free.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticate(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const owned = requireOwnedIdea(auth.key, id);
  if ("response" in owned) return owned.response;

  const version = currentVersion(id);
  const art = version ? getArtifact(version.id, "validation") : undefined;
  const evidence = version ? getEvidence(version.id) : undefined;
  return NextResponse.json({
    id: owned.idea.id,
    title: owned.idea.title,
    goal: owned.idea.goal,
    versions: listVersions(id).map((v) => ({ id: v.id, version: v.n, label: v.label, score: v.score, archived: !!v.archived })),
    current_version_id: version?.id ?? null,
    validation: art && version ? toApiValidation(owned.idea, version, art.data as Validation, evidence) : null,
  });
}

// DELETE /api/v1/ideas/{id} — remove an owned idea and all its data. Free.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticate(req);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const owned = requireOwnedIdea(auth.key, id);
  if ("response" in owned) return owned.response;
  deleteIdea(id);
  return NextResponse.json({ deleted: true });
}
