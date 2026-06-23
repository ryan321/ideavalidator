import { z } from "zod";
import type { ModelRole } from "../ai/models";
import type { ArtifactKind } from "../db";

// Context handed to every generator: the idea plus any already-generated artifacts,
// so downstream modules (brand, marketing, pitch) stay coherent with validation/market.
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
};

// Goal/ambition buckets. "Good idea" is judged relative to the founder's goal, not a generic VC lens.
export const GOALS: Record<string, { label: string; rubric: string }> = {
  lifestyle: {
    label: "Lifestyle / replace my job",
    rubric:
      "a sustainable lifestyle business that replaces a salary (~$100-300k/yr profit for a solo founder or tiny team). A DEFENSIBLE NICHE is ideal — a huge TAM is NOT required and a small reachable SOM ($1-10M) can be plenty. Weight fast time-to-revenue, low burn, and a profitable wedge HIGH; weight venture-scale moats and winner-take-most dynamics LOW. Competition is acceptable as long as the founder can own a profitable slice. Such an idea can earn a GO even with a modest TAM.",
  },
  side_hustle: {
    label: "Side hustle / extra income",
    rubric:
      "a side hustle producing extra income with minimal time. Weight speed-to-first-dollar, low effort/maintenance, and low startup cost HIGHEST; TAM, moat, and scale barely matter. Penalize anything needing heavy ongoing effort, big capital, long sales cycles, or a team.",
  },
  venture: {
    label: "Venture-scale / raising funding",
    rubric:
      "a venture-scale startup meant to raise funding. Apply the VC bar: require a large TAM (~$1B+), fast growth, a credible path to category leadership / winner-take-most, and real defensibility. A merely-profitable niche is a NO-GO because it cannot return a fund. Entrenched, well-funded, well-liked incumbents are a serious risk. Reserve high scores for a believable 10x+ outcome.",
  },
  unsure: {
    label: "Not sure yet",
    rubric:
      "not yet decided. Score with a balanced lens AND state the tradeoff in the summary (e.g. 'a solid lifestyle business but sub-scale for venture') so the founder can choose a direction.",
  },
};

export function goalContext(ctx: GenContext): string {
  const g = ctx.goal;
  if (!g) return "";
  const base = GOALS[g.bucket]?.rubric ?? g.bucket;
  const detail = g.detail?.trim() ? ` The founder adds: "${g.detail.trim()}".` : "";
  return `\n\nFOUNDER'S GOAL — judge this idea RELATIVE TO this goal, not a generic VC lens: ${base}${detail}\nWhat counts as a "good idea", the verdict bands, and how much competition should worry the founder all depend on this goal. ALSO weigh the idea's required EFFORT, TIME commitment, and CAPITAL/cost against what the founder is willing to put in (from the goal/detail above) — penalize a mismatch (e.g. an idea needing a full-time team and heavy capital when the founder wants a low-effort, low-cost side project), even if the idea is otherwise strong.`;
}

// Shared competition reasoning — used by validation, market, and refine.
export const COMPETITION_GUIDANCE = `Judge COMPETITION carefully, never crudely (do NOT just count competitors):
- Competition is first of all DEMAND VALIDATION — people already pay to solve this. Zero competitors is usually a red flag, not a plus.
- Assess incumbent CUSTOMER SATISFACTION from real signals (G2/Capterra/Trustpilot reviews, Reddit/HN/forum complaints, churn chatter): are customers happy or frustrated? "Frustrated customers with no good alternative" is one of the best openings; genuinely happy customers are the hardest moat to break.
- Assess SWITCHING COSTS / lock-in: even frustrated customers can't leave if lock-in is high (data, integrations, contracts, embedded workflows). High incumbent lock-in = harder to capture; low lock-in = a better product can take share.
- Measure the ALPHA / differentiator: an occupied category is fine IF there is a real edge. The edge can be (a) PRODUCT — better on a dimension that matters; (b) a NICHE / different angle the incumbents serve badly (e.g. CLI dev tools vs a team product); or (c) POSITIONING — being the credible ALTERNATIVE to a dominant player for a segment that rejects it for non-product reasons (privacy, trust, ideology, lock-in/vendor-diversification, simplicity, "anyone-but-BigCo"). A not-better-but-not-the-incumbent option can still capture enough of a disaffected segment to be worthwhile.
- CATEGORY EDUCATION (counterintuitive): an established category (competitors already exist) usually makes selling EASIER — buyers understand the category, have a budget line, and you'd be best-in-category rather than only-in-category. Creating a brand-new category means an education tax and long sales cycles even when demand is real. So "no competitors" can mean harder customer acquisition, not easier.
- Name the specific alpha and the target segment, weighted RELATIVE TO THE GOAL (a lifestyle business can thrive amid competition by owning a slice; a venture bet usually cannot if incumbents are entrenched AND well-liked).
Reflect this in the "Competitive Position" score (HIGH = favorable position GIVEN the alpha, not merely "few competitors") and in "Differentiation / Moat" (how strong/defensible the alpha is).`;

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
};

// Helper: compactly serialize prior artifacts for prompt context.
export function priorContext(ctx: GenContext, kinds: ArtifactKind[]): string {
  const parts: string[] = [];
  for (const k of kinds) {
    if (ctx.prior[k]) {
      parts.push(`### ${k} (already generated)\n${JSON.stringify(ctx.prior[k])}`);
    }
  }
  return parts.length
    ? `\n\nGround your answer in these already-generated artifacts. REUSE their concrete values verbatim where relevant — the same TAM/SAM/SOM figures, the same CAC/LTV, the same named competitors, persona, and pricing. Do NOT contradict or re-estimate any number that already appears below:\n${parts.join("\n\n")}`
    : "";
}

export function ideaHeader(ctx: GenContext): string {
  return `Idea: "${ctx.idea.title}"\n\nDescription: ${ctx.idea.prompt}`;
}

// Per-regeneration steer: how the founder wants THIS deliverable adjusted. Applied
// generically on top of any generator's prompt so steering works on every stage.
export function steerContext(ctx: GenContext, currentDraft?: unknown): string {
  const s = ctx.steer?.trim();
  if (!s) return "";
  // Anchor the revision to the existing draft so "adjust this" is a targeted edit,
  // not a blind regenerate that lands in the same place.
  const draftBlock = currentDraft
    ? `\n\nCURRENT DRAFT you are revising (preserve everything the instruction does NOT ask to change; apply the requested change clearly):\n${JSON.stringify(currentDraft).slice(0, 8000)}`
    : "";
  return `\n\n=== FOUNDER STEER (highest priority — this is why you are regenerating) ===
The founder reviewed the current draft and wants it changed as described below. Apply this instruction directly and make the change clearly visible in the new output; rewrite as much as needed to satisfy it. Stay grounded in the artifacts above (don't invent or contradict their figures), and for any analytical task keep the scoring/verdict rules from the system message intact — but otherwise the founder's instruction takes precedence over your default choices.${draftBlock}

FOUNDER'S INSTRUCTION:
"""
${s}
"""`;
}

// Who the founder is — used to ground Feasibility, Acquisition Ease, and the demand
// read on the actual person, not a generic stranger.
export function founderProfile(ctx: GenContext): string {
  const f = ctx.founderFit?.trim();
  if (!f) return "";
  return `\n\nFOUNDER PROFILE — score Feasibility, Acquisition Ease, and demand credibility for THIS founder, not a generic one: "${f}". An insider who has lived the pain is more credible (raise Demand/Feasibility confidence); warm intros make early acquisition easier and should be the #1 channel when present; no prior building experience raises execution risk. Reflect this in the relevant criteria and say so in the explanations.`;
}

// Authoritative founder clarifications, injected into analysis prompts when present.
export function founderContext(ctx: GenContext): string {
  const c = ctx.context?.trim();
  if (!c) return "";
  return `\n\nFOUNDER CONTEXT — the founder reviewed a prior analysis and is clarifying or pushing back. Treat the following as AUTHORITATIVE and correct earlier mistakes accordingly (e.g. if it says certain "competitors" aren't real competitors, re-evaluate the competition criterion in that light). Address these points directly and acknowledge them in the summary:\n"""\n${c}\n"""`;
}
