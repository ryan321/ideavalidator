// Every constant behind the validation score, in ONE exported module — the weights,
// the per-goal modulation, the verdict bands, the band→number map, and the
// non-compensatory gates. The recompute in lib/generators/index.ts consumes these,
// and the UI can import the same constants to publish them (no duplicated numbers).

// ---- band scoring ----------------------------------------------------------------

// The model emits a coarse letter band per criterion (rationale first, band second) —
// models can discriminate 13 labels but not 74-vs-78. Code maps bands to numbers so
// the radar / recompute / UI keep working on 0-100.
export const BANDS = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"] as const;
export type Band = (typeof BANDS)[number];

export const BAND_SCORE: Record<Band, number> = {
  "A+": 95,
  A: 90,
  "A-": 85,
  "B+": 78,
  B: 72,
  "B-": 66,
  "C+": 60,
  C: 55,
  "C-": 48,
  "D+": 42,
  D: 36,
  "D-": 30,
  F: 15,
};

export function bandScore(band: string): number {
  // Unknown bands can't survive the schema, but if one ever reaches here, grade it F
  // rather than 0 — a parsing artifact must not read harsher than the worst real band.
  return BAND_SCORE[band as Band] ?? BAND_SCORE.F;
}

// Traffic-light tone for a single criterion score — the ONE place these display
// breakpoints live (distinct from the per-goal verdict bands below).
export function criterionTone(n: number): string {
  return n >= 70 ? "var(--color-good)" : n >= 45 ? "var(--color-warn)" : "var(--color-bad)";
}

// ---- criteria + weights ------------------------------------------------------------

// The 9 criteria (exact names the schema, radar, and weight map key on).
export const CRITERIA = [
  "Demand Strength",
  "Willingness to Pay",
  "Problem-Solution Fit",
  "Market Timing",
  "Competitive Position",
  "Differentiation / Moat",
  "Acquisition Ease",
  "Founder Fit",
  "Goal Fit",
] as const;
export type CriterionName = (typeof CRITERIA)[number];

// Base weights track evidence-groundability and empirical predictiveness (demand/WTP
// heaviest; plan-polish/pedigree-shaped signals lowest), replacing the old opaque
// "demand group × 1.4".
export const BASE_WEIGHTS: Record<CriterionName, number> = {
  "Demand Strength": 1.6,
  "Willingness to Pay": 1.5,
  "Problem-Solution Fit": 1.2,
  "Market Timing": 1.1,
  "Competitive Position": 1.1,
  "Differentiation / Moat": 1.0,
  "Acquisition Ease": 1.1,
  "Founder Fit": 1.2,
  "Goal Fit": 0.8,
};

export type GoalBucket = "lifestyle" | "side_hustle" | "venture" | "unsure";

// Criteria are scored goal-NEUTRALLY by the model; the founder's goal enters HERE,
// as an explicit multiplier vector on the base weights.
export const GOAL_WEIGHTS: Record<GoalBucket, Partial<Record<CriterionName, number>>> = {
  venture: { "Differentiation / Moat": 1.5, "Market Timing": 1.3 },
  side_hustle: {
    "Acquisition Ease": 1.4,
    "Founder Fit": 1.5,
    "Goal Fit": 1.2,
    "Differentiation / Moat": 0.6,
  },
  lifestyle: { "Willingness to Pay": 1.7, "Founder Fit": 1.4, "Differentiation / Moat": 0.5 },
  unsure: {},
};

export function normalizeGoal(goal: string | null | undefined): GoalBucket {
  return goal === "lifestyle" || goal === "side_hustle" || goal === "venture" ? goal : "unsure";
}

/** Effective weight of one criterion for one goal: base × goal multiplier. */
export function criterionWeight(name: string, goal: string | null | undefined): number {
  const base = BASE_WEIGHTS[name as CriterionName] ?? 1;
  const mod = GOAL_WEIGHTS[normalizeGoal(goal)][name as CriterionName] ?? 1;
  return base * mod;
}

// ---- verdict bands -----------------------------------------------------------------

// Per-goal verdict thresholds — the same weighted score clears a different bar for a
// venture bet than for a side hustle. (score ≥ go → GO; ≥ maybe → MAYBE; else NO-GO)
export const VERDICT_BANDS: Record<GoalBucket, { go: number; maybe: number }> = {
  venture: { go: 78, maybe: 50 },
  side_hustle: { go: 66, maybe: 45 },
  lifestyle: { go: 68, maybe: 45 },
  unsure: { go: 72, maybe: 47 },
};

export function verdictBands(goal: string | null | undefined): { go: number; maybe: number } {
  return VERDICT_BANDS[normalizeGoal(goal)];
}

// ---- non-compensatory gates ----------------------------------------------------------

// A fatal flaw must be able to kill a verdict — weighted means stay as the readable
// backbone, but these code-level gates make "all-85 demand + Founder Fit 20 = GO"
// impossible. Each firing gate appends a visible system_adjustment on the artifact.
export const GATES = {
  /** (a) any criterion at or below this caps the verdict at MAYBE */
  fatalCriterion: 25,
  /** (b) GO requires Demand Strength ≥ this ... */
  goDemandMin: 55,
  /** (b) ... AND Founder Fit ≥ this */
  goFounderFitMin: 40,
  /** (c) min(Competitive Position, Moat) below this ... */
  noEdgeMin: 35,
  /** (c) ... caps the overall score at this ("no-edge cap") */
  noEdgeCap: 55,
  /** (d) narrative.verdict === "Vitamin" clamps Demand Strength to this BEFORE averaging */
  vitaminDemandClamp: 50,
  /** (e) Goal Fit below this ... */
  goalFitMin: 40,
  /** (e) ... caps the overall score at this (uncapped score recorded for goal-conditional rendering) */
  goalFitCap: 55,
  /** (f) Demand Strength, WTP, Problem-Solution Fit all ≥ this ... */
  yokeMin: 80,
  /** (f) ... and within this many points of each other → suspected yoked scoring flag */
  yokeSpread: 5,
  /** search_trend + momentum both empty clamps Market Timing to this (Why Now unverified) */
  timingUnverifiedClamp: 55,
  /** computed confidence below this replaces the verdict with INSUFFICIENT EVIDENCE */
  insufficientEvidenceConfidence: 35,
  /** rank-degraded corpus caps the corpus contribution to confidence at this (of 60) */
  degradedCorpusConfidenceCap: 30,
} as const;

// ---- hill-climb acceptance margin ----------------------------------------------------

/** Measured run-to-run SD of the overall score (same statement, same pinned corpus).
 * Measured 2026-07-03 via `npm run variance` (12 runs / 3 fixtures, pooled SD 3.4);
 * re-measure after any prompt or model change and paste the value it prints. */
export const MEASURED_SCORE_SD = 3;

/** Auto-iterate accepts a new best only if it clears the champion by this margin —
 * a lucky re-roll of scoring noise must not count as an improvement. */
export function acceptanceMargin(): number {
  return Math.max(3, 1.5 * MEASURED_SCORE_SD);
}

// ---- derived sub-scores ---------------------------------------------------------------

// demand.strength is DERIVED from the Demand Strength criterion score — the report can
// never say "Demand Strength 72" beside "demand: Weak" again.
export const DEMAND_STRENGTH_THRESHOLDS = { strong: 70, moderate: 45 } as const;

export function demandStrengthLabel(score: number): "Weak" | "Moderate" | "Strong" {
  if (score >= DEMAND_STRENGTH_THRESHOLDS.strong) return "Strong";
  if (score >= DEMAND_STRENGTH_THRESHOLDS.moderate) return "Moderate";
  return "Weak";
}
