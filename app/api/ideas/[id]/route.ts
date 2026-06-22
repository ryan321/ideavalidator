import { NextResponse } from "next/server";
import {
  deleteIdea,
  getArtifactsByVersion,
  getIdea,
  getNameData,
  listVersions,
  payingCount,
  prospectCount,
  setChosenName,
  setChosenPitch,
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
  if ("chosenPitch" in body) {
    setChosenPitch(id, typeof body.chosenPitch === "string" ? body.chosenPitch : null);
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
  const artifactsByVersion = getArtifactsByVersion(id);
  const kinds = new Set(Object.values(artifactsByVersion).flat().map((a) => a.kind));
  const name = getNameData(id);
  const st = (done: boolean, stage: string) =>
    done ? "done" : idea.stage === stage ? "active" : "todo";
  const paying = payingCount(id);
  const hasProspects = prospectCount(id) > 0;
  const stageStatus = {
    validate: st(kinds.has("validation"), "validate"),
    decide: st(!!idea.chosen_version_id, "decide"),
    pitch: st(!!idea.chosen_pitch, "pitch"),
    sell: paying > 0 ? "done" : hasProspects || idea.stage === "sell" ? "active" : "todo",
    name: st(!!name.chosen_name, "name"),
    brand: st(kinds.has("brand"), "brand"),
  };
  return NextResponse.json({
    idea,
    versions: listVersions(id),
    artifactsByVersion,
    chosenName: name.chosen_name,
    stageStatus,
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
