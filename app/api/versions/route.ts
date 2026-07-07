import { NextResponse } from "next/server";
import {
  createVersion,
  getEvidence,
  getVersion,
  saveEvidence,
  type VersionOrigin,
} from "@/lib/db";
import { requireIdeaOwner } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { ideaId, statement, label, origin, parentId, rationale, context } = await req.json();
  if (!ideaId) return NextResponse.json({ error: "Unknown ideaId" }, { status: 400 });
  const owned = await requireIdeaOwner(ideaId);
  if ("response" in owned) return owned.response;
  if (typeof statement !== "string" || statement.trim().length < 8) {
    return NextResponse.json(
      { error: "Statement must be at least a sentence." },
      { status: 400 }
    );
  }
  const version = createVersion(ideaId, {
    statement: statement.trim(),
    label: label ?? null,
    origin: (origin as VersionOrigin) ?? "manual",
    parentId: parentId ?? null,
    rationale: rationale ?? null,
    context: typeof context === "string" && context.trim() ? context.trim() : null,
  });
  // Corpus pinning: a child version (refine / auto-iterate / respond / alpha / manual
  // edit) inherits the parent's evidence corpus, re-keyed to the child — so version-
  // to-version score comparisons hold the evidence constant instead of re-rolling it.
  // "Refresh evidence" (or auto-iterate's fresh-corpus confirmation) re-collects.
  if (typeof parentId === "string" && parentId) {
    const parent = getVersion(parentId);
    const corpus = parent?.idea_id === ideaId ? getEvidence(parentId) : undefined;
    if (corpus) {
      saveEvidence(version.id, { ...corpus, version_id: version.id, pinned_from: parentId });
    }
  }
  return NextResponse.json(version, { status: 201 });
}
