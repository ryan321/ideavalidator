import Stripe from "stripe";
import { getIdea, getVersion, type Idea } from "./db";
import { DEFAULT_LOCALE, type Locale } from "./i18n/config";
import { createTranslator } from "./i18n/t";

// Campaign-pass billing: ONE Stripe payment unlocks an idea's full campaign —
// validations, wedge tournaments, the kill-test kit, intel, and revalidations — up to
// CAMPAIGN_RUN_CAP validation runs (the COGS guardrail; typical campaign ≈ 3–7 runs).
//
// Only full scoring runs (kind=validation) count against the cap. Chat, kit, intel,
// refine, wedges-propose, etc. need the campaign unlocked but do not burn a run.
//
// The whole module is inert without STRIPE_SECRET_KEY: billingEnabled() = false and
// every gate allows everything, so local dev is unchanged until you opt in.

export const CAMPAIGN_RUN_CAP = Number(process.env.CAMPAIGN_RUN_CAP ?? 10);

/** Soft-warn when this many scoring runs (or fewer) remain. */
export const CAMPAIGN_RUNS_LOW_AT = 2;

export function billingEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function priceCents(): number {
  return Number(process.env.CAMPAIGN_PRICE_CENTS ?? 2900); // $29 campaign pass
}

let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Billing is not configured (STRIPE_SECRET_KEY missing).");
  if (!_stripe) _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  return _stripe;
}

export type CampaignDenialCode = "CAMPAIGN_LOCKED" | "CAMPAIGN_RUNS_EXHAUSTED";

export type CampaignAccess = {
  enabled: boolean; // billing configured at all
  paid: boolean;
  runsUsed: number;
  runCap: number;
  remaining: number;
  priceCents: number;
  /** Campaign is paid (or billing off). Cheap tools use this gate. */
  unlocked: boolean;
  /** May start a validation / scoring run (unlocked and under cap, or billing off). */
  canScore: boolean;
  /**
   * @deprecated Prefer canScore for validations and unlocked for tools.
   * Kept as canScore so older clients that only checked `allowed` still block scoring.
   */
  allowed: boolean;
  code?: CampaignDenialCode;
  /** human reason when a gate fails */
  reason?: string;
};

/** The campaign entitlement for an idea. When billing is disabled, everything is allowed. */
export function campaignAccess(
  idea: Idea | undefined,
  locale: Locale = DEFAULT_LOCALE
): CampaignAccess {
  const t = createTranslator(locale);
  const enabled = billingEnabled();
  const paid = !!idea?.paid;
  const runsUsed = idea?.campaign_runs ?? 0;
  const runCap = CAMPAIGN_RUN_CAP;
  const remaining = Math.max(0, runCap - runsUsed);
  const base = {
    enabled,
    paid,
    runsUsed,
    runCap,
    remaining,
    priceCents: priceCents(),
  };

  if (!enabled) {
    return { ...base, unlocked: true, canScore: true, allowed: true };
  }
  if (!idea) {
    return {
      ...base,
      unlocked: false,
      canScore: false,
      allowed: false,
      code: "CAMPAIGN_LOCKED",
      reason: t("billingMsg.unknownIdea"),
    };
  }
  if (!paid) {
    return {
      ...base,
      unlocked: false,
      canScore: false,
      allowed: false,
      code: "CAMPAIGN_LOCKED",
      reason: t("billingMsg.locked"),
    };
  }
  if (runsUsed >= runCap) {
    return {
      ...base,
      unlocked: true,
      canScore: false,
      allowed: false,
      code: "CAMPAIGN_RUNS_EXHAUSTED",
      reason: t("billingMsg.exhausted", { n: runCap }),
    };
  }
  return { ...base, unlocked: true, canScore: true, allowed: true };
}

/** Resolve a versionId to its idea's campaign access — the gate the API routes use. */
export function campaignAccessForVersion(
  versionId: string,
  locale: Locale = DEFAULT_LOCALE
): CampaignAccess {
  const version = getVersion(versionId);
  const idea = version ? getIdea(version.idea_id) : undefined;
  return campaignAccess(idea, locale);
}

/** JSON body for a 402 when a campaign gate fails. */
export function campaignDenyBody(access: CampaignAccess) {
  return {
    error: access.reason ?? "Campaign action not allowed.",
    code: access.code,
    billing: access,
  };
}
