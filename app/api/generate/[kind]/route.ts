import { NextResponse } from "next/server";
import { GENERATORS, runGenerator } from "@/lib/generators";
import type { ArtifactKind } from "@/lib/db";

export const runtime = "nodejs";
// Grounded multi-step generation can take a while.
export const maxDuration = 300;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ kind: string }> }
) {
  const { kind } = await params;
  if (!(kind in GENERATORS)) {
    return NextResponse.json({ error: `Unknown kind: ${kind}` }, { status: 400 });
  }
  const { versionId } = await req.json();
  if (!versionId) {
    return NextResponse.json({ error: "versionId is required" }, { status: 400 });
  }
  try {
    const artifact = await runGenerator(versionId, kind as ArtifactKind);
    return NextResponse.json(artifact);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
