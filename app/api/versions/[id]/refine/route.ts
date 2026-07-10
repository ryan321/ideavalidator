import { NextResponse } from "next/server";
import { campaignAccessForVersion, campaignDenyBody } from "@/lib/billing";
import { requireVersionOwner } from "@/lib/auth";
import { proposeRefinement } from "@/lib/generators/refine";
import { resolveLocale } from "@/lib/i18n/server";

export const runtime = "nodejs";
export const maxDuration = 120;

// Propose an AI refinement for a version. Does NOT create a version —
// the client shows the proposal, then POSTs /api/versions to accept it.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owner = await requireVersionOwner(id);
  if ("response" in owner) return owner.response;
  // Needs unlock only — refine propose does not burn a scoring run
  const access = campaignAccessForVersion(id, await resolveLocale());
  if (!access.unlocked) return NextResponse.json(campaignDenyBody(access), { status: 402 });
  try {
    const proposal = await proposeRefinement(id);
    return NextResponse.json(proposal);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Refinement failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
