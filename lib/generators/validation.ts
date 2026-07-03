import { z } from "zod";
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

export const ValidationSchema = z.object({
  verdict: z.enum(["GO", "MAYBE", "NO-GO"]),
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  summary: z.string(),
  // Explicit effort/capital/time vs the founder's goal; for goal="unsure", the
  // lifestyle-vs-venture read. (optional for older results)
  goal_fit_note: z.string().catch("").optional(),

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

  // (action plan removed — validation is the assessment; the journey is the plan)

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

  // The headline: demand → willingness to pay → realistically obtainable revenue (vs the goal).
  demand: z
    .object({
      strength: z.enum(["Weak", "Moderate", "Strong"]),
      willingness_to_pay: z.string(), // what target customers would realistically pay
      obtainable_revenue: z.string(), // realistic annual $ THIS founder could capture
      reasoning: z.string(), // demand x WTP x capturable share, judged against the goal
      // The visible arithmetic behind obtainable_revenue (optional for older results).
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

  // ---- Comprehensive analysis (one call covers it all) -----------------------
  // Every field below is optional + .catch so a partial/older result still renders.

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

export type Validation = z.infer<typeof ValidationSchema>;

export const validationGenerator: Generator<Validation> = {
  kind: "validation",
  label: "Validation",
  blurb: "One grounded pass: scored verdict + market, money, plan & risks.",
  role: "scoring",
  grounded: true,
  webMaxResults: 10, // the one big grounded pass gets a deeper result set
  schema: ValidationSchema,
  maxTokens: 16000, // one comprehensive analysis: verdict + market + money + plan
  system:
    "You are a brutally honest startup analyst. Validate ideas against real market evidence from web " +
    "search, not hype. Be specific and quantitative, never generic.\n" +
    "CALIBRATE EACH OF THE 9 CRITERIA TO THE EVIDENCE on this 0-100 scale: 0-30 = the problem barely " +
    "matters, or a fatal flaw; 40-55 = a plausible but unvalidated signal; 60-75 = a real, evidenced " +
    "signal; 80-90 = strong and well-corroborated; 90-100 = directly demonstrated. Score HIGH where the " +
    "evidence is strong and LOW only where it is genuinely absent — do NOT be stingy with criteria that " +
    "ARE well-supported.\n" +
    "CRUCIAL — established competitors PROFITABLY doing largely what this idea proposes is the STRONGEST " +
    "demand signal there is: it proves customers exist and pay. When that's true, score Demand Strength, " +
    "Willingness to Pay, and Problem-Solution Fit HIGH (80+), and concentrate any weakness where it " +
    "actually belongs — Competitive Position and Differentiation / Moat (a crowded field with no clear " +
    "edge) — NOT across the whole board. A 'proven demand, unclear edge' idea should land solid overall " +
    "with its weakness isolated to competition, not a mediocre score everywhere.\n" +
    "Let the 9 scores DIFFER and track the evidence — they should not all huddle in one band, but do NOT " +
    "manufacture a weakness the evidence doesn't support. Score each criterion independently on its OWN " +
    "evidence; never pick a target overall number and back-fill. The overall score is COMPUTED by the " +
    "system from your criteria (demand-weighted). Judge RELATIVE TO the founder's stated goal — the same " +
    "idea can be a GO for a lifestyle business and a NO-GO for venture scale.\n" +
    "BE TERSE. This report is read on screen by a busy founder — every prose field must be tight and " +
    "skimmable. No preamble, no restating the idea, no hedging. Prefer the shortest wording that keeps the " +
    "specific evidence (a named competitor, a real figure). Long-windedness is a defect, not thoroughness.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}${goalContext(ctx)}${founderProfile(ctx)}${founderContext(ctx)}

This is the SINGLE comprehensive analysis — it must cover the verdict AND the market/competition, the money,
and the plan, all consistent with each other (reuse the same figures across sections; don't contradict yourself).

Validate this idea. You MUST issue web searches before answering and base every figure (market size,
CAGR, competitor funding, pricing) on a result you actually retrieved. Name the
source domain or publication inline in the relevant rationale/explanation/text (e.g. "(grandviewresearch.com, 2024)").
If search returns no figure, write "no reliable source found" and LOWER that criterion's score and the
overall confidence — do NOT invent a number, a competitor, or a Reddit thread. Name at least 2 real,
currently-operating competitors by name in the explanations.

An EVIDENCE section of real Reddit/Hacker News posts we fetched appears at the end of this prompt —
it is the ONLY citable demand evidence. Ground Demand Strength, Willingness to Pay, and the
demand_signals in those numbered items (weigh WILLINGNESS-TO-PAY-flagged ones heavily); if the corpus
is thin for a dimension, say so and score that dimension lower.

FIRST, glean the "pain → obvious solution" NARRATIVE from the idea — even if the founder didn't spell it
out (this drives the demand judgment): WHO feels the pain; the PAIN itself, articulated so that person
would say "yes, that's exactly me"; what they do TODAY (status_quo: existing solutions / workarounds);
the COST OF INACTION (what staying the same costs them — quantify if you can); your SOLUTION; and the
AFTER (the transformation). Then set the VERDICT: a PAINKILLER (an obvious solution to an acute, costly
pain — people will buy) or a VITAMIN (a nice-to-have the status quo handles fine). A "Vitamin" verdict
MUST cap Demand Strength low no matter how big the market, and usually means a harder, education-heavy sale.

DEMAND IS THE #1 SIGNAL — lead with it. This report is less "pass/fail" and more "here is what the founder
can realistically EXPECT, then how to improve it." Assess, in order: (1) how badly target customers want
this (from real demand signals), (2) what they would realistically pay, (3) given competitors + switching
costs + the alpha, what SHARE this founder could capture. Synthesize into "demand": { strength
(Weak/Moderate/Strong), willingness_to_pay, obtainable_revenue (realistic ANNUAL DOLLARS this founder could
capture — NOT the TAM), reasoning, and "math": { reachable (how many customers this founder can realistically
REACH — the touchable slice, not the whole market), capture (the share/conversion of those they'd actually
win, e.g. "~3%"), price (annual revenue per customer) } — the three numbers must multiply to roughly the
obtainable_revenue so the headline number is traceable }. What matters is the absolute obtainable dollars judged against the GOAL:
a small slice of a huge market can beat a large slice of a tiny one. Make the "summary" lead with what the
founder can realistically expect (the obtainable revenue vs their goal), then the verdict.

Score these 9 criteria 0-100, where HIGHER ALWAYS MEANS MORE FAVORABLE (no inverted axes). Let them TRACK
THE EVIDENCE and differ — well-validated criteria (e.g. demand proven by profitable competitors) belong at
80-90, genuinely unproven ones lower; resist huddling everything in the 70s, but don't invent a weakness the
evidence doesn't show. Output ALL 9 —
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
- "confidence" (0-100) = how much corroborating evidence you actually found (lower it when you relied on assumption). The system RECOMPUTES confidence from the fetched corpus + citation counts (your self-report only nudges it), and RECOMPUTES the overall score as a demand-weighted average of your 9 criteria, deriving the verdict from it — so put your effort into scoring the 9 criteria honestly and distinctly, NOT into tuning the headline numbers. Add a TIGHT evidence-based "summary" — AT MOST 2 sentences (~45 words) — that leads with what the founder can realistically expect (obtainable revenue vs goal), then the verdict's crux. No preamble, no restating the idea.
- "validations": problem, solution, and market validation each with a 0-100 score and an evidence-based rationale.
- "go_signals": positive_signals (why it has momentum) and key_strengths; "stop_signals": critical_risks and areas_of_concern. Each item is { text, category } where category is ONE of MARKET, DEMAND, DEFENSIBILITY, REVENUE, EXECUTION, TECH and "text" references something specific to THIS idea (a named competitor, a real number, or a cited signal) — no statement that could apply to any startup. Keep each "text" to ONE sentence, ~20 words max.
- "risk_matrix": 4-6 risks, each with category (tech/market/financial), probability (1-5), impact (1-5), and mitigation.
- "clarifying_questions": 2-4 pointed questions whose answers would most change this assessment (e.g. exact target segment, what truly distinguishes this from the named competitors, pricing/distribution). If FOUNDER CONTEXT above already answered earlier questions, ask new ones (or fewer) — don't repeat answered ones.
- "narrative": { who, pain, status_quo, cost_of_inaction, solution, after, verdict ("Painkiller"|"Vitamin"), why (ONE sentence for the verdict) }. Each field is ONE short sentence (~15 words), concrete to THIS idea — no padding, no second sentence.
- "demand": { strength (Weak/Moderate/Strong), willingness_to_pay (a SHORT $ figure ONLY, e.g. "$200–600/team/mo" — no timeframe words, no prose), obtainable_revenue (a SHORT $/yr figure ONLY, e.g. "$120K–360K/yr" — realistic annual dollars THIS founder could capture given competition + goal, NOT the TAM; do NOT append a timeframe like "by Year 2" or ANY prose), reasoning (2-3 sentences max: the pricing basis and the demand × capturable-share math), math { reachable, capture, price } (the three SHORT figures behind obtainable_revenue, as specified above), sensitivity { conservative, base, optimistic } (each a SHORT annual-$ figure — the downside, the headline, and the upside, so the founder sees the range not just a point) }.
- "goal_fit_note": 1-2 sentences stating the EFFORT/CAPITAL/TIME this idea needs vs the founder's stated goal — call out a mismatch plainly (e.g. "needs a full-time team + ~$300K; that contradicts a nights-and-weekends side hustle"). If the goal is "unsure", give the lifestyle-vs-venture split explicitly (e.g. "a solid lifestyle GO; a venture NO-GO because the SOM caps out below fund-returnable scale").
- "operating": { effort_level (Low/Medium/High), description (2–3 sentences on what the founder would actually spend time DOING — e.g. "mostly async remote support" vs "high-touch outbound sales + in-person demos") }.
- "acquisition": { difficulty (Easy/Moderate/Hard), reasoning (2–3 sentences; weigh the category-education tax — an established category buyers understand is EASIER, creating a category is HARDER; competitors can make selling easier) }.
- "downside": { capital_at_risk (1–2 sentences, LEAD with the figure, e.g. "<$15K to MVP; main risk is foregone salary"), liability (1–2 sentences), if_it_fails (1–2 sentences) }.
- "possible_alphas": 2-4 concrete differentiators/angles this idea COULD pursue to improve its odds — each { alpha (short, specific — a niche to own, a positioning as the alternative to a dominant player, a workflow/data edge, an underserved segment), rationale (1-2 sentences on why it would raise the obtainable revenue / lower risk for the goal) }. These are TESTABLE directions distinct from the current positioning.
- "market": the deeper market & competition read — { sizing: { tam: {value (a figure, e.g. "$4.2B"), note (one line)}, sam: {value, note}, som: {value, note}, methodology (one line on how you derived them) }, cagr_pct (number, e.g. 18), search_trend { keyword (the core search term), direction ("Rising"|"Flat"|"Falling"), note (e.g. "+85% YoY interest, per Google Trends") }, momentum (one line on a recent funding/exit/shift in the category, if you found one — else ""), competitors: 2-4 of [{ name (a REAL, currently-operating company), note (what they do + how satisfied their customers are, from real signals), complaint_theme (the single biggest thing their customers complain about — from real reviews/threads), your_edge (your angle vs them) }], demand_signals: 3-5 of the strongest items from the EVIDENCE section — each { evidence_id (the corpus id, e.g. "E3"), quote (the relevant excerpt from THAT item, verbatim or trimmed — never paraphrased into something the person didn't say), tag ("PAIN POINT"|"FEATURE REQUEST"|"DISCUSSION") }. NO urls — the system attaches the real link from the corpus, and a signal citing an id not in the corpus is DROPPED. If the corpus has no relevant items, return an empty demand_signals array. Only include search_trend/momentum you actually found; never fabricate a figure, a thread, or a URL. Keep all of this CONSISTENT with the scores and obtainable_revenue above.
- "financials": the money — { startup_cost (a figure to a usable MVP), unit_economics { cac, ltv, payback (each short) }, revenue_model (pricing + how money is made, one line), projections: 3 years of [{ year, revenue, customers, note }] where revenue ≈ customers × blended price each year and Year-1 is consistent with obtainable_revenue and the sales difficulty }.
- "plan": the path — { milestones: 3-5 of [{ title, when (e.g. "Month 1-2"), metric (how you know it's done) }] ordered earliest-first, team_and_ops (one line: who/what it takes to build and run) }.

Return JSON exactly matching:
{
  "verdict": "GO"|"MAYBE"|"NO-GO", "score": number, "confidence": number, "summary": string, "goal_fit_note": string,
  "criteria": [{"name": string, "score": number, "group": "demand"|"build", "category": string, "explanation": string}],
  "validations": {"problem": {"score": number, "rationale": string}, "solution": {"score": number, "rationale": string}, "market": {"score": number, "rationale": string}},
  "go_signals": {"positive_signals": [{"text": string, "category": string}], "key_strengths": [{"text": string, "category": string}]},
  "stop_signals": {"critical_risks": [{"text": string, "category": string}], "areas_of_concern": [{"text": string, "category": string}]},
  "risk_matrix": [{"title": string, "category": "tech"|"market"|"financial", "probability": number, "impact": number, "mitigation": string}],
  "clarifying_questions": [string],
  "narrative": {"who": string, "pain": string, "status_quo": string, "cost_of_inaction": string, "solution": string, "after": string, "verdict": "Painkiller"|"Vitamin", "why": string},
  "demand": {"strength": "Weak"|"Moderate"|"Strong", "willingness_to_pay": string, "obtainable_revenue": string, "reasoning": string, "math": {"reachable": string, "capture": string, "price": string}, "sensitivity": {"conservative": string, "base": string, "optimistic": string}},
  "operating": {"effort_level": "Low"|"Medium"|"High", "description": string},
  "downside": {"capital_at_risk": string, "liability": string, "if_it_fails": string},
  "acquisition": {"difficulty": "Easy"|"Moderate"|"Hard", "reasoning": string},
  "possible_alphas": [{"alpha": string, "rationale": string}],
  "market": {"sizing": {"tam": {"value": string, "note": string}, "sam": {"value": string, "note": string}, "som": {"value": string, "note": string}, "methodology": string}, "cagr_pct": number, "search_trend": {"keyword": string, "direction": "Rising"|"Flat"|"Falling", "note": string}, "momentum": string, "competitors": [{"name": string, "note": string, "complaint_theme": string, "your_edge": string}], "demand_signals": [{"evidence_id": string, "quote": string, "tag": string}]},
  "financials": {"startup_cost": string, "unit_economics": {"cac": string, "ltv": string, "payback": string}, "revenue_model": string, "projections": [{"year": string, "revenue": string, "customers": string, "note": string}]},
  "plan": {"milestones": [{"title": string, "when": string, "metric": string}], "team_and_ops": string}
}`,
};
