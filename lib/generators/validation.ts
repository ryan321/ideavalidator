import { z } from "zod";
import { BANDS, CRITERIA, LEVERS, LEVER_MEANING } from "../scoring";
import { ANCHOR_PANEL } from "./anchors";
import {
  COMPETITION_GUIDANCE,
  Generator,
  founderContext,
  founderProfile,
  goalContext,
  ideaHeader,
} from "./shared";

const Signal = z.object({
  text: z.string(),
  category: z.string(), // MARKET | DEMAND | DEFENSIBILITY | REVENUE | EXECUTION | TECH ...
});

// One elicited criterion: the model writes the explanation (rationale) FIRST, then
// commits to a coarse band — code maps bands to 0-100 (lib/scoring.ts BAND_SCORE).
const ElicitedCriterion = z.object({
  // gates/weights/roll-ups key on these exact names — drift must fail parse (self-repair fixes it)
  name: z.enum(CRITERIA),
  group: z.enum(["demand", "build"]),
  category: z.string(), // MARKET | EXECUTION | DEMAND ...
  explanation: z.string(), // evidence-for / evidence-against, written BEFORE the band
  // What could actually move this score (lib/scoring.ts LEVERS) — refine attacks only
  // positioning/execution levers; evidence levers route to next_test.
  lever: z.enum(LEVERS),
  lever_action: z.string(), // ONE concrete line: what would actually move this criterion
  // Normalize trivial deviations ("b+", "A -") before the strict enum — a full
  // self-repair retry of a 16k-token call is too expensive for a stray space.
  band: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(/\s+/g, "").toUpperCase() : v),
    z.enum(BANDS)
  ),
});

// The kill-test: the cheapest way to change this verdict, pre-registered before any
// real-world result exists. First-class — rendered ABOVE the score in the report.
const NextTest = z.object({
  riskiest_assumption: z.string(), // a belief the corpus does NOT already prove + the criteria it underpins
  cheapest_test: z.string(), // concrete, ≤1 week, ≤$100, names a channel from the corpus's own communities
  pass_threshold: z.string(), // pre-registered numeric/observable bar: the assumption held
  kill_threshold: z.string(), // pre-registered bar: kill or pivot
  would_flip: z.object({
    to_go: z.string(), // what evidence would flip this verdict up
    to_no_go: z.string(), // what evidence would flip it down
  }),
  pivotal_criterion: z.string().catch(""), // borderline verdicts: the ONE criterion whose resolution exits the band; else ""
});

// One typed claim from the claims-audit pre-pass (see lib/generators/shared.ts
// FounderClaim): self_fact vs market_assumption, plus the Mom-Test evidence tier of
// the support offered (1 money/behavior … 4 compliments/hypotheticals).
export const ClaimSchema = z.object({
  text: z.string(),
  kind: z.enum(["self_fact", "market_assumption"]),
  tier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).catch(3),
});
export const ClaimsAuditSchema = z.object({
  brief: z.string(),
  claims: z.array(ClaimSchema).catch([]),
});

// The headline demand read as ELICITED — "strength" is intentionally absent: it is
// derived in code from the Demand Strength criterion score so the two can't contradict.
const DemandBlock = z.object({
  willingness_to_pay: z.string(), // what target customers would realistically pay
  obtainable_revenue: z.string(), // realistic annual $ THIS founder could capture
  reasoning: z.string(), // demand x WTP x capturable share
  // The visible arithmetic behind obtainable_revenue.
  math: z
    .object({
      reachable: z.string(), // customers you can realistically reach (the touchable SOM slice)
      capture: z.string(), // share/conversion of those you can win
      price: z.string(), // annual revenue per customer
    })
    .optional(),
  // Range, so the founder sees the downside, not just a point estimate.
  sensitivity: z
    .object({
      conservative: z.string().catch(""), // if it goes worse than expected
      base: z.string().catch(""), // the headline
      optimistic: z.string().catch(""), // if it goes well
    })
    .optional(),
});

/**
 * What the MODEL returns (the generator's schema). No overall verdict/score — those
 * are computed server-side from the criterion bands (weights + gates in lib/scoring.ts).
 */
export const ValidationElicitSchema = z.object({
  confidence: z.number().min(0).max(100), // self-report only nudges the computed number
  summary: z.string(),
  // Explicit effort/capital/time vs the founder's goal; for goal="unsure", the
  // lifestyle-vs-venture read. The ONLY place (with Goal Fit) a goal mismatch lands.
  goal_fit_note: z.string().catch("").optional(),

  // Prospective hindsight, written BEFORE any bands: "18 months later this failed
  // because..." — scores must be consistent with it. Rendered in the Risks section.
  pre_mortem: z.array(z.string()).min(3).max(5),

  // Radar + Demand/Build factor bars + detailed explanations all read from this
  // (after code maps each band to a numeric score).
  criteria: z
    .array(ElicitedCriterion)
    .length(CRITERIA.length) // exactly the 10 named criteria the radar expects
    // A duplicated name (with another dropped) passes length+enum, and the gates keyed
    // on the missing name would silently no-op — fail parse so self-repair fires.
    .superRefine((cs, ctx) => {
      const names = new Set(cs.map((c) => c.name));
      for (const n of CRITERIA)
        if (!names.has(n))
          ctx.addIssue({
            code: "custom",
            message: `missing criterion "${n}" — output each of the ${CRITERIA.length} names exactly once`,
          });
    }),

  // The kill-test — pre-registered next step that could change this verdict.
  next_test: NextTest,

  go_signals: z.object({
    positive_signals: z.array(Signal).min(1),
    key_strengths: z.array(Signal).min(1),
  }),
  stop_signals: z.object({
    critical_risks: z.array(Signal).min(1),
    areas_of_concern: z.array(Signal).min(1),
  }),

  // Probability x Impact risk matrix (1-5 each).
  risk_matrix: z
    .array(
      z.object({
        title: z.string(),
        category: z.enum(["tech", "market", "financial"]),
        probability: z.number().min(1).max(5),
        impact: z.number().min(1).max(5),
        mitigation: z.string(),
      })
    )
    .min(3),

  // Questions the founder could answer that would most change this assessment.
  clarifying_questions: z.array(z.string()).max(6).default([]),

  // The "pain → obvious solution" sales narrative, gleaned from the idea (drives demand).
  narrative: z
    .object({
      who: z.string(), // who feels the pain
      pain: z.string(), // articulated so they'd say "yes, that's me"
      status_quo: z.string(), // what they do today / existing solutions / workarounds
      cost_of_inaction: z.string(), // what staying the same costs them
      solution: z.string(), // your offering
      after: z.string(), // the transformation if they use it
      verdict: z.enum(["Painkiller", "Vitamin"]),
      why: z.string(),
    })
    .optional(),

  // The headline: willingness to pay → realistically obtainable revenue (vs the goal).
  demand: DemandBlock.optional(),

  // What running this business is actually like, day to day.
  operating: z
    .object({
      effort_level: z.enum(["Low", "Medium", "High"]),
      description: z.string(), // what the founder would spend their time doing
    })
    .optional(),

  // The downside: personal/financial exposure if it goes wrong.
  downside: z
    .object({
      capital_at_risk: z.string(), // money the founder must put up and could lose
      liability: z.string(), // legal / regulatory / liability exposure
      if_it_fails: z.string(), // what's realistically at stake (incl. customers not paying)
    })
    .optional(),

  // How hard it is to actually win customers (often decoupled from demand).
  acquisition: z
    .object({
      difficulty: z.enum(["Easy", "Moderate", "Hard"]),
      reasoning: z.string(), // category education tax, budget lines, sales cycle, channels
    })
    .optional(),

  // Concrete differentiators the idea could pursue — each is one-click testable via re-validation.
  possible_alphas: z
    .array(z.object({ alpha: z.string(), rationale: z.string() }))
    .max(5)
    .default([]),

  // ---- Comprehensive analysis (one call covers it all) -----------------------
  // Every field below is optional + .catch so a partial result still renders.

  // MARKET & COMPETITION
  market: z
    .object({
      // sizing drives the TAM/SAM/SOM donut
      sizing: z
        .object({
          tam: z.object({ value: z.string().catch(""), note: z.string().catch("") }).catch({ value: "", note: "" }),
          sam: z.object({ value: z.string().catch(""), note: z.string().catch("") }).catch({ value: "", note: "" }),
          som: z.object({ value: z.string().catch(""), note: z.string().catch("") }).catch({ value: "", note: "" }),
          methodology: z.string().catch(""),
        })
        .catch({ tam: { value: "", note: "" }, sam: { value: "", note: "" }, som: { value: "", note: "" }, methodology: "" }),
      cagr_pct: z.number().catch(0), // e.g. 18 — labels the donut
      // search/SEO demand trend (external evidence the interest is real & rising)
      search_trend: z
        .object({
          keyword: z.string().catch(""),
          direction: z.enum(["Rising", "Flat", "Falling"]).catch("Flat"),
          note: z.string().catch(""), // e.g. "+85% YoY interest in 'X'"
        })
        .optional(),
      momentum: z.string().catch("").optional(), // a recent funding/exit/shift in the category
      competitors: z
        .array(
          z.object({
            name: z.string().catch(""),
            note: z.string().catch(""), // what they do + how happy their customers are
            complaint_theme: z.string().catch(""), // the top thing their customers complain about
            your_edge: z.string().catch(""), // your angle vs them
          })
        )
        .catch([]),
      // cited evidence of the pain, drawn ONLY from the fetched corpus. The model
      // outputs {evidence_id, quote, tag}; the server rewrites url/source/engagement
      // from the corpus item (and drops unknown ids), so no invented link can render.
      demand_signals: z
        .array(
          z.object({
            evidence_id: z.string().catch(""), // corpus id, e.g. "E3"
            quote: z.string().catch(""), // the pain, in their words (from that item)
            tag: z.string().catch(""), // PAIN POINT | FEATURE REQUEST | DISCUSSION
            // enriched server-side from the corpus (present on stored artifacts).
            // .catch(undefined) so model junk in one field can't wipe the array.
            source: z.enum(["reddit", "hn"]).optional().catch(undefined),
            url: z.string().optional().catch(undefined),
            community: z.string().optional().catch(undefined),
            score: z.number().optional().catch(undefined),
            num_comments: z.number().optional().catch(undefined),
            created_utc: z.number().optional().catch(undefined),
            wtp_signal: z.boolean().optional().catch(undefined),
          })
        )
        .catch([]),
    })
    .optional(),

  // MONEY
  financials: z
    .object({
      startup_cost: z.string().catch(""),
      unit_economics: z
        .object({
          cac: z.string().catch(""),
          ltv: z.string().catch(""),
          payback: z.string().catch(""),
        })
        .catch({ cac: "", ltv: "", payback: "" }),
      revenue_model: z.string().catch(""), // pricing + how money is made
      projections: z
        .array(
          z.object({
            year: z.string().catch(""),
            revenue: z.string().catch(""),
            customers: z.string().catch(""),
            note: z.string().catch(""),
          })
        )
        .catch([]),
    })
    .optional(),

  // PLAN
  plan: z
    .object({
      milestones: z
        .array(
          z.object({
            title: z.string().catch(""),
            when: z.string().catch(""), // e.g. "Month 1-2"
            metric: z.string().catch(""), // how you'll know it's done
          })
        )
        .catch([]),
      team_and_ops: z.string().catch(""), // who/what it takes to run
    })
    .optional(),
});

export type ValidationElicited = z.infer<typeof ValidationElicitSchema>;

// A visible note appended whenever a code-level rule fired (gates, clamps, lints) —
// the report shows its own enforcement instead of hiding it.
export const SystemAdjustmentSchema = z.object({ rule: z.string(), detail: z.string() });
export type SystemAdjustment = z.infer<typeof SystemAdjustmentSchema>;

/**
 * The stored ARTIFACT shape (what the UI validates against and renders): the elicited
 * fields plus everything the server derives — verdict/score, per-criterion numeric
 * scores, the validations roll-ups, demand.strength, system_adjustments, claims_audit.
 */
export const ValidationSchema = ValidationElicitSchema.extend({
  verdict: z.enum(["GO", "MAYBE", "NO-GO", "INSUFFICIENT EVIDENCE"]),
  score: z.number().min(0).max(100),
  criteria: z
    .array(
      ElicitedCriterion.extend({
        score: z.number().min(0).max(100),
        // k-sample self-consistency (SCORING_SAMPLES>1): the max−min band-score spread
        // across the k samples for THIS criterion. Present only when it exceeded the
        // disagreement threshold (the samples disagreed materially); absent for k=1 and
        // for criteria the samples agreed on. .catch(undefined) so an old artifact
        // without it still validates.
        spread: z.number().optional().catch(undefined),
      })
    )
    .length(CRITERIA.length),
  // Evidence-base scorecard — DERIVED roll-ups of the criteria (problem = Demand
  // Strength; solution = Problem-Solution Fit; market = mean of Market Timing +
  // Competitive Position), reusing the corresponding criterion explanations.
  validations: z.object({
    problem: z.object({ score: z.number().min(0).max(100), rationale: z.string() }),
    solution: z.object({ score: z.number().min(0).max(100), rationale: z.string() }),
    market: z.object({ score: z.number().min(0).max(100), rationale: z.string() }),
  }),
  demand: DemandBlock.extend({ strength: z.enum(["Weak", "Moderate", "Strong"]) }).optional(),
  system_adjustments: z.array(SystemAdjustmentSchema),
  // The neutral third-person restatement the scorer judged (sycophancy firewall),
  // plus the typed, evidence-tiered claim ledger the pre-pass extracted from it.
  claims_audit: ClaimsAuditSchema.optional(),
  // The goal the weights/bands/gates actually used — the UI judges the stored score
  // against THIS, not the live goal picker, so verdict and meter can't desynchronize.
  goal_scored: z.enum(["lifestyle", "side_hustle", "venture", "unsure"]).optional(),
});

export type Validation = z.infer<typeof ValidationSchema>;
export type ValidationCriterion = Validation["criteria"][number];

// The subject block: the neutral claims brief is the primary object of analysis; the
// founder's original wording is reference only (its tone must not move any band).
function subjectBlock(ctx: Parameters<Generator["buildPrompt"]>[0]): string {
  const brief = ctx.claimsAudit?.brief?.trim();
  if (!brief) return ideaHeader(ctx);
  const claims = ctx.claimsAudit?.claims ?? [];
  const ledger = claims.length
    ? `\n\nCLAIM LEDGER — each claim typed and evidence-tiered by a pre-pass (T1 = money/behavior actually changed hands/happened; T2 = costly commitment; T3 = specific past fact; T4 = compliments/hypotheticals — weigh T1/T2 heavily, T4 ≈ zero). "self_fact" claims (about the founder themselves) are authoritative; "market_assumption" claims (about customers/competitors/market) must be corroborated against the corpus/web before they move a band:\n${claims
        .map((c) => `- [${c.kind} · T${c.tier}] ${c.text}`)
        .join("\n")}`
    : "";
  return `CLAIMS BRIEF — the neutral restatement you are validating. Score THIS, claim by claim:
${brief}${ledger}

ORIGINAL STATEMENT (reference only — consult it for details the brief may have dropped; its tone, enthusiasm, and superlatives carry ZERO evidential weight):
Idea: "${ctx.idea.title}"
${ctx.idea.prompt}`;
}

export const validationGenerator: Generator<ValidationElicited> = {
  kind: "validation",
  label: "Validation",
  blurb: "One grounded pass: scored verdict + market, money, plan & risks.",
  role: "scoring",
  grounded: true,
  webMaxResults: 10, // the one big grounded pass gets a deeper result set
  schema: ValidationElicitSchema,
  maxTokens: 16000, // one comprehensive analysis: verdict + market + money + plan
  system:
    "You are a brutally honest startup analyst. Validate ideas against real market evidence from web " +
    "search, not hype. Be specific and quantitative, never generic.\n" +
    "BAND SCORING PROTOCOL — for each of the 10 criteria you emit a coarse letter band, not a number: " +
    'one of "A+","A","A-","B+","B","B-","C+","C","C-","D+","D","D-","F". Meaning: A = directly ' +
    "demonstrated / as strong as the strongest anchor below; B = a real, evidenced signal; C = plausible " +
    "but unvalidated; D = weak, contradicted, or unclassifiable; F = fatal flaw or the evidence is absent/" +
    "against. For EVERY criterion write the explanation FIRST — evidence for, evidence against, and a " +
    "comparison to the relevant anchors — and only THEN commit to the band. Never choose bands to hit a " +
    "target overall result: the overall score and verdict are COMPUTED by the system from your bands " +
    "(published weights + non-compensatory gates), so spend your effort scoring each criterion honestly " +
    "and independently on its OWN evidence. Most real ideas have at least one criterion at C or below.\n" +
    "EVIDENCE ROUTING — established competitors PROFITABLY doing largely what this idea proposes is strong " +
    "demand evidence: anchor Demand Strength and Willingness to Pay to that evidence — typically B+ to A- " +
    "depending on incumbent health and growth. It is EVIDENCE ROUTING, never a floor, and it says NOTHING " +
    "about Problem-Solution Fit (that this solution's mechanism works), Competitive Position (how open the " +
    "market structure is), or Differentiation / Moat (this founder's edge) — score those on their own " +
    "evidence, where a me-too idea's weakness actually lives.\n" +
    "The criteria are ORTHOGONAL constructs — one observation must not sweep several of them. Score each " +
    "goal-neutrally (the goal enters through code-side weights and the Goal Fit criterion only).\n\n" +
    ANCHOR_PANEL +
    "\n\n" +
    "BE TERSE. This report is read on screen by a busy founder — every prose field must be tight and " +
    "skimmable. No preamble, no restating the idea, no hedging. Prefer the shortest wording that keeps the " +
    "specific evidence (a named competitor, a real figure). Long-windedness is a defect, not thoroughness.",
  buildPrompt: (ctx) => `${subjectBlock(ctx)}${goalContext(ctx)}${founderProfile(ctx)}${founderContext(ctx)}

FOUNDER-ASSET CLAIMS — verification rule: any founder capability or asset claimed in the statement or
context (an audience, warm channels, domain experience, partnerships, proprietary data, capital) that
does NOT appear in the FOUNDER PROFILE above is UNVERIFIED: cap every criterion that rests on it
(usually Founder Fit or Differentiation / Moat) at band C, write "unverified founder claim" in that
criterion's explanation, and add a clarifying question asking the founder to confirm it.${
    ctx.founderFit?.trim() ? "" : " No founder profile was provided, so ALL founder-asset claims are unverified."
  }

This is the SINGLE comprehensive analysis — it must cover the assessment AND the market/competition, the money,
and the plan, all consistent with each other (reuse the same figures across sections; don't contradict yourself).

Validate this idea. You MUST issue web searches before answering and base every figure (market size,
CAGR, competitor funding, pricing) on a result you actually retrieved. Name the
source domain or publication inline in the relevant rationale/explanation/text (e.g. "(grandviewresearch.com, 2024)").
If search returns no figure, write "no reliable source found" and LOWER that criterion's band and the
overall confidence — do NOT invent a number, a competitor, or a Reddit thread. Name at least 2 real,
currently-operating competitors by name in the explanations.

An EVIDENCE section of real Reddit/Hacker News posts we fetched appears at the end of this prompt —
it is the ONLY citable demand evidence. Ground Demand Strength, Willingness to Pay, and the
demand_signals in those numbered items (weigh WILLINGNESS-TO-PAY-flagged ones heavily); if the corpus
is thin for a dimension, say so and band that dimension lower.

FIRST, glean the "pain → obvious solution" NARRATIVE from the idea — even if the founder didn't spell it
out (this drives the demand judgment): WHO feels the pain; the PAIN itself, articulated so that person
would say "yes, that's exactly me"; what they do TODAY (status_quo: existing solutions / workarounds);
the COST OF INACTION (what staying the same costs them — quantify if you can); your SOLUTION; and the
AFTER (the transformation). Then set the VERDICT: a PAINKILLER (an obvious solution to an acute, costly
pain — people will buy) or a VITAMIN (a nice-to-have the status quo handles fine). A "Vitamin" verdict
means Demand Strength cannot band above C- no matter how big the market (the system clamps its mapped score to 50),
and usually means a harder, education-heavy sale.

SECOND, write the "pre_mortem" BEFORE scoring any criterion: it is 18 months later and this business is
dead — 3-5 bullets, each ONE sentence naming a specific, likely cause of death for THIS idea (not generic
startup risks) and the criterion it maps to. Your bands must be consistent with this pre-mortem.

DEMAND IS THE #1 SIGNAL — lead with it. This report is less "pass/fail" and more "here is what the founder
can realistically EXPECT, then how to improve it." Assess, in order: (1) how badly target customers want
this (from real demand signals), (2) what they would realistically pay, (3) given competitors + switching
costs + the alpha, what SHARE this founder could capture. Synthesize into "demand": { willingness_to_pay,
obtainable_revenue (realistic ANNUAL DOLLARS this founder could capture — NOT the TAM), reasoning, and
"math": { reachable (how many customers this founder can realistically REACH — the touchable slice, not the
whole market), capture (the share/conversion of those they'd actually win, e.g. "~3%"), price (annual
revenue per customer) } — the three numbers must multiply to roughly the obtainable_revenue (the system
CHECKS this arithmetic and rewrites a headline that doesn't multiply) }. What matters is the absolute
obtainable dollars judged against the GOAL: a small slice of a huge market can beat a large slice of a tiny
one. Make the "summary" lead with what the founder can realistically expect (the obtainable revenue vs
their goal), then the crux of the assessment.

Band these 10 criteria (rationale first, then band — HIGHER ALWAYS MEANS MORE FAVORABLE, no inverted axes).
Let the bands TRACK THE EVIDENCE and differ — well-evidenced criteria belong at B+/A-, genuinely unproven
ones at C or below; resist huddling everything in one band, but don't invent a weakness the evidence
doesn't show. Score each GOAL-NEUTRALLY — the system applies the goal's weights and verdict bands in code.
Output ALL 10 — never fewer, never renamed, never merged (the radar maps these exact names). Use EXACTLY
these names and groups:
- group "demand" (will people buy?):
  - Demand Strength — how badly the target customer wants this, from real behavioral signals (money spent, workarounds built, complaints with effort behind them — compliments and survey enthusiasm count for ~nothing)
  - Willingness to Pay — PRICING POWER NET OF REALISTIC ACQUISITION COST: how readily they will pay and how much (anchored to real incumbent pricing or WTP-flagged evidence), judged against what winning one customer realistically costs — a $5/mo consumer product that depends on paid acquisition bands LOW even if many people would pay
  - Problem-Solution Fit — SOLUTION-SHAPE evidence: proof this solution MECHANISM demonstrably delivers the outcome (competitor adoption of the same mechanism, reviews praising the outcome, the founder's own pilot results). A novel, unproven mechanism caps at C-/C — being plausible is not evidence.
  - Retention & Recurrence — how often the problem RECURS and whether value COMPOUNDS with use: a daily/weekly workflow whose value grows with accumulated data/habit bands high; an episodic or once-ever need (wedding planning, a one-time migration) bands C or BELOW even when demand for that single episode is intense — band the best-case usage pattern honestly
  - Market Timing — the verified "Why Now": NAME the specific enabling change (tech cost curve, platform shift, regulation, behavior change) and CITE a retrieved source for it in the explanation. "Nobody thought of it before" bands LOW; without a verifiable trend/momentum the system clamps this criterion.
  - Competitive Position — MARKET-STRUCTURE OPENNESS ONLY: incumbent customer satisfaction, switching costs, fragmentation, underserved segments — how enterable this market is for ANY good new entrant, INDEPENDENT of this founder's edge
- group "build" (can you win, deliver, and keep it?):
  - Differentiation / Moat — the founder's SPECIFIC edge, classified into one of the 7 Powers (scale economies, network effects, counter-positioning, switching costs, brand, cornered resource, process power) via the benefit+barrier test. Name the power in the explanation. Unclassifiable claims ("first-mover", "better UX", "our AI") band D or F; at idea stage only counter-positioning or a cornered resource can band A.
  - Acquisition Ease — the market's CHANNEL STRUCTURE only: is the category understood, does a budget line exist, how long is the sales cycle, how saturated are the channels, and is the price point in a dead zone (too cheap for sales, too dear for self-serve)? The founder's warm channels do NOT count here — they belong in Founder Fit.
  - Founder Fit — how well THIS founder is set up to win: skills, domain insight, capital, and distribution access (warm intros, an owned audience). An insider who lived the pain bands higher; no relevant skills/channel/capital bands low.
  - Goal Fit — how well the required effort, time, and capital fit the founder's stated goal (the ONLY criterion where the goal enters)
For each: set "category" to one of DEMAND, REVENUE, MARKET, DEFENSIBILITY, EXECUTION, GTM, FIT; write a
2-3 sentence "explanation" citing a specific named competitor, number, or source (no generic phrasing),
comparing against the calibration anchors where relevant — and only then the "band".

Each criterion also carries a LEVER — which force could actually MOVE its score — and a "lever_action":
- "positioning": ${LEVER_MEANING.positioning} (a narrower segment, a different wedge)
- "evidence": ${LEVER_MEANING.evidence} — no rewording or re-scoping can, only a test, a pilot, or observed behavior
- "execution": ${LEVER_MEANING.execution} (skills, hires, channels the founder controls)
- "exogenous": ${LEVER_MEANING.exogenous}
"lever_action" is ONE concrete line: what would actually move THIS criterion (for "evidence" levers, the
exact observation to collect; for "exogenous", what to watch for). Tag honestly — an "evidence" criterion
mislabeled "positioning" sends the founder rewording instead of testing.

${COMPETITION_GUIDANCE}

Also produce:
- "confidence" (0-100) = how much corroborating evidence you actually found (lower it when you relied on assumption). The system RECOMPUTES confidence from the fetched corpus + citation counts (your self-report only nudges it), and COMPUTES the overall score and verdict from your 10 bands via published weights and non-compensatory gates — so put your effort into banding the 10 criteria honestly and distinctly, NOT into tuning headline numbers. Add a TIGHT evidence-based "summary" — AT MOST 2 sentences (~45 words) — that leads with what the founder can realistically expect (obtainable revenue vs goal), then the crux.
- "pre_mortem": the 3-5 failure-cause bullets described above (each ONE sentence, specific to THIS idea, naming the criterion it maps to).
- "next_test": the KILL-TEST — the deliverable is a decision plus the cheapest way to change it, and this block is that way (it renders above the score). { riskiest_assumption (the ONE load-bearing belief the EVIDENCE CORPUS does NOT already prove — never something the corpus settles — naming the criteria it underpins, e.g. "brokers will pay for this, not just complain — underpins Willingness to Pay and Demand Strength"), cheapest_test (a concrete test runnable in ≤1 WEEK for ≤$100 that MUST name its channel from the corpus's own communities${
      ctx.corpusCommunities?.filter(Boolean).length
        ? ` — this corpus came from: ${ctx.corpusCommunities.filter(Boolean).join(", ")}`
        : " named in the EVIDENCE section"
    } — e.g. "post the one-line pitch in r/freightbrokers; DM the 8 corpus authors who complained"), pass_threshold (a PRE-REGISTERED numeric/observable bar meaning the assumption held, e.g. "≥3 of 10 DMed brokers book a call"), kill_threshold (the pre-registered bar meaning kill or pivot, e.g. "0 replies from 20 DMs"), would_flip: { to_go (the specific evidence that would flip this assessment UP a verdict), to_no_go (the specific evidence that would flip it DOWN) }, pivotal_criterion (if this assessment is borderline — could plausibly land MAYBE — the ONE criterion whose resolution would exit the band; otherwise "") }.
- "go_signals": positive_signals (why it has momentum) and key_strengths; "stop_signals": critical_risks and areas_of_concern. Each item is { text, category } where category is ONE of MARKET, DEMAND, DEFENSIBILITY, REVENUE, EXECUTION, TECH and "text" references something specific to THIS idea (a named competitor, a real number, or a cited signal) — no statement that could apply to any startup. Keep each "text" to ONE sentence, ~20 words max.
- "risk_matrix": 4-6 risks, each with category (tech/market/financial), probability (1-5), impact (1-5), and mitigation — consistent with the pre_mortem.
- "clarifying_questions": 2-4 pointed questions whose answers would most change this assessment (e.g. exact target segment, what truly distinguishes this from the named competitors, pricing/distribution). If FOUNDER CONTEXT above already answered earlier questions, ask new ones (or fewer) — don't repeat answered ones.
- "narrative": { who, pain, status_quo, cost_of_inaction, solution, after, verdict ("Painkiller"|"Vitamin"), why (ONE sentence for the verdict) }. Each field is ONE short sentence (~15 words), concrete to THIS idea — no padding, no second sentence.
- "demand": { willingness_to_pay (a SHORT $ figure ONLY, e.g. "$200–600/team/mo" — no timeframe words, no prose), obtainable_revenue (a SHORT $/yr figure ONLY, e.g. "$120K–360K/yr" — realistic annual dollars THIS founder could capture given competition + goal, NOT the TAM; do NOT append a timeframe like "by Year 2" or ANY prose), reasoning (2-3 sentences max: the pricing basis and the demand × capturable-share math), math { reachable, capture, price } (the three SHORT figures behind obtainable_revenue, as specified above — they must multiply to the headline), sensitivity { conservative, base, optimistic } (each a SHORT annual-$ figure — the downside, the headline, and the upside, so the founder sees the range not just a point) }.
- "goal_fit_note": 1-2 sentences stating the EFFORT/CAPITAL/TIME this idea needs vs the founder's stated goal — call out a mismatch plainly (e.g. "needs a full-time team + ~$300K; that contradicts a nights-and-weekends side hustle"). If the goal is "unsure", give the lifestyle-vs-venture split explicitly. This note and the Goal Fit criterion are the ONLY places a goal mismatch appears.
- "operating": { effort_level (Low/Medium/High), description (2–3 sentences on what the founder would actually spend time DOING — e.g. "mostly async remote support" vs "high-touch outbound sales + in-person demos") }.
- "acquisition": { difficulty (Easy/Moderate/Hard), reasoning (2–3 sentences; weigh the category-education tax — an established category buyers understand is EASIER, creating a category is HARDER; competitors can make selling easier) }.
- "downside": { capital_at_risk (1–2 sentences, LEAD with the figure, e.g. "<$15K to MVP; main risk is foregone salary"), liability (1–2 sentences), if_it_fails (1–2 sentences) }.
- "possible_alphas": 2-4 concrete differentiators/angles this idea COULD pursue to improve its odds — each { alpha (short, specific — a niche to own, a positioning as the alternative to a dominant player, a workflow/data edge, an underserved segment), rationale (1-2 sentences on why it would raise the obtainable revenue / lower risk for the goal) }. These are TESTABLE directions distinct from the current positioning.
- "market": the deeper market & competition read — { sizing: { tam: {value (a figure, e.g. "$4.2B"), note (one line)}, sam: {value, note}, som: {value, note}, methodology (one line on how you derived them) }, cagr_pct (number, e.g. 18), search_trend { keyword (the core search term), direction ("Rising"|"Flat"|"Falling"), note (e.g. "+85% YoY interest, per Google Trends") }, momentum (one line on a recent funding/exit/shift in the category, if you found one — else ""), competitors: 2-4 of [{ name (a REAL, currently-operating company), note (what they do + how satisfied their customers are, from real signals), complaint_theme (the single biggest thing their customers complain about — from real reviews/threads), your_edge (your angle vs them) }], demand_signals: 3-5 of the strongest items from the EVIDENCE section — each { evidence_id (the corpus id, e.g. "E3"), quote (the relevant excerpt from THAT item, verbatim or trimmed — never paraphrased into something the person didn't say), tag ("PAIN POINT"|"FEATURE REQUEST"|"DISCUSSION") }. NO urls — the system attaches the real link from the corpus, and a signal citing an id not in the corpus is DROPPED. If the corpus has no relevant items, return an empty demand_signals array. Only include search_trend/momentum you actually found (Market Timing is clamped when both are empty); never fabricate a figure, a thread, or a URL. Keep all of this CONSISTENT with the bands and obtainable_revenue above.
- "financials": the money — { startup_cost (a figure to a usable MVP), unit_economics { cac, ltv, payback (each short) }, revenue_model (pricing + how money is made, one line), projections: 3 years of [{ year, revenue, customers, note }] where revenue ≈ customers × blended price each year and Year-1 is consistent with obtainable_revenue and the sales difficulty }.
- "plan": the path — { milestones: 3-5 of [{ title, when (e.g. "Month 1-2"), metric (how you know it's done) }] ordered earliest-first, team_and_ops (one line: who/what it takes to build and run) }.

Return JSON exactly matching (field order matters: pre_mortem before criteria; in each criterion, explanation before band):
{
  "confidence": number, "summary": string, "goal_fit_note": string,
  "pre_mortem": [string],
  "criteria": [{"name": string, "group": "demand"|"build", "category": string, "explanation": string, "lever": "positioning"|"evidence"|"execution"|"exogenous", "lever_action": string, "band": "A+"|"A"|"A-"|"B+"|"B"|"B-"|"C+"|"C"|"C-"|"D+"|"D"|"D-"|"F"}],
  "next_test": {"riskiest_assumption": string, "cheapest_test": string, "pass_threshold": string, "kill_threshold": string, "would_flip": {"to_go": string, "to_no_go": string}, "pivotal_criterion": string},
  "go_signals": {"positive_signals": [{"text": string, "category": string}], "key_strengths": [{"text": string, "category": string}]},
  "stop_signals": {"critical_risks": [{"text": string, "category": string}], "areas_of_concern": [{"text": string, "category": string}]},
  "risk_matrix": [{"title": string, "category": "tech"|"market"|"financial", "probability": number, "impact": number, "mitigation": string}],
  "clarifying_questions": [string],
  "narrative": {"who": string, "pain": string, "status_quo": string, "cost_of_inaction": string, "solution": string, "after": string, "verdict": "Painkiller"|"Vitamin", "why": string},
  "demand": {"willingness_to_pay": string, "obtainable_revenue": string, "reasoning": string, "math": {"reachable": string, "capture": string, "price": string}, "sensitivity": {"conservative": string, "base": string, "optimistic": string}},
  "operating": {"effort_level": "Low"|"Medium"|"High", "description": string},
  "downside": {"capital_at_risk": string, "liability": string, "if_it_fails": string},
  "acquisition": {"difficulty": "Easy"|"Moderate"|"Hard", "reasoning": string},
  "possible_alphas": [{"alpha": string, "rationale": string}],
  "market": {"sizing": {"tam": {"value": string, "note": string}, "sam": {"value": string, "note": string}, "som": {"value": string, "note": string}, "methodology": string}, "cagr_pct": number, "search_trend": {"keyword": string, "direction": "Rising"|"Flat"|"Falling", "note": string}, "momentum": string, "competitors": [{"name": string, "note": string, "complaint_theme": string, "your_edge": string}], "demand_signals": [{"evidence_id": string, "quote": string, "tag": string}]},
  "financials": {"startup_cost": string, "unit_economics": {"cac": string, "ltv": string, "payback": string}, "revenue_model": string, "projections": [{"year": string, "revenue": string, "customers": string, "note": string}]},
  "plan": {"milestones": [{"title": string, "when": string, "metric": string}], "team_and_ops": string}
}`,
};
