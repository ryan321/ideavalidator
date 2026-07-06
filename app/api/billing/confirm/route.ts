import { NextResponse } from "next/server";
import { getIdea, markIdeaPaid } from "@/lib/db";
import { billingEnabled, stripe } from "@/lib/billing";

export const runtime = "nodejs";

// Verify a checkout session server-side and unlock the idea. This is the local-dev
// path (no webhook forwarding needed): the success redirect carries session_id, the
// client posts it here, and we trust STRIPE'S answer — never the query param alone.
export async function POST(req: Request) {
  if (!billingEnabled()) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 400 });
  }
  const { sessionId } = await req.json();
  if (typeof sessionId !== "string" || !sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }
  try {
    const session = await stripe().checkout.sessions.retrieve(sessionId);
    const ideaId = session.metadata?.ideaId;
    if (!ideaId || !getIdea(ideaId)) {
      return NextResponse.json({ error: "Session has no known idea." }, { status: 400 });
    }
    if (session.payment_status !== "paid") {
      return NextResponse.json({ paid: false });
    }
    markIdeaPaid(ideaId, session.id);
    return NextResponse.json({ paid: true, ideaId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not confirm payment";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
