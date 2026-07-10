import { NextResponse } from "next/server";
import { getIdeaForUser, markIdeaPaid } from "@/lib/db";
import { billingEnabled, campaignAccess, stripe } from "@/lib/billing";
import { requireUser } from "@/lib/auth";
import { resolveLocale } from "@/lib/i18n/server";

export const runtime = "nodejs";

// Verify a checkout session server-side and unlock the idea. This is the local-dev
// path (no webhook forwarding needed): the success redirect carries session_id, the
// client posts it here, and we trust STRIPE'S answer — never the query param alone.
export async function POST(req: Request) {
  if (!billingEnabled()) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 400 });
  }
  const auth = await requireUser();
  if ("response" in auth) return auth.response;
  const { sessionId } = await req.json();
  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    const ideaId = session.metadata?.ideaId;
    // only unlock an idea the caller actually owns (defense in depth vs. a replayed id)
    if (!ideaId || !getIdeaForUser(ideaId, auth.user.id)) {
      return NextResponse.json({ error: "Session has no known idea." }, { status: 400 });
    }
    if (session.payment_status !== "paid") {
      return NextResponse.json({ paid: false });
    }
    markIdeaPaid(ideaId, session.id);
    const idea = getIdeaForUser(ideaId, auth.user.id);
    return NextResponse.json({
      paid: true,
      ideaId,
      billing: campaignAccess(idea, await resolveLocale()),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not confirm payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
