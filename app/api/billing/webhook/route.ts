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

  // Instant (card) completion AND delayed/async methods that clear later — both must
  // unlock. checkout.session.completed can arrive with payment_status "unpaid" for async
  // methods; the real unlock then comes via async_payment_succeeded.
  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object;
    const ideaId = session.metadata?.ideaId;
    if (ideaId && session.payment_status === "paid") {
      if (!getIdea(ideaId)) {
        // A paid session names an idea we can't read (transient db issue) — return 5xx
        // so Stripe REDELIVERS rather than dropping a real payment on the floor.
        return NextResponse.json({ error: "Idea not resolvable; retry" }, { status: 503 });
      }
      markIdeaPaid(ideaId, session.id); // idempotent — replays are no-ops
    }
  }
  return NextResponse.json({ received: true });
}
