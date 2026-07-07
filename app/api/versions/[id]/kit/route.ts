import { NextResponse } from "next/server";
import { campaignAccessForVersion } from "@/lib/billing";
import { requireVersionOwner } from "@/lib/auth";
import { generateKit } from "@/lib/generators/kit";

export const runtime = "nodejs";
export const maxDuration = 120;

// Generate (and persist) the kill-test execution kit for a version. Requires a
// validation artifact — the kit operationalizes its next_test.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owner = await requireVersionOwner(id);
  if ("response" in owner) return owner.response;
  // campaign-pass gate (inert while billing is disabled)
  const access = campaignAccessForVersion(id);
  if (!access.allowed) return NextResponse.json({ error: access.reason }, { status: 402 });
  try {
    const artifact = await generateKit(id);
    return NextResponse.json(artifact);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kit generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
