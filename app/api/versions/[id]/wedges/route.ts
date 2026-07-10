import { NextResponse } from "next/server";
import { campaignAccessForVersion, campaignDenyBody } from "@/lib/billing";
import { requireVersionOwner } from "@/lib/auth";
import { proposeWedges } from "@/lib/generators/wedges";
import { resolveLocale } from "@/lib/i18n/server";

export const runtime = "nodejs";
export const maxDuration = 120;

// Propose 3-5 divergent wedge variants for a version. Does NOT create versions —
// the client shows the set, then POSTs /api/versions per selected wedge and runs
// the tournament (validation on the pinned corpus) for each.
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owner = await requireVersionOwner(id);
  if ("response" in owner) return owner.response;
  // Needs unlock only — proposing wedges is cheap; tournament validates count separately
  const access = campaignAccessForVersion(id, await resolveLocale());
  if (!access.unlocked) return NextResponse.json(campaignDenyBody(access), { status: 402 });
  try {
    const proposal = await proposeWedges(id);
    return NextResponse.json(proposal);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Wedge proposal failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
