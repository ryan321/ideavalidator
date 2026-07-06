import { NextResponse } from "next/server";
import { getIdea, markIdeaPaid } from "@/lib/db";
import { billingEnabled, stripe } from "@/lib/billing";

export const runtime = "nodejs";

// Stripe webhook — the production-grade unlock path (confirm covers local dev).
// Configure the endpoint for checkout.session.completed and set
// STRIPE_WEBHOOK_SECRET; without the secret this route refuses everything.
export async function POST(req: Request) {
  if (!billingEnabled()) return NextResponse.json({ error: "Billing not configured" }, { status: 400 });
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET not set" }, { status: 400 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event;
  try {
    const payload = await req.text(); // raw body — required for signature verification
    event = await stripe().webhooks.constructEventAsync(payload, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const ideaId = session.metadata?.ideaId;
    if (ideaId && getIdea(ideaId) && session.payment_status === "paid") {
      markIdeaPaid(ideaId, session.id); // idempotent — replays are no-ops
    }
  }
  return NextResponse.json({ received: true });
}
