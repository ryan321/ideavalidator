import { NextResponse } from "next/server";
import { campaignAccessForVersion, campaignDenyBody } from "@/lib/billing";
import { requireVersionOwner } from "@/lib/auth";
import { deleteEvidence } from "@/lib/db";
import { collectEvidence } from "@/lib/evidence";
import { resolveLocale } from "@/lib/i18n/server";

export const runtime = "nodejs";
// Query generation + fan-out searches + ranking can take a little while.
export const maxDuration = 120;

// Re-collect the evidence corpus for a version (clears the stored one first).
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owner = await requireVersionOwner(id);
  if ("response" in owner) return owner.response;
  // Needs unlock only — evidence refresh does not burn a scoring run
  const access = campaignAccessForVersion(id, await resolveLocale());
  if (!access.unlocked) return NextResponse.json(campaignDenyBody(access), { status: 402 });
  try {
    deleteEvidence(id);
    const corpus = await collectEvidence(id);
    return NextResponse.json(corpus);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Evidence collection failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
