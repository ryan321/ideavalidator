// Shared plumbing for the calibration scripts (variance.ts / calibrate.ts):
// env + spend gate, fixture → idea/version, validation runner, tier mapping,
// stats, and a plain table printer. Runs under `npx tsx` from the project root
// (lib/db.ts opens data/ideavalidator.db relative to cwd).

import "./env"; // load .env.local BEFORE anything touches OPENROUTER_API_KEY

import { createIdea, deleteIdea, getIdeaCost, type Idea, type Version } from "../lib/db";
import { collectEvidence } from "../lib/evidence";
import { runGenerator } from "../lib/generators";
import { verdictBands } from "../lib/scoring";
import type { Validation } from "../lib/generators/validation";
import { TIERS, type Fixture, type GoalBucket, type Tier } from "./fixtures";

// Rough per-call spend for the confirmation prompt (grounded Sonnet validation pass
// with a 10-result web plugin; evidence = cheap fast-model queries + ranking).
export const EST_COST_PER_VALIDATION = 0.35;
export const EST_COST_PER_CORPUS = 0.03;

export const flags = {
  yes: process.argv.includes("--yes"),
  keep: process.argv.includes("--keep"),
};

export function intFlag(name: string, def: number): number {
  const i = process.argv.indexOf(name);
  if (i === -1 || i + 1 >= process.argv.length) return def;
  const n = parseInt(process.argv[i + 1], 10);
  return Number.isFinite(n) && n > 0 ? n : def;
}

/** Print the plan + estimated cost; exit unless --yes was passed (nothing is spent). */
export function confirmSpendOrExit(plan: string[], estCost: number): void {
  console.log(plan.join("\n"));
  console.log(`\nEstimated cost: ~$${estCost.toFixed(2)} (at ~$${EST_COST_PER_VALIDATION}/validation + ~$${EST_COST_PER_CORPUS}/corpus, OpenRouter).`);
  console.log(
    process.env.OPENROUTER_API_KEY
      ? "OPENROUTER_API_KEY: loaded."
      : "OPENROUTER_API_KEY: MISSING — set it in .env.local before running with --yes."
  );
  if (!flags.yes) {
    console.log("\nDry run only — re-run with --yes to spend. (--keep retains the fixture ideas in the app db.)");
    process.exit(1);
  }
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("Cannot run: OPENROUTER_API_KEY is not set (checked .env.local / .env / environment).");
    process.exit(1);
  }
}

// ---- fixture runs ---------------------------------------------------------------

export type FixtureRun = {
  verdict: Validation["verdict"];
  score: number;
  confidence: number;
  criteria: Record<string, number>; // criterion name → numeric score
};

/** Create a throwaway idea+version for a fixture in the app db (titled [calibration]). */
export function createFixture(f: Fixture): { idea: Idea; version: Version } {
  return createIdea(`[calibration] ${f.title}`, f.statement, f.goal, null, f.founderFit ?? null);
}

/** One validation run (collects/reuses the version's evidence corpus internally). */
export async function runValidation(versionId: string): Promise<FixtureRun> {
  const art = await runGenerator(versionId, "validation");
  const v = art.data as Validation;
  const criteria: Record<string, number> = {};
  for (const c of v.criteria) criteria[c.name] = c.score;
  return { verdict: v.verdict, score: v.score, confidence: v.confidence, criteria };
}

/** Pre-collect the corpus once so repeat runs on the same version reuse it. */
export async function ensureCorpus(versionId: string): Promise<number> {
  const corpus = await collectEvidence(versionId);
  return corpus.items.length;
}

export function cleanupFixtures(ideaIds: string[]): void {
  if (flags.keep) {
    console.log(`\n--keep: leaving ${ideaIds.length} [calibration] idea(s) in the app db for inspection.`);
    return;
  }
  for (const id of ideaIds) deleteIdea(id);
  console.log(`\nCleaned up ${ideaIds.length} [calibration] idea(s) from the app db (use --keep to retain them).`);
}

export function actualCost(ideaIds: string[]): number {
  return ideaIds.reduce((sum, id) => sum + getIdeaCost(id), 0);
}

// ---- tiers ------------------------------------------------------------------------

/** Map a run's verdict + score onto the fixture tier scale (per-goal verdict bands).
 * INSUFFICIENT EVIDENCE derives the tier from the numeric score and is flagged. */
export function tierOf(
  verdict: string,
  score: number,
  goal: GoalBucket
): { tier: Tier; note?: string } {
  const b = verdictBands(goal);
  const mid = (b.go + b.maybe) / 2;
  if (verdict === "GO") return { tier: "GO" };
  if (verdict === "MAYBE") return { tier: score >= mid ? "MAYBE_HIGH" : "MAYBE_LOW" };
  if (verdict === "NO-GO") return { tier: "NO_GO" };
  const tier: Tier =
    score >= b.go ? "GO" : score >= mid ? "MAYBE_HIGH" : score >= b.maybe ? "MAYBE_LOW" : "NO_GO";
  return { tier, note: "INSUFFICIENT EVIDENCE — tier derived from the score" };
}

export const tierIndex = (t: Tier): number => TIERS.indexOf(t);

// ---- stats ------------------------------------------------------------------------

/** Sample standard deviation (n-1). 0 for fewer than 2 samples. */
export function sd(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
}

/** Pooled SD across groups: sqrt of the mean of the group variances. */
export function pooledSd(groups: number[][]): number {
  const vars = groups.filter((g) => g.length >= 2).map((g) => sd(g) ** 2);
  if (!vars.length) return 0;
  return Math.sqrt(vars.reduce((a, b) => a + b, 0) / vars.length);
}

// ---- output -----------------------------------------------------------------------

export function printTable(header: string[], rows: string[][]): void {
  const all = [header, ...rows];
  const widths = header.map((_, i) => Math.max(...all.map((r) => (r[i] ?? "").length)));
  const line = (r: string[]) => r.map((c, i) => (c ?? "").padEnd(widths[i])).join("  ");
  console.log(line(header));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const r of rows) console.log(line(r));
}

export const round1 = (n: number): number => Math.round(n * 10) / 10;
