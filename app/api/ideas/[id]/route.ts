import { NextResponse } from "next/server";
import {
  deleteIdea,
  getArtifactsByVersion,
  getEvidenceByVersion,
  getIdea,
  getIdeaCost,
  listVersions,
  runningJobsForIdea,
  scoreDistribution,
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
  const st = (done: boolean, stage: string) =>
    done ? "done" : idea.stage === stage ? "active" : "todo";
  const stageStatus = {
    validate: st(kinds.has("validation"), "validate"),
    decide: st(!!idea.chosen_version_id, "decide"),
  };
  return NextResponse.json({
    idea,
    versions: listVersions(id),
    artifactsByVersion,
    evidenceByVersion: getEvidenceByVersion(id),
    stageStatus,
    cost: getIdeaCost(id),
    runningJobs: runningJobsForIdea(id),
    // Population of all non-archived version scores across every idea — the workspace
    // computes the active version's percentile against it (SURFACE-PHASE renders it).
    scoreDistribution: scoreDistribution(),
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
