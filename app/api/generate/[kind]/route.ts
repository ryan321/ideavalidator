import { NextResponse } from "next/server";
import { GENERATORS, runGenerator } from "@/lib/generators";
import { getJob, setJob, type ArtifactKind } from "@/lib/db";

export const runtime = "nodejs";
// Grounded multi-step generation can take a while.
export const maxDuration = 300;

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
      .then(() => setJob(versionId, kind as ArtifactKind, "done"))
      .catch((err) =>
        setJob(versionId, kind as ArtifactKind, "error", err instanceof Error ? err.message : "Generation failed")
      );
    return NextResponse.json({ started: true });
  }

  try {
    const artifact = await runGenerator(versionId, kind as ArtifactKind, opts);
    return NextResponse.json(artifact);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
