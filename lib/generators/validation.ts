import { z } from "zod";
import { Generator, founderContext, ideaHeader } from "./shared";

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
    "the 'verdict' (NO-GO<60, MAYBE 60-74, GO>=75).",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}${founderContext(ctx)}

Validate this idea. You MUST issue web searches before answering and base every figure (market size,
CAGR, competitor funding, pricing, thread/upvote counts) on a result you actually retrieved. Name the
source domain or publication inline in the relevant rationale/explanation/text (e.g. "(grandviewresearch.com, 2024)").
If search returns no figure, write "no reliable source found" and LOWER that criterion's score and the
overall confidence — do NOT invent a number, a competitor, or a Reddit thread. Name at least 2 real,
currently-operating competitors by name in the explanations.

Score these 9 criteria 0-100. Output ALL 9 — never fewer, never renamed, never merged (the radar maps
these exact names). Use EXACTLY these names and groups:
- group "demand": Target Market Clarity, Market Timing, Market Entry Barriers, Competition Level, Problem-Solution Fit
- group "build": MVP Viability, Value Proposition, Initial Feasibility, Resource Requirements
For each: set "category" to one of MARKET, DEMAND, EXECUTION, DEFENSIBILITY; write a 2-3 sentence
"explanation" that cites a specific named competitor, number, or source (no generic phrasing). REMEMBER
THE INVERTED SCALE: for "Competition Level" and "Market Entry Barriers", a HIGH score means LESS
competition / EASIER entry — a crowded market or high barriers must score LOW.

Also produce:
- An overall "score" (0-100) that is roughly the average of the 9 criteria (weight the demand group slightly higher); it must not exceed the highest single criterion by more than 10 points and must sit in the verdict's band. "confidence" (0-100) = how much corroborating web evidence you actually found (lower it when you relied on assumption). "verdict" must match the score band. Add a 2-3 sentence evidence-based "summary".
- "validations": problem, solution, and market validation each with a 0-100 score and an evidence-based rationale.
- "go_signals": positive_signals (why it has momentum) and key_strengths; "stop_signals": critical_risks and areas_of_concern. Each item is { text, category } where category is ONE of MARKET, DEMAND, DEFENSIBILITY, REVENUE, EXECUTION, TECH and "text" references something specific to THIS idea (a named competitor, a real number, or a cited signal) — no statement that could apply to any startup.
- "action_plan": 4-6 prioritized next steps ordered by impact x ease, each with type (VALIDATE/BUILD/DISTRIBUTE/DE-RISK), effort (Low/Medium/High), horizon (This week/This month/This quarter), a measurable success_metric, and a concrete first_step.
- "risk_matrix": 4-6 risks, each with category (tech/market/financial), probability (1-5), impact (1-5), and mitigation.
- "clarifying_questions": 2-4 pointed questions whose answers would most change this assessment (e.g. exact target segment, what truly distinguishes this from the named competitors, pricing/distribution). If FOUNDER CONTEXT above already answered earlier questions, ask new ones (or fewer) — don't repeat answered ones.

Return JSON exactly matching:
{
  "verdict": "GO"|"MAYBE"|"NO-GO", "score": number, "confidence": number, "summary": string,
  "criteria": [{"name": string, "score": number, "group": "demand"|"build", "category": string, "explanation": string}],
  "validations": {"problem": {"score": number, "rationale": string}, "solution": {"score": number, "rationale": string}, "market": {"score": number, "rationale": string}},
  "go_signals": {"positive_signals": [{"text": string, "category": string}], "key_strengths": [{"text": string, "category": string}]},
  "stop_signals": {"critical_risks": [{"text": string, "category": string}], "areas_of_concern": [{"text": string, "category": string}]},
  "action_plan": [{"title": string, "rationale": string, "type": "VALIDATE"|"BUILD"|"DISTRIBUTE"|"DE-RISK", "effort": "Low"|"Medium"|"High", "horizon": "This week"|"This month"|"This quarter", "success_metric": string, "first_step": string}],
  "risk_matrix": [{"title": string, "category": "tech"|"market"|"financial", "probability": number, "impact": number, "mitigation": string}],
  "clarifying_questions": [string]
}`,
};
