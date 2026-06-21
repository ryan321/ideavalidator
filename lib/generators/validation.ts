import { z } from "zod";
import { Generator, ideaHeader } from "./shared";

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
    .min(8),

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
});

export type Validation = z.infer<typeof ValidationSchema>;

export const validationGenerator: Generator<Validation> = {
  kind: "validation",
  label: "Validation",
  blurb: "Scored GO / NO-GO with radar, signals, scorecard, action plan & risk matrix.",
  role: "reasoning",
  grounded: true,
  schema: ValidationSchema,
  maxTokens: 9000,
  system:
    "You are a brutally honest startup analyst. Validate ideas against real market evidence from web " +
    "search, not hype. Score conservatively; most ideas should not score above 75. Cite concrete " +
    "demand signals, competitors, and comparable outcomes. Be specific and quantitative, never generic.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}

Validate this idea. Use live web search to ground every claim in real evidence (demand on
Reddit/forums/Product Hunt, competitors, search trends, pricing, market size).

Score these 9 criteria 0-100. Use EXACTLY these names and groups (for a radar chart):
- group "demand": Target Market Clarity, Market Timing, Market Entry Barriers, Competition Level, Problem-Solution Fit
- group "build": MVP Viability, Value Proposition, Initial Feasibility, Resource Requirements
For each, set "category" to a short tag like MARKET, DEMAND, EXECUTION, or DEFENSIBILITY.
(For "Competition Level" and "Market Entry Barriers", higher score = MORE favorable / less crowded.)

Also produce:
- An overall weighted "score" (0-100), "confidence" %, and "verdict" (GO/MAYBE/NO-GO) with a 2-3 sentence "summary".
- "validations": problem, solution, and market validation each with a 0-100 score and an evidence-based rationale.
- "go_signals": positive_signals (why it has momentum) and key_strengths; "stop_signals": critical_risks and areas_of_concern. Each item is { text, category }.
- "action_plan": 4-6 prioritized next steps ordered by impact x ease, each with type (VALIDATE/BUILD/DISTRIBUTE/DE-RISK), effort (Low/Medium/High), horizon (This week/This month/This quarter), a measurable success_metric, and a concrete first_step.
- "risk_matrix": 4-6 risks, each with category (tech/market/financial), probability (1-5), impact (1-5), and mitigation.

Return JSON exactly matching:
{
  "verdict": "GO"|"MAYBE"|"NO-GO", "score": number, "confidence": number, "summary": string,
  "criteria": [{"name": string, "score": number, "group": "demand"|"build", "category": string, "explanation": string}],
  "validations": {"problem": {"score": number, "rationale": string}, "solution": {"score": number, "rationale": string}, "market": {"score": number, "rationale": string}},
  "go_signals": {"positive_signals": [{"text": string, "category": string}], "key_strengths": [{"text": string, "category": string}]},
  "stop_signals": {"critical_risks": [{"text": string, "category": string}], "areas_of_concern": [{"text": string, "category": string}]},
  "action_plan": [{"title": string, "rationale": string, "type": "VALIDATE"|"BUILD"|"DISTRIBUTE"|"DE-RISK", "effort": "Low"|"Medium"|"High", "horizon": "This week"|"This month"|"This quarter", "success_metric": string, "first_step": string}],
  "risk_matrix": [{"title": string, "category": "tech"|"market"|"financial", "probability": number, "impact": number, "mitigation": string}]
}`,
};
