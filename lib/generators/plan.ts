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
  role: "reasoning",
  grounded: false,
  uses: ["validation", "market"],
  schema: PlanSchema,
  maxTokens: 5000,
  system:
    "You are a startup advisor writing a concise, investor-ready business plan. Be concrete and " +
    "realistic; ground financials in the market context provided. Each section is 1-2 tight paragraphs.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}${priorContext(ctx, ["validation", "market"])}

Write an 8-section investor-ready business plan. Return JSON:
{
  "executive_summary": string, "problem": string, "solution": string,
  "business_model": string, "go_to_market": string,
  "financials": {"summary": string, "year1_revenue": string, "assumptions": [string]},
  "team_and_ops": string, "risks_and_mitigations": string,
  "milestones": [{"when": string, "goal": string}]
}`,
};
