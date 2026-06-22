import { z } from "zod";
import { Generator, ideaHeader, priorContext } from "./shared";

export const PlanSchema = z.object({
  executive_summary: z.string(),
  problem: z.string(),
  solution: z.string(),
  business_model: z.string(),
  go_to_market: z.string(),
  financials: z.object({
    summary: z.string(),
    year1_revenue: z.string(),
    assumptions: z.array(z.string()),
  }),
  team_and_ops: z.string(),
  risks_and_mitigations: z.string(),
  milestones: z.array(z.object({ when: z.string(), goal: z.string() })).min(1),
});

export type Plan = z.infer<typeof PlanSchema>;

export const planGenerator: Generator<Plan> = {
  kind: "plan",
  label: "Business Plan",
  blurb: "Investor-ready 8-section plan with financials and milestones.",
  role: "writing",
  grounded: false,
  uses: ["validation", "market", "financials"],
  schema: PlanSchema,
  maxTokens: 5000,
  system:
    "You are a startup advisor writing a concise, investor-ready business plan. Each section is 1-2 tight " +
    "paragraphs and must be specific to THIS idea — name the actual customer segment, channel, competitor, " +
    "or number, never generic placeholders. Banned vague phrases (unless quantified): 'large and growing " +
    "market', 'strong team', 'cutting-edge', 'leverage synergies', 'first-mover advantage', 'go-to-market " +
    "via content and partnerships'. Keep financials conservative and bottom-up: year1_revenue must be " +
    "reachable from market.sizing.som and a defensible year-one customer count, not a top-down share of TAM.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}${priorContext(ctx, ["validation", "market", "financials"])}

Write an investor-ready business plan that is CONSISTENT with the validation, market, and financials
artifacts above — reuse their specifics by name: cite at least two competitors from market.competitors in
go_to_market and explain your wedge against them; size the opportunity using market.sizing (TAM/SAM/SOM)
in business_model; target market.persona in problem/solution; base risks_and_mitigations on the top
validation.risk_matrix and stop_signals; and keep financials consistent with the financials artifact.
Do not introduce facts that contradict those artifacts. Return JSON:
{
  "executive_summary": string, "problem": string, "solution": string,
  "business_model": string, "go_to_market": string,
  "financials": {"summary": string, "year1_revenue": string (a dollar figure with units, e.g. "$220k", consistent with market sizing), "assumptions": [string] (3-4 explicit numeric drivers: price point, conversion %, customer count)},
  "team_and_ops": string, "risks_and_mitigations": string,
  "milestones": [{"when": string (a quarter/month, e.g. "Q3 2026"), "goal": string}]  // 4-6 dated, measurable milestones
}`,
};
