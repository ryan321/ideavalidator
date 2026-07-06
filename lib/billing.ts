import Stripe from "stripe";
import { getIdea, getVersion, type Idea } from "./db";

// Campaign-pass billing: ONE Stripe payment unlocks an idea's full campaign —
// validations, wedge tournaments, the kill-test kit, intel, and revalidations — up to
// CAMPAIGN_RUN_CAP validation runs (the COGS guardrail; typical campaign ≈ 7 runs).
//
// The whole module is inert without STRIPE_SECRET_KEY: billingEnabled() = false and
// every gate allows everything, so local dev is unchanged until you opt in.

export const CAMPAIGN_RUN_CAP = Number(process.env.CAMPAIGN_RUN_CAP ?? 20);

export function billingEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function priceCents(): number {
  return Number(process.env.CAMPAIGN_PRICE_CENTS ?? 2500); // default $25 — decide later
}

let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Billing is not configured (STRIPE_SECRET_KEY missing).");
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

export type CampaignAccess = {
  enabled: boolean; // billing configured at all
  paid: boolean;
  runsUsed: number;
  runCap: number;
  priceCents: number;
  /** true when the requested action may proceed */
  allowed: boolean;
  /** human reason when !allowed */
  reason?: string;
};

/** The campaign entitlement for an idea. When billing is disabled, everything is allowed. */
export function campaignAccess(idea: Idea | undefined): CampaignAccess {
  const enabled = billingEnabled();
  const paid = !!idea?.paid;
  const runsUsed = idea?.campaign_runs ?? 0;
  const base = { enabled, paid, runsUsed, runCap: CAMPAIGN_RUN_CAP, priceCents: priceCents() };
  if (!enabled) return { ...base, allowed: true };
  if (!idea) return { ...base, allowed: false, reason: "Unknown idea." };
  if (!paid) {
    return { ...base, allowed: false, reason: "This idea's campaign isn't unlocked yet — one payment covers the full campaign." };
  }
  if (runsUsed >= CAMPAIGN_RUN_CAP) {
    return {
      ...base,
      allowed: false,
      reason: `This campaign has used its ${CAMPAIGN_RUN_CAP} validation runs (the fair-use cap). Start a new version of the idea as a fresh campaign, or raise CAMPAIGN_RUN_CAP.`,
    };
  }
  return { ...base, allowed: true };
}

/** Resolve a versionId to its idea's campaign access — the gate the API routes use. */
export function campaignAccessForVersion(versionId: string): CampaignAccess {
  const version = getVersion(versionId);
  const idea = version ? getIdea(version.idea_id) : undefined;
  return campaignAccess(idea);
}
