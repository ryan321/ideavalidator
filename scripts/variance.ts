// Measures run-to-run scoring variance: N validation runs (default 4) over the 3
// variance fixtures, HOLDING EACH FIXTURE'S EVIDENCE CORPUS CONSTANT (collected once,
// reused by every run) — so the SD is the scoring pass's own noise, the same quantity
// the auto-iterate acceptance margin must clear. Writes data/calibration/variance.json
// and prints the MEASURED_SCORE_SD value to paste into lib/scoring.ts.
//
//   npm run variance -- --yes [--runs 4] [--keep]
//
// Spends real OpenRouter credit — refuses to run without --yes.

import "./env";

import fs from "node:fs";
import path from "node:path";
import { CRITERIA, MEASURED_SCORE_SD } from "../lib/scoring";
import { VARIANCE_FIXTURES } from "./fixtures";
import {
  EST_COST_PER_CORPUS,
  EST_COST_PER_VALIDATION,
  actualCost,
  cleanupFixtures,
  confirmSpendOrExit,
  createFixture,
  ensureCorpus,
  intFlag,
  pooledSd,
  printTable,
  round1,
  runValidation,
  sd,
  type FixtureRun,
} from "./harness";

const runsPerFixture = intFlag("--runs", 4);

async function main(): Promise<void> {
  const totalRuns = runsPerFixture * VARIANCE_FIXTURES.length;
  confirmSpendOrExit(
    [
      `variance: ${runsPerFixture} validation runs × ${VARIANCE_FIXTURES.length} fixtures (${totalRuns} runs total), evidence pinned per fixture:`,
      ...VARIANCE_FIXTURES.map((f) => `  - ${f.id} (${f.goal}): ${f.title}`),
      `Output: data/calibration/variance.json + the MEASURED_SCORE_SD value to set in lib/scoring.ts (currently ${MEASURED_SCORE_SD}).`,
    ],
    totalRuns * EST_COST_PER_VALIDATION + VARIANCE_FIXTURES.length * EST_COST_PER_CORPUS
  );

  const ideaIds: string[] = [];
  const perFixture: {
    id: string;
    goal: string;
    scores: number[];
    verdicts: string[];
    overall_sd: number;
    per_criterion_sd: Record<string, number>;
    verdict_flips: number;
  }[] = [];

  try {
    for (const f of VARIANCE_FIXTURES) {
      console.log(`\n=== ${f.id} (${f.goal}) ===`);
      const { idea, version } = createFixture(f);
      ideaIds.push(idea.id);
      const items = await ensureCorpus(version.id);
      console.log(`corpus: ${items} items (collected once, reused by every run)`);

      const runs: FixtureRun[] = [];
      for (let r = 1; r <= runsPerFixture; r++) {
        const run = await runValidation(version.id);
        runs.push(run);
        console.log(`run ${r}/${runsPerFixture}: score ${run.score}, verdict ${run.verdict}, confidence ${run.confidence}`);
      }

      const scores = runs.map((r) => r.score);
      const verdicts = runs.map((r) => r.verdict);
      const modal = Math.max(...[...new Set(verdicts)].map((v) => verdicts.filter((x) => x === v).length));
      const per_criterion_sd: Record<string, number> = {};
      for (const name of CRITERIA) {
        per_criterion_sd[name] = round1(sd(runs.map((r) => r.criteria[name] ?? 0)));
      }
      perFixture.push({
        id: f.id,
        goal: f.goal,
        scores,
        verdicts,
        overall_sd: round1(sd(scores)),
        per_criterion_sd,
        verdict_flips: runs.length - modal,
      });
    }

    // ---- aggregate + report ---------------------------------------------------
    const overallSd = pooledSd(perFixture.map((f) => f.scores));
    // pooled per-criterion SD from the per-fixture SDs: sqrt of the mean variance
    const pooledCriterion: Record<string, number> = {};
    for (const name of CRITERIA) {
      const sds = perFixture.map((f) => f.per_criterion_sd[name]);
      pooledCriterion[name] = round1(Math.sqrt(sds.reduce((a, s) => a + s * s, 0) / sds.length));
    }
    const totalFlips = perFixture.reduce((a, f) => a + f.verdict_flips, 0);
    const recommended = Math.max(1, Math.round(overallSd));

    console.log("\n=== variance scorecard ===");
    printTable(
      ["fixture", "goal", "scores", "verdicts", "score SD", "flips"],
      perFixture.map((f) => [
        f.id,
        f.goal,
        f.scores.join(", "),
        [...new Set(f.verdicts)].join(" / "),
        String(f.overall_sd),
        String(f.verdict_flips),
      ])
    );
    console.log("\nper-criterion SD (pooled):");
    printTable(
      ["criterion", "SD"],
      CRITERIA.map((name) => [name, String(pooledCriterion[name])])
    );

    const outDir = path.join(process.cwd(), "data", "calibration");
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, "variance.json");
    fs.writeFileSync(
      outPath,
      JSON.stringify(
        {
          measured_at: new Date().toISOString(),
          runs_per_fixture: runsPerFixture,
          fixtures: perFixture,
          pooled: {
            overall_score_sd: round1(overallSd),
            per_criterion_sd: pooledCriterion,
            verdict_flips: totalFlips,
          },
          recommended_measured_score_sd: recommended,
        },
        null,
        2
      ) + "\n"
    );

    console.log(`\nWrote ${outPath}`);
    console.log(`Pooled overall-score SD: ${round1(overallSd)} · verdict flips: ${totalFlips}/${totalRuns}`);
    console.log(
      `→ Set MEASURED_SCORE_SD = ${recommended} in lib/scoring.ts (currently ${MEASURED_SCORE_SD}; acceptance margin becomes max(3, ${round1(1.5 * recommended)})).`
    );
  } finally {
    // cost first — cleanup deletes the fixtures' usage_log rows with the ideas
    console.log(`\nActual spend: $${actualCost(ideaIds).toFixed(2)}`);
    cleanupFixtures(ideaIds);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack ?? e.message : String(e));
  process.exit(1);
});
