import { NextResponse } from "next/server";
import { deleteVersion, setVersionArchived, setVersionScore } from "@/lib/db";

export const runtime = "nodejs";

// Two independent edits share this PATCH:
// - score: auto-iterate's champion confirmation adopts min(pinned, fresh) as the
//   version's score, persisting the conservative pick when the fresh confirmation run
//   rolled higher than the pinned-corpus run.
// - archived: cleanupVersions hides intermediate tries without deleting them (the guard
//   in setVersionArchived refuses to archive the original version).
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const hasScore = "score" in body;
  const hasArchived = "archived" in body;
  if (!hasScore && !hasArchived)
    return NextResponse.json({ error: "score (0-100) or archived (boolean) required" }, { status: 400 });

  if (hasScore) {
    const score = typeof body.score === "number" ? Math.round(body.score) : null;
    if (score == null || score < 0 || score > 100)
      return NextResponse.json({ error: "score (0-100) required" }, { status: 400 });
    setVersionScore(id, score);
  }
  if (hasArchived) {
    if (typeof body.archived !== "boolean")
      return NextResponse.json({ error: "archived must be a boolean" }, { status: 400 });
    const ok = setVersionArchived(id, body.archived);
    if (!ok)
      return NextResponse.json(
        { error: "Can't archive the original version" },
        { status: 400 }
      );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ok = deleteVersion(id);
  if (!ok)
    return NextResponse.json(
      { error: "Can't delete the original version" },
      { status: 400 }
    );
  return NextResponse.json({ ok: true });
}
