import { NextResponse } from "next/server";
import { deleteVersion, setVersionScore } from "@/lib/db";

export const runtime = "nodejs";

// Auto-iterate's champion confirmation adopts min(pinned, fresh) as the version's
// score — this lets the client persist that conservative pick when the fresh
// confirmation run rolled higher than the pinned-corpus run.
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const score = typeof body.score === "number" ? Math.round(body.score) : null;
  if (score == null || score < 0 || score > 100)
    return NextResponse.json({ error: "score (0-100) required" }, { status: 400 });
  setVersionScore(id, score);
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
      { error: "Can't delete the original or the chosen version" },
      { status: 400 }
    );
  return NextResponse.json({ ok: true });
}
