import { NextResponse } from "next/server";
import {
  deleteIdea,
  getArtifactsByVersion,
  getEvidenceByVersion,
  getIdeaCost,
  listVersions,
  runningJobsForIdea,
  scoreDistribution,
  setIdeaGoal,
  setIdeaJourney,
} from "@/lib/db";
import { campaignAccess } from "@/lib/billing";
import { requireIdeaOwner } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owned = await requireIdeaOwner(id);
  if ("response" in owned) return owned.response;
  const body = await req.json();
  if ("goal" in body || "goalDetail" in body) {
    setIdeaGoal(
      id,
      typeof body.goal === "string" && body.goal ? body.goal : null,
      typeof body.goalDetail === "string" && body.goalDetail.trim() ? body.goalDetail.trim() : null
    );
  }
  if ("stage" in body) {
    setIdeaJourney(id, {
      stage: typeof body.stage === "string" ? body.stage : undefined,
    });
  }
  return NextResponse.json({ ok: true });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owned = await requireIdeaOwner(id);
  if ("response" in owned) return owned.response;
  const idea = owned.idea;
  const artifactsByVersion = getArtifactsByVersion(id);
  const kinds = new Set(Object.values(artifactsByVersion).flat().map((a) => a.kind));
  // Feeds AppNav's single-stage completion dot: Validate is "done" once any version has
  // a validation artifact, else "active" when the user is on the validate stage.
  const stageStatus = {
    validate: kinds.has("validation") ? "done" : idea.stage === "validate" ? "active" : "todo",
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
    // Campaign-pass state: {enabled, paid, runsUsed, runCap, priceCents, allowed}.
    // enabled=false (billing not configured) means the paywall never renders.
    billing: campaignAccess(idea),
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owned = await requireIdeaOwner(id);
  if ("response" in owned) return owned.response;
  deleteIdea(id);
  return NextResponse.json({ ok: true });
}
