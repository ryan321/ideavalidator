import { z } from "zod";
import type { ModelRole } from "../ai/models";
import type { ArtifactKind } from "../db";

// One typed claim from the claims-audit pre-pass: what kind of statement it is
// (founder-about-self vs founder-about-market) and the Mom-Test evidence tier of the
// support offered for it (1 = money/behavior actually happened … 4 = compliments/
// hypotheticals ≈ zero weight).
export type FounderClaim = {
  text: string;
  kind: "self_fact" | "market_assumption";
  tier: 1 | 2 | 3 | 4;
};

/** The claims-audit pre-pass output: the neutral third-person brief plus the typed,
 * evidence-tiered claim ledger (stored on the artifact as `claims_audit`). */
export type ClaimsAudit = { brief: string; claims: FounderClaim[] };

// Context handed to every generator: the idea plus any already-generated artifacts
// (steer anchors its revision on the current draft of the same kind).
export type GenContext = {
  idea: { title: string; prompt: string };
  prior: Partial<Record<ArtifactKind, unknown>>;
  /** Founder clarifications/corrections for this version (the "respond to the validator" feature). */
  context?: string | null;
  /** Founder's goal/ambition — scoring is judged relative to this. */
  goal?: { bucket: string; detail: string | null } | null;
  /** Per-regeneration steer: how the founder wants THIS deliverable adjusted. */
  steer?: string | null;
  /** Founder's market knowledge / build experience / network (sharpens scoring). */
  founderFit?: string | null;
  /** Neutral claims brief + typed claim ledger (sycophancy firewall pre-pass); null when the pre-pass failed. */
  claimsAudit?: ClaimsAudit | null;
  /** Communities the evidence corpus was drawn from (corpus.stats.communities) — the
   * next_test's cheapest_test must name its channel from these. */
  corpusCommunities?: string[] | null;
};

// Goal/ambition buckets. The goal does NOT bend the measurement: criteria are scored
// goal-neutrally and the goal enters through code (per-goal weight vectors + verdict
// bands in lib/scoring.ts, plus the Goal Fit criterion). The rubric describes what the
// founder is aiming at so Goal Fit and the narrative framing can be judged.
export const GOALS: Record<string, { label: string; rubric: string }> = {
  lifestyle: {
    label: "Lifestyle / replace my job",
    rubric:
      "a sustainable lifestyle business that replaces a salary (~$100-300k/yr profit for a solo founder or tiny team). A defensible niche with fast time-to-revenue and low burn fits this goal; a small reachable SOM ($1-10M) can be plenty and venture-scale moats/winner-take-most dynamics are NOT required. Competition is acceptable if the founder can own a profitable slice.",
  },
  side_hustle: {
    label: "Side hustle / extra income",
    rubric:
      "a side hustle producing extra income with minimal time. Speed-to-first-dollar, low effort/maintenance, and low startup cost fit this goal; TAM, moat, and scale barely matter to it. Heavy ongoing effort, big capital, long sales cycles, or needing a team are mismatches.",
  },
  venture: {
    label: "Venture-scale / raising funding",
    rubric:
      "a venture-scale startup meant to raise funding: a large TAM (~$1B+), fast growth, a credible path to category leadership / winner-take-most, and real defensibility. A merely-profitable niche does not fit this goal because it cannot return a fund; a believable 10x+ outcome does.",
  },
  unsure: {
    label: "Not sure yet",
    rubric:
      "not yet decided. Judge Goal Fit with a balanced lens AND state the tradeoff in the summary and goal_fit_note (e.g. 'a solid lifestyle business but sub-scale for venture') so the founder can choose a direction.",
  },
};

export function goalContext(ctx: GenContext): string {
  const g = ctx.goal;
  if (!g) return "";
  const base = GOALS[g.bucket]?.rubric ?? g.bucket;
  const detail = g.detail?.trim() ? ` The founder adds: "${g.detail.trim()}".` : "";
  return `\n\nFOUNDER'S GOAL: ${base}${detail}
GOAL SCOPING — this is a MEASUREMENT rule, follow it exactly: score the first 8 criteria GOAL-NEUTRALLY (the same idea gets the same Demand Strength whether the founder wants a side hustle or a fund-returner — the system applies goal-specific weights and verdict bands in code, so do NOT bake the goal into them). Any mismatch between the idea's required EFFORT, TIME, and CAPITAL and this goal is reflected in EXACTLY TWO places: the "Goal Fit" criterion score and the "goal_fit_note" — never spread across other criteria. Use the goal to frame the summary and obtainable-revenue judgment ("what can this founder expect, given what they want"), not to bend the measurements.`;
}

// Shared competition reasoning — used by validation and refine. Competitive Position
// and Differentiation / Moat are ORTHOGONAL constructs: the market's openness vs the
// founder's specific edge. The founder's alpha is measured ONLY in Moat.
export const COMPETITION_GUIDANCE = `Judge COMPETITION carefully, never crudely (do NOT just count competitors):
- Competition is first of all DEMAND VALIDATION — people already pay to solve this. Zero competitors is usually a red flag, not a plus. Route that evidence to Demand Strength and Willingness to Pay (see the criterion definitions), not to a better competition score.
- "Competitive Position" measures MARKET-STRUCTURE OPENNESS ONLY — how enterable this market is for ANY well-executed new entrant, independent of this founder's edge: incumbent CUSTOMER SATISFACTION from real signals (G2/Capterra/Trustpilot reviews, Reddit/HN/forum complaints, churn chatter — frustrated customers with no good alternative = open; genuinely happy customers = closed), SWITCHING COSTS / lock-in (data, integrations, contracts, embedded workflows — high lock-in = closed even when customers grumble), FRAGMENTATION (many small players = open; one entrenched winner = closed), and UNDERSERVED SEGMENTS incumbents structurally ignore. Do NOT count the founder's differentiator here.
- "Differentiation / Moat" measures THE FOUNDER'S SPECIFIC EDGE and nothing else. Classify the claimed edge into one of the 7 Powers: scale economies, network effects, counter-positioning, switching costs, brand, cornered resource, process power. Apply the benefit+barrier test — a real power delivers a benefit AND has a barrier stopping competitors from copying it. Unclassifiable claims ("first-mover", "better UX", "our AI", "we'll care more") band D or F. At the idea stage, only COUNTER-POSITIONING and a CORNERED RESOURCE can band A — network effects and scale are routes to verify later, not assets you have.
- CATEGORY EDUCATION (counterintuitive, belongs in "Acquisition Ease"): an established category usually makes selling EASIER — buyers understand it and have a budget line; creating a new category means an education tax and long sales cycles even when demand is real. So "no competitors" can mean harder customer acquisition, not easier.
- Name the specific segment and, when scoring Moat, name the specific power (or say "no classifiable power").`;

export type Generator<T = unknown> = {
  kind: ArtifactKind;
  label: string;
  blurb: string;
  role: ModelRole;
  grounded: boolean;
  /** Artifact kinds whose output improves this one if already generated. */
  uses?: ArtifactKind[];
  schema: z.ZodType<T>;
  system: string;
  buildPrompt: (ctx: GenContext) => string;
  maxTokens?: number;
  /** Web-plugin results per call (grounded generators only; default 5). */
  webMaxResults?: number;
};

export function ideaHeader(ctx: GenContext): string {
  return `Idea: "${ctx.idea.title}"\n\nDescription: ${ctx.idea.prompt}`;
}

// A finalized validation artifact carries computed grades (verdict, scores, gates).
// A steered regen must not see them — "preserve everything" would otherwise instruct
// the model to parrot the previous verdict/scores instead of re-judging the evidence.
function stripDerivedGrades(d: unknown): unknown {
  if (!d || typeof d !== "object" || Array.isArray(d)) return d;
  const o = d as Record<string, unknown>;
  if (!Array.isArray(o.criteria) || !("verdict" in o || "system_adjustments" in o)) return d;
  const {
    verdict: _v,
    score: _s,
    confidence: _c,
    system_adjustments: _sa,
    claims_audit: _cb,
    validations: _val,
    goal_scored: _g,
    ...rest
  } = o;
  const copy: Record<string, unknown> = { ...rest };
  copy.criteria = (o.criteria as Array<Record<string, unknown>>).map(
    ({ score: _cs, ...c }) => c
  );
  if (copy.demand && typeof copy.demand === "object") {
    const { strength: _st, ...dm } = copy.demand as Record<string, unknown>;
    copy.demand = dm;
  }
  return copy;
}

// Per-regeneration steer: how the founder wants THIS deliverable adjusted. Applied
// generically on top of any generator's prompt so steering works on every stage.
export function steerContext(ctx: GenContext, currentDraft?: unknown): string {
  const s = ctx.steer?.trim();
  if (!s) return "";
  // Anchor the revision to the existing draft so "adjust this" is a targeted edit,
  // not a blind regenerate that lands in the same place.
  const draftBlock = currentDraft
    ? `\n\nCURRENT DRAFT you are revising (preserve everything the instruction does NOT ask to change; apply the requested change clearly):\n${JSON.stringify(stripDerivedGrades(currentDraft)).slice(0, 8000)}`
    : "";
  return `\n\n=== FOUNDER STEER (highest priority — this is why you are regenerating) ===
The founder reviewed the current draft and wants it changed as described below. Apply this instruction directly and make the change clearly visible in the new output; rewrite as much as needed to satisfy it. Stay grounded in the artifacts above (don't invent or contradict their figures), and for any analytical task keep the scoring/verdict rules from the system message intact — but otherwise the founder's instruction takes precedence over your default choices.${draftBlock}

FOUNDER'S INSTRUCTION:
"""
${s}
"""`;
}

// Who the founder is — grounds Founder Fit on the actual person, not a generic
// stranger. Founder-specific advantages (skills, domain insight, capital, warm
// channels) are measured ONLY in Founder Fit; Acquisition Ease stays a market property.
export function founderProfile(ctx: GenContext): string {
  const f = ctx.founderFit?.trim();
  if (!f) return "";
  return `\n\nFOUNDER PROFILE — score "Founder Fit" for THIS founder, not a generic one: "${f}". Founder Fit covers their skills, domain insight, capital, AND distribution access (warm intros / an owned audience count HERE, not in Acquisition Ease — that criterion measures the market's channel structure for any entrant). An insider who has lived the pain is more credible; no prior building experience raises execution risk. Reflect this ONLY in Founder Fit (and demand credibility where they supply firsthand evidence) and say so in the explanation.`;
}

// Founder clarifications, injected into analysis prompts when present. NOT a blanket
// "authoritative" override: statements about the founder themselves are facts;
// statements about customers/competitors/market are assumptions to corroborate.
export function founderContext(ctx: GenContext): string {
  const c = ctx.context?.trim();
  if (!c) return "";
  return `\n\nFOUNDER CONTEXT — the founder reviewed a prior analysis and is clarifying or pushing back. Split their statements by SUBJECT before using them:
- Statements about THEMSELVES (their skills, network, capital, time, intent): AUTHORITATIVE FACTS — correct earlier mistakes accordingly and reflect them where founder attributes are measured (Founder Fit, Goal Fit).
- Statements about CUSTOMERS, COMPETITORS, or the MARKET (e.g. "those aren't real competitors", "customers told me they'd pay"): ASSUMPTIONS TO TEST, not facts. Corroborate each against the evidence corpus and your web searches BEFORE letting it move any band; cite the corroboration in the explanation. An uncorroborated market claim must be marked "founder-asserted, unverified" in the affected criterion's explanation and may move that criterion by AT MOST one band step on the founder's word alone.
Address these points directly and acknowledge them in the summary:\n"""\n${c}\n"""`;
}
