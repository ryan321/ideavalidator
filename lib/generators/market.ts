import { z } from "zod";
import { Generator, ideaHeader, priorContext } from "./shared";

export const MarketSchema = z.object({
  summary: z.string(),
  cagr_label: z.string(), // e.g. "18% CAGR (2025-2033)"
  cagr_pct: z.number(), // e.g. 18  — drives the trajectory chart
  maturity: z.enum(["Emerging", "Growing", "Mature", "Declining"]),
  maturity_rationale: z.string(),

  sizing: z.object({
    tam: z.object({ value: z.string(), note: z.string() }),
    sam: z.object({ value: z.string(), note: z.string() }),
    som: z.object({ value: z.string(), note: z.string() }),
    methodology: z.string(),
  }),

  trajectory: z.object({
    base_year: z.number(), // e.g. 2023
    end_year: z.number(), // e.g. 2031
  }),

  seasonality: z.object({
    level: z.enum(["Low", "Medium", "High"]),
    peak_months: z.array(z.string()), // ["Oct","Nov","Dec"]
    note: z.string(),
  }),

  regions: z
    .array(
      z.object({
        name: z.string(),
        tier: z.enum(["primary", "secondary"]),
        note: z.string(),
      })
    )
    .min(1),

  demand_signals: z.object({
    reddit: z.object({
      threads_found: z.number(),
      sentiment: z.string(),
      pain_intensity: z.enum(["Low", "Medium", "High"]),
      demand_score: z.number().min(0).max(100),
      threads: z
        .array(
          z.object({
            subreddit: z.string(),
            title: z.string(),
            body: z.string(),
            tag: z.string(), // PAIN POINT | FEATURE REQUEST | DISCUSSION
            sentiment: z.string(),
          })
        )
        .min(1),
    }),
    search_trends: z.object({
      keyword: z.string(),
      interest_score: z.number().min(0).max(100),
      direction: z.enum(["Rising", "Flat", "Falling"]),
      momentum: z.string(),
      rising_searches: z
        .array(z.object({ term: z.string(), change: z.string() }))
        .min(1),
    }),
  }),

  competitors: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        funding: z.string(), // Bootstrapped | Seed | Series A ...
        strengths: z.array(z.string()).min(1),
        weaknesses: z.array(z.string()).min(1),
        opportunity: z.string(),
      })
    )
    .min(2),

  persona: z.object({
    title: z.string(),
    roles: z.array(z.string()),
    region: z.string(),
    pains: z.array(z.string()).min(1),
    current_solutions: z.array(z.string()).min(1),
    jobs_to_be_done: z.array(z.string()).min(1),
  }),

  discovery: z.object({
    interview_questions: z.array(z.string()).min(3),
    experiments: z
      .array(
        z.object({
          name: z.string(),
          timeline: z.string(),
          budget: z.string(),
          metric: z.string(),
        })
      )
      .min(1),
  }),

  pricing_recommendation: z.string(),
});

export type Market = z.infer<typeof MarketSchema>;

export const marketGenerator: Generator<Market> = {
  kind: "market",
  label: "Market & Competition",
  blurb: "Sizing, trajectory, live demand signals, competitor teardowns & persona.",
  role: "research",
  grounded: true,
  uses: ["validation"],
  schema: MarketSchema,
  maxTokens: 9000,
  system:
    "You are a market analyst. You MUST web-search before answering and base every figure on a result " +
    "you actually retrieved; give numbers with units (e.g. '$1.85B in 2024') and name the source + year " +
    "in the note. Never present an unsourced number as fact — if you cannot find a figure, say 'estimated' " +
    "and show the arithmetic. For demand_signals, report only real signals you found: paraphrase real " +
    "pain patterns (never fabricate a verbatim post or claim a specific post exists), and shrink the array " +
    "rather than inventing entries.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}${priorContext(ctx, ["validation"])}

Produce a market & competition analysis grounded in live web data. Include:
- "summary"; "cagr_label" (e.g. "18% CAGR (2025-2033)"); "cagr_pct" (just the number, e.g. 18). The year
  range inside cagr_label MUST equal trajectory.base_year-end_year, and cagr_pct MUST equal the number in cagr_label.
  "maturity" (Emerging/Growing/Mature/Declining) + "maturity_rationale".
- "sizing": tam/sam/som each {value, note}. In each note, name the source + year of the figure (e.g.
  "Grand View Research, 2024") or, if no published figure exists, say "estimated" and show the math.
  Plus a "methodology" sentence (the % or filters used to derive SAM/SOM from TAM).
- "trajectory": {base_year, end_year} (a ~8-year window; the chart compounds cagr_pct from base_year).
- "seasonality": {level, peak_months (3-letter month names), note}.
- "regions": 1-3 {name, tier(primary/secondary), note}.
- "demand_signals":
  - reddit: {threads_found (an ESTIMATE, not an exact count), sentiment, pain_intensity(Low/Medium/High), demand_score(0-100, set from the actual volume/intensity of evidence — not a default high number),
    threads: 2-4 {subreddit (a real subreddit you verified exists), title, body (a representative PARAPHRASE — "Users in this sub repeatedly describe…", never a copied/invented verbatim post), tag(PAIN POINT/FEATURE REQUEST/DISCUSSION), sentiment}}
  - search_trends: {keyword, interest_score(0-100; reserve 80+ for clear broad/sustained interest), direction(Rising/Flat/Falling), momentum,
    rising_searches: 2-4 {term, change as a relative/approximate figure (e.g. "~+180% YoY"), omitting any you can't source}}
- "competitors": 3-5 real, currently-operating, named companies (verify each exists; do not invent) {name, url (the real homepage domain you found — never a guessed or placeholder URL), funding (latest known stage/amount, or "unknown"), strengths[], weaknesses[], opportunity (your specific gap to exploit)}.
- "persona": {title (one rich sentence), roles[], region, pains[], current_solutions[], jobs_to_be_done[]}.
- "discovery": {interview_questions (4-6), experiments: 2-3 {name, timeline, budget, metric}}.
- "pricing_recommendation".

Return JSON matching the schema exactly (all fields above).`,
};
