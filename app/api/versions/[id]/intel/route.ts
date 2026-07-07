import { NextResponse } from "next/server";
import { campaignAccessForVersion } from "@/lib/billing";
import { requireVersionOwner } from "@/lib/auth";
import { generateIntel } from "@/lib/generators/intel";

export const runtime = "nodejs";
export const maxDuration = 120;

// Generate (and persist) the market intel pack: cited competitor pricing/funding via
// Exa, the pricing anchor, and the copyable one-liner. Requires a validation.
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
    const artifact = await generateIntel(id);
    return NextResponse.json(artifact);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Intel generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
