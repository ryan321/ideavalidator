import { z } from "zod";
import { Generator, ideaHeader, priorContext } from "./shared";

export const FinancialsSchema = z.object({
  summary: z.string(),
  startup_cost: z.string(), // "$150k - $250k"
  break_even: z.string(), // "18-24 months"
  unit_economics: z.object({
    cac: z.string(),
    ltv: z.string(),
    ltv_cac_ratio: z.string(), // "12:1"
    payback_period: z.string(),
  }),
  revenue_model: z.object({
    type: z.string(), // "tiered + value-based pricing"
    description: z.string(),
    streams: z
      .array(
        z.object({
          name: z.string(),
          type: z.enum(["Subscription", "Services", "Usage", "One-time"]),
          segment: z.string(),
          price: z.string(),
          revenue_share: z.number().min(0).max(100), // percent
          why: z.string(),
          first_step: z.string(),
        })
      )
      .min(2),
  }),
  projections: z
    .array(
      z.object({
        year: z.string(),
        revenue: z.string(),
        customers: z.string(),
        note: z.string(),
      })
    )
    .min(3),
});

export type Financials = z.infer<typeof FinancialsSchema>;

export const financialsGenerator: Generator<Financials> = {
  kind: "financials",
  label: "Financials",
  blurb: "Revenue model, CAC/LTV unit economics, startup costs & break-even.",
  role: "reasoning",
  grounded: false,
  uses: ["validation", "market"],
  schema: FinancialsSchema,
  maxTokens: 5000,
  system:
    "You are a startup CFO. Build realistic financials grounded in the market context provided. Use " +
    "concrete numbers with units. Revenue shares across streams should sum to ~100%. Benchmark CAC/LTV " +
    "against typical norms for this category.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}${priorContext(ctx, ["validation", "market"])}

Produce financials & unit economics. Return JSON:
{
  "summary": string,
  "startup_cost": string, "break_even": string,
  "unit_economics": {"cac": string, "ltv": string, "ltv_cac_ratio": string, "payback_period": string},
  "revenue_model": {
    "type": string, "description": string,
    "streams": [{"name": string, "type": "Subscription"|"Services"|"Usage"|"One-time", "segment": string, "price": string, "revenue_share": number, "why": string, "first_step": string}]
  },
  "projections": [{"year": string, "revenue": string, "customers": string, "note": string}]
}`,
};
