import { NextResponse } from "next/server";
import {
  deleteIdea,
  getArtifactsByVersion,
  getIdea,
  listVersions,
  setIdeaGoal,
} from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!getIdea(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { goal, goalDetail } = await req.json();
  setIdeaGoal(
    id,
    typeof goal === "string" && goal ? goal : null,
    typeof goalDetail === "string" && goalDetail.trim() ? goalDetail.trim() : null
  );
  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const idea = getIdea(id);
  if (!idea) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    idea,
    versions: listVersions(id),
    artifactsByVersion: getArtifactsByVersion(id),
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  deleteIdea(id);
  return NextResponse.json({ ok: true });
}
