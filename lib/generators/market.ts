import { z } from "zod";
import { Generator, ideaHeader, priorContext } from "./shared";

export const MarketSchema = z.object({
  summary: z.string(),
  tam: z.object({ value: z.string(), basis: z.string() }),
  sam: z.object({ value: z.string(), basis: z.string() }),
  som: z.object({ value: z.string(), basis: z.string() }),
  growth_rate: z.string(),
  trends: z.array(z.string()).min(1),
  icp: z
    .array(
      z.object({
        segment: z.string(),
        description: z.string(),
        pains: z.array(z.string()),
      })
    )
    .min(1),
  competitors: z
    .array(
      z.object({
        name: z.string(),
        positioning: z.string(),
        strengths: z.array(z.string()),
        weaknesses: z.array(z.string()),
        pricing: z.string(),
      })
    )
    .min(1),
  pricing_recommendation: z.string(),
});

export type Market = z.infer<typeof MarketSchema>;

export const marketGenerator: Generator<Market> = {
  kind: "market",
  label: "Market Analysis",
  blurb: "TAM/SAM/SOM, trends, ICPs, and a competitor SWOT table.",
  role: "research",
  grounded: true,
  uses: ["validation"],
  schema: MarketSchema,
  maxTokens: 5000,
  system:
    "You are a market analyst. Use live web search for real figures and cite your reasoning in each " +
    "'basis' field. Give numbers with units (e.g. '$4.2B'). Never invent precise figures you can't " +
    "support — state the estimation method in the basis.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}${priorContext(ctx, ["validation"])}

Produce a market analysis grounded in live web data:
- TAM / SAM / SOM, each with a value and the basis (how you derived it).
- Market growth rate, key trends.
- 2-4 ideal customer profiles (segment, description, pains).
- 3-6 real named competitors with positioning, strengths, weaknesses, and pricing.
- A pricing recommendation for this idea.

Return JSON:
{
  "summary": string,
  "tam": {"value": string, "basis": string},
  "sam": {"value": string, "basis": string},
  "som": {"value": string, "basis": string},
  "growth_rate": string, "trends": [string],
  "icp": [{"segment": string, "description": string, "pains": [string]}],
  "competitors": [{"name": string, "positioning": string, "strengths": [string], "weaknesses": [string], "pricing": string}],
  "pricing_recommendation": string
}`,
};
