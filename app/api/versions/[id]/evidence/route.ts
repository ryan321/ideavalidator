import { NextResponse } from "next/server";
import { campaignAccessForVersion } from "@/lib/billing";
import { deleteEvidence, getVersion } from "@/lib/db";
import { collectEvidence } from "@/lib/evidence";

export const runtime = "nodejs";
// Query generation + fan-out searches + ranking can take a little while.
export const maxDuration = 120;

// Re-collect the evidence corpus for a version (clears the stored one first).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // campaign-pass gate (inert while billing is disabled)
  const access = campaignAccessForVersion(id);
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: 402 });
  if (!getVersion(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    deleteEvidence(id);
    const corpus = await collectEvidence(id);
    return NextResponse.json(corpus);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Evidence collection failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
