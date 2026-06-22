import { z } from "zod";
import {
  COMPETITION_GUIDANCE,
  Generator,
  founderContext,
  goalContext,
  ideaHeader,
} from "./shared";

const Signal = z.object({
  text: z.string(),
  category: z.string(), // MARKET | DEMAND | DEFENSIBILITY | REVENUE | EXECUTION | TECH ...
});

export const ValidationSchema = z.object({
  verdict: z.enum(["GO", "MAYBE", "NO-GO"]),
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  summary: z.string(),

  // Radar + Demand/Build factor bars + detailed explanations all read from this.
  criteria: z
    .array(
      z.object({
        name: z.string(),
        score: z.number().min(0).max(100),
        group: z.enum(["demand", "build"]),
        category: z.string(), // MARKET | EXECUTION | DEMAND ...
        explanation: z.string(),
      })
    )
    .length(9), // exactly the 9 named criteria the radar expects

  // Evidence-base scorecard.
  validations: z.object({
    problem: z.object({ score: z.number().min(0).max(100), rationale: z.string() }),
    solution: z.object({ score: z.number().min(0).max(100), rationale: z.string() }),
    market: z.object({ score: z.number().min(0).max(100), rationale: z.string() }),
  }),

  go_signals: z.object({
    positive_signals: z.array(Signal).min(1),
    key_strengths: z.array(Signal).min(1),
  }),
  stop_signals: z.object({
    critical_risks: z.array(Signal).min(1),
    areas_of_concern: z.array(Signal).min(1),
  }),

  action_plan: z
    .array(
      z.object({
        title: z.string(),
        rationale: z.string(),
        type: z.enum(["VALIDATE", "BUILD", "DISTRIBUTE", "DE-RISK"]),
        effort: z.enum(["Low", "Medium", "High"]),
        horizon: z.enum(["This week", "This month", "This quarter"]),
        success_metric: z.string(),
        first_step: z.string(),
      })
    )
    .min(3),

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

  // The headline: demand → willingness to pay → realistically obtainable revenue (vs the goal).
  demand: z
    .object({
      strength: z.enum(["Weak", "Moderate", "Strong"]),
      willingness_to_pay: z.string(), // what target customers would realistically pay
      obtainable_revenue: z.string(), // realistic annual $ THIS founder could capture
      reasoning: z.string(), // demand x WTP x capturable share, judged against the goal
    })
    .optional(),

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
});

export type Validation = z.infer<typeof ValidationSchema>;

export const validationGenerator: Generator<Validation> = {
  kind: "validation",
  label: "Validation",
  blurb: "Scored GO / NO-GO with radar, signals, scorecard, action plan & risk matrix.",
  role: "scoring",
  grounded: true,
  schema: ValidationSchema,
  maxTokens: 9000,
  system:
    "You are a brutally honest startup analyst. Validate ideas against real market evidence from web " +
    "search, not hype. Be specific and quantitative, never generic.\n" +
    "Score conservatively against this rubric and default to the LOWER end when evidence is thin: " +
    "0-39 = NO-GO (no validated demand or a fatal flaw), 40-59 = weak/unproven, 60-74 = MAYBE (real but " +
    "unproven signal), 75-89 = GO (multiple independent demand signals + a viable path), 90-100 = " +
    "exceptional (reserve for proven paying demand). Most ideas land 45-70. Penalize, do not reward, any " +
    "criterion where you found no concrete evidence. The overall 'score' MUST fall in the band matching " +
    "the 'verdict' (NO-GO<60, MAYBE 60-74, GO>=75). Judge the idea RELATIVE TO the founder's stated goal " +
    "when one is given — the same idea can be a GO for a lifestyle business and a NO-GO for venture scale.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}${goalContext(ctx)}${founderContext(ctx)}

Validate this idea. You MUST issue web searches before answering and base every figure (market size,
CAGR, competitor funding, pricing, thread/upvote counts) on a result you actually retrieved. Name the
source domain or publication inline in the relevant rationale/explanation/text (e.g. "(grandviewresearch.com, 2024)").
If search returns no figure, write "no reliable source found" and LOWER that criterion's score and the
overall confidence — do NOT invent a number, a competitor, or a Reddit thread. Name at least 2 real,
currently-operating competitors by name in the explanations.

DEMAND IS THE #1 SIGNAL — lead with it. This report is less "pass/fail" and more "here is what the founder
can realistically EXPECT, then how to improve it." Assess, in order: (1) how badly target customers want
this (from real demand signals), (2) what they would realistically pay, (3) given competitors + switching
costs + the alpha, what SHARE this founder could capture. Synthesize into "demand": { strength
(Weak/Moderate/Strong), willingness_to_pay, obtainable_revenue (realistic ANNUAL DOLLARS this founder could
capture — NOT the TAM), reasoning }. What matters is the absolute obtainable dollars judged against the GOAL:
a small slice of a huge market can beat a large slice of a tiny one. Make the "summary" lead with what the
founder can realistically expect (the obtainable revenue vs their goal), then the verdict.

Score these 9 criteria 0-100, where HIGHER ALWAYS MEANS MORE FAVORABLE (no inverted axes). Output ALL 9 —
never fewer, never renamed, never merged (the radar maps these exact names). Use EXACTLY these names and groups:
- group "demand" (will people buy?):
  - Demand Strength — how badly the target customer wants this, from real signals
  - Willingness to Pay — how readily they will pay, and how much
  - Problem-Solution Fit — how well this actually solves their problem
  - Market Timing — whether now is the right moment
  - Competitive Position — how favorable your position is given competitors, their customer satisfaction, switching costs, and your alpha (crowded with NO edge = LOW; a clear wedge or disaffected incumbent customers = HIGH)
- group "build" (can you win, deliver, and keep it?):
  - Differentiation / Moat — strength and defensibility of your alpha
  - Acquisition Ease — how easy it is to actually WIN customers (an established category buyers already understand = HIGH; needing to educate / create a category = LOW)
  - Feasibility — how realistically THIS founder can build and run it
  - Goal Fit — how well the required effort, time, and capital fit the founder's goal
For each: set "category" to one of DEMAND, REVENUE, MARKET, DEFENSIBILITY, EXECUTION, GTM, FIT; write a
2-3 sentence "explanation" citing a specific named competitor, number, or source (no generic phrasing).

${COMPETITION_GUIDANCE}

Also produce:
- An overall "score" (0-100) that is roughly the average of the 9 criteria (weight the demand group slightly higher); it must not exceed the highest single criterion by more than 10 points and must sit in the verdict's band. "confidence" (0-100) = how much corroborating web evidence you actually found (lower it when you relied on assumption). "verdict" must match the score band. Add a 2-3 sentence evidence-based "summary".
- "validations": problem, solution, and market validation each with a 0-100 score and an evidence-based rationale.
- "go_signals": positive_signals (why it has momentum) and key_strengths; "stop_signals": critical_risks and areas_of_concern. Each item is { text, category } where category is ONE of MARKET, DEMAND, DEFENSIBILITY, REVENUE, EXECUTION, TECH and "text" references something specific to THIS idea (a named competitor, a real number, or a cited signal) — no statement that could apply to any startup.
- "action_plan": 4-6 prioritized next steps ordered by impact x ease, each with type (VALIDATE/BUILD/DISTRIBUTE/DE-RISK), effort (Low/Medium/High), horizon (This week/This month/This quarter), a measurable success_metric, and a concrete first_step.
- "risk_matrix": 4-6 risks, each with category (tech/market/financial), probability (1-5), impact (1-5), and mitigation.
- "clarifying_questions": 2-4 pointed questions whose answers would most change this assessment (e.g. exact target segment, what truly distinguishes this from the named competitors, pricing/distribution). If FOUNDER CONTEXT above already answered earlier questions, ask new ones (or fewer) — don't repeat answered ones.
- "demand": { strength (Weak/Moderate/Strong), willingness_to_pay (a SHORT figure ONLY, e.g. "$200–600/team/mo" — NO prose), obtainable_revenue (a SHORT headline figure ONLY, e.g. "$120K–360K/yr" — realistic annual dollars THIS founder could capture given competition + goal, NOT the TAM, NO prose), reasoning (2–4 sentences: the pricing basis and the demand × capturable-share math) }.
- "operating": { effort_level (Low/Medium/High), description (2–3 sentences on what the founder would actually spend time DOING — e.g. "mostly async remote support" vs "high-touch outbound sales + in-person demos") }.
- "acquisition": { difficulty (Easy/Moderate/Hard), reasoning (2–3 sentences; weigh the category-education tax — an established category buyers understand is EASIER, creating a category is HARDER; competitors can make selling easier) }.
- "downside": { capital_at_risk (1–2 sentences, LEAD with the figure, e.g. "<$15K to MVP; main risk is foregone salary"), liability (1–2 sentences), if_it_fails (1–2 sentences) }.
- "possible_alphas": 2-4 concrete differentiators/angles this idea COULD pursue to improve its odds — each { alpha (short, specific — a niche to own, a positioning as the alternative to a dominant player, a workflow/data edge, an underserved segment), rationale (1-2 sentences on why it would raise the obtainable revenue / lower risk for the goal) }. These are TESTABLE directions distinct from the current positioning.

Return JSON exactly matching:
{
  "verdict": "GO"|"MAYBE"|"NO-GO", "score": number, "confidence": number, "summary": string,
  "criteria": [{"name": string, "score": number, "group": "demand"|"build", "category": string, "explanation": string}],
  "validations": {"problem": {"score": number, "rationale": string}, "solution": {"score": number, "rationale": string}, "market": {"score": number, "rationale": string}},
  "go_signals": {"positive_signals": [{"text": string, "category": string}], "key_strengths": [{"text": string, "category": string}]},
  "stop_signals": {"critical_risks": [{"text": string, "category": string}], "areas_of_concern": [{"text": string, "category": string}]},
  "action_plan": [{"title": string, "rationale": string, "type": "VALIDATE"|"BUILD"|"DISTRIBUTE"|"DE-RISK", "effort": "Low"|"Medium"|"High", "horizon": "This week"|"This month"|"This quarter", "success_metric": string, "first_step": string}],
  "risk_matrix": [{"title": string, "category": "tech"|"market"|"financial", "probability": number, "impact": number, "mitigation": string}],
  "clarifying_questions": [string],
  "demand": {"strength": "Weak"|"Moderate"|"Strong", "willingness_to_pay": string, "obtainable_revenue": string, "reasoning": string},
  "operating": {"effort_level": "Low"|"Medium"|"High", "description": string},
  "downside": {"capital_at_risk": string, "liability": string, "if_it_fails": string},
  "acquisition": {"difficulty": "Easy"|"Moderate"|"Hard", "reasoning": string},
  "possible_alphas": [{"alpha": string, "rationale": string}]
}`,
};
