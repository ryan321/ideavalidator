import { NextResponse } from "next/server";
import { campaignAccessForVersion, campaignDenyBody } from "@/lib/billing";
import { requireVersionOwner } from "@/lib/auth";
import { recordTestResult } from "@/lib/generators/testresult";
import { resolveLocale } from "@/lib/i18n/server";

export const runtime = "nodejs";
export const maxDuration = 60;

// Record the kill-test's real-world result: the founder reports what happened; the
// system judges it against the PRE-REGISTERED pass/kill bars and persists both.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const owner = await requireVersionOwner(id);
  if ("response" in owner) return owner.response;
  // Needs unlock only — logging a result does not burn a scoring run
  const access = campaignAccessForVersion(id, await resolveLocale());
  if (!access.unlocked) return NextResponse.json(campaignDenyBody(access), { status: 402 });
  try {
    const { report } = await req.json();
    if (typeof report !== "string") {
      return NextResponse.json({ error: "report (string) required" }, { status: 400 });
    }
    const artifact = await recordTestResult(id, report);
    return NextResponse.json(artifact);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not record the result";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
