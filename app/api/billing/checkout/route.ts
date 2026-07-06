import { NextResponse } from "next/server";
import { getIdea } from "@/lib/db";
import { billingEnabled, priceCents, stripe } from "@/lib/billing";

export const runtime = "nodejs";

// Create a Stripe Checkout session for an idea's campaign pass. The client
// redirects to the returned url; success bounces back with ?session_id= which
// /api/billing/confirm verifies (works in local dev without webhooks).
export async function POST(req: Request) {
  if (!billingEnabled()) {
    return NextResponse.json({ error: "Billing is not configured." }, { status: 400 });
  }
  const { ideaId } = await req.json();
  const idea = getIdea(ideaId);
  if (!idea) return NextResponse.json({ error: "Unknown ideaId" }, { status: 400 });
  if (idea.paid) return NextResponse.json({ error: "This campaign is already unlocked." }, { status: 400 });

  const origin =
    req.headers.get("origin") ?? process.env.OPENROUTER_APP_URL ?? "http://localhost:3000";
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: priceCents(),
            product_data: {
              name: "IdeaValidator — full validation campaign",
              description: `“${idea.title}” — grounded validation, wedge tournament, kill-test kit, competitor intel & revalidations.`,
            },
          },
        },
      ],
      metadata: { ideaId: idea.id },
      success_url: `${origin}/idea/${idea.id}?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/idea/${idea.id}?checkout=cancelled`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start checkout";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
