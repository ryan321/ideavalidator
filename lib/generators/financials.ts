import { z } from "zod";
import { Generator, goalContext, ideaHeader, priorContext } from "./shared";

export const FinancialsSchema = z.object({
  summary: z.string(),
  startup_cost: z.string(), // "$150k - $250k"
  break_even: z.string(), // "18-24 months"
  unit_economics: z.object({
    cac: z.string(),
    ltv: z.string(),
    ltv_cac_ratio: z.string(), // "3.5:1"
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
      .min(2)
      .refine(
        (s) => Math.abs(s.reduce((a, x) => a + x.revenue_share, 0) - 100) <= 2,
        "revenue_share across streams must sum to ~100"
      ),
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
  role: "writing",
  grounded: false,
  uses: ["validation", "market"],
  schema: FinancialsSchema,
  maxTokens: 5000,
  system:
    "You are a startup CFO. Build realistic, conservative financials grounded in the market context. Use " +
    "concrete numbers with units. Be conservative, not promotional: a healthy LTV:CAC is ~3:1 to 5:1 — flag " +
    "anything above 5:1 as likely under-invested in growth. Ground CAC, LTV and payback in published " +
    "benchmarks for this exact category and name the benchmark basis in the summary.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}${priorContext(ctx, ["validation", "market"])}${goalContext(ctx)}

Produce financials & unit economics SIZED TO THE FOUNDER'S GOAL. Anchor the model to the validation's
demand.obtainable_revenue (the realistic annual revenue this founder could capture) — your projections
should converge toward that figure, NOT a top-down share of TAM. Keep scale, team, and burn appropriate
to the goal (a lifestyle business stays solo/lean and bootstrapped; a venture-scale plan can assume hiring
and raised capital). Stream prices must be consistent with market.pricing_recommendation; CAC/payback must
fit the persona and segments named in the market analysis. If a figure is missing, say so in the note
rather than inventing one.
Constraints: revenue_share values are percentages of total revenue and MUST sum to 100 across all streams
(e.g. 70 + 20 + 10); provide at least 2 streams. Projections must be EXACTLY 3 rows (Year 1, Year 2,
Year 3) and internally consistent: each year's revenue should ≈ customers × the blended annual revenue
per customer implied by your stream prices — state that assumption in the note (e.g. "4,000 × ~$1,200 ARPU").
Return JSON:
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
