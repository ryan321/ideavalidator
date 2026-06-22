import { NextResponse } from "next/server";
import {
  deleteIdea,
  getArtifactsByVersion,
  getIdea,
  listVersions,
  setChosenName,
  setIdeaGoal,
  setIdeaJourney,
} from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!getIdea(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const body = await req.json();
  if ("goal" in body || "goalDetail" in body) {
    setIdeaGoal(
      id,
      typeof body.goal === "string" && body.goal ? body.goal : null,
      typeof body.goalDetail === "string" && body.goalDetail.trim() ? body.goalDetail.trim() : null
    );
  }
  if ("stage" in body || "chosenVersionId" in body) {
    setIdeaJourney(id, {
      stage: typeof body.stage === "string" ? body.stage : undefined,
      chosenVersionId: "chosenVersionId" in body ? body.chosenVersionId : undefined,
    });
  }
  if ("chosenName" in body) {
    setChosenName(id, typeof body.chosenName === "string" ? body.chosenName : null);
  }
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
