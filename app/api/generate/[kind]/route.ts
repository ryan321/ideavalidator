import { NextResponse } from "next/server";
import { GENERATORS, runGenerator } from "@/lib/generators";
import { getJob, incrementCampaignRuns, getVersion, setJob, type ArtifactKind } from "@/lib/db";
import { campaignAccessForVersion } from "@/lib/billing";

export const runtime = "nodejs";
// Grounded multi-step generation can take a while.
export const maxDuration = 300;

// A "running" job older than this is treated as dead (server restart) and can be
// superseded — the client's own poll gives up around the same horizon.
const RUNNING_JOB_TTL_MS = 6 * 60 * 1000;

// Job status — so the client can leave the page and come back to see progress/result.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;
  const versionId = new URL(req.url).searchParams.get("versionId");
  if (!versionId) return NextResponse.json({ error: "versionId required" }, { status: 400 });
  return NextResponse.json({ job: getJob(versionId, kind) ?? null });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;
  if (!(kind in GENERATORS)) {
    return NextResponse.json({ error: `Unknown kind: ${kind}` }, { status: 400 });
  }
  const { versionId, steer, background, deep, audit } = await req.json();
  if (!versionId) {
    return NextResponse.json({ error: "versionId is required" }, { status: 400 });
  }

  // Campaign-pass gate: one payment unlocks this idea's whole campaign, up to the
  // run cap. Inert while billing is disabled (no STRIPE_SECRET_KEY). The cap is counted
  // AFTER a run succeeds (see countRun) so a failed run never burns a paid slot.
  const access = campaignAccessForVersion(versionId);
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason, billing: access }, { status: 402 });
  }

  // Duplicate-run guard: a double-click / second tab / on-mount resume racing a fresh
  // click must not launch two concurrent runs for the same (version, kind) — they'd
  // double-spend and race the artifact write (last writer wins). A "running" job that's
  // still fresh blocks; a stale one (server died mid-job) is allowed to supersede.
  const existing = getJob(versionId, kind);
  if (existing?.status === "running" && Date.now() - Date.parse(existing.updated_at) < RUNNING_JOB_TTL_MS) {
    return NextResponse.json({ started: true, alreadyRunning: true });
  }

  // Count a successful validation against the campaign cap — only on success.
  const countRun = () => {
    if (kind !== "validation") return;
    const v = getVersion(versionId);
    if (v) incrementCampaignRuns(v.idea_id);
  };

  const opts = {
    steer: typeof steer === "string" && steer.trim() ? steer.trim() : null,
    // Wave 3: deep mode (bull/bear/reconcile + CoVe, ~3-4× cost) and the periodic
    // second-family audit judge. Both default off — standard runs are unchanged.
    deep: deep === true,
    audit: audit === true,
  };

  if (background) {
    // Run detached from this request so navigating away (or the fetch aborting)
    // doesn't interrupt it. Status is tracked in the DB; the artifact is saved on
    // completion. The client polls GET above.
    setJob(versionId, kind as ArtifactKind, "running");
    runGenerator(versionId, kind as ArtifactKind, opts)
      .then(() => {
        countRun(); // success only
        setJob(versionId, kind as ArtifactKind, "done");
      })
      .catch((err) =>
        setJob(versionId, kind as ArtifactKind, "error", err instanceof Error ? err.message : "Generation failed")
      );
    return NextResponse.json({ started: true });
  }

  setJob(versionId, kind as ArtifactKind, "running"); // guards a concurrent foreground run too
  try {
    const artifact = await runGenerator(versionId, kind as ArtifactKind, opts);
    countRun(); // success only
    setJob(versionId, kind as ArtifactKind, "done");
    return NextResponse.json(artifact);
  } catch (err) {
    setJob(versionId, kind as ArtifactKind, "error", err instanceof Error ? err.message : "Generation failed");
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
