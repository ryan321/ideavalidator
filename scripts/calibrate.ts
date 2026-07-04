// Runs the 14-idea known-outcome fixture suite (scripts/fixtures.ts) through the real
// validation pipeline (evidence corpus + claims brief + grounded scoring + gates) and
// asserts each idea lands in its expected verdict tier — winners must clear
// MAYBE-high/GO, known failures must stay low, garbage must NO-GO. Prints a scorecard
// and exits nonzero on any failed expectation.
//
//   npm run calibrate -- --yes [--keep]
//
// Spends real OpenRouter credit — refuses to run without --yes.

import "./env";

import { FIXTURES, TIERS } from "./fixtures";
import {
  EST_COST_PER_AUDIT,
  EST_COST_PER_CORPUS,
  EST_COST_PER_VALIDATION,
  actualCost,
  cleanupFixtures,
  confirmSpendOrExit,
  createFixture,
  printTable,
  runValidation,
  tierIndex,
  tierOf,
} from "./harness";

async function main(): Promise<void> {
  confirmSpendOrExit(
    [
      `calibrate: 1 validation run + 1 second-family audit for each of the ${FIXTURES.length} fixture ideas:`,
      ...FIXTURES.map((f) => `  - ${f.id} (${f.goal}): expect ${expectLabel(f.min, f.max)}`),
    ],
    FIXTURES.length * (EST_COST_PER_VALIDATION + EST_COST_PER_CORPUS + EST_COST_PER_AUDIT)
  );

  const ideaIds: string[] = [];
  const rows: string[][] = [];
  let failures = 0;

  try {
    for (const f of FIXTURES) {
      console.log(`\n=== ${f.id} (${f.goal}) ===`);
      let row: string[];
      try {
        const { idea, version } = createFixture(f);
        ideaIds.push(idea.id);
        // Also run the second-family audit judge per fixture and print its per-criterion
        // divergence (surfaced, NOT asserted — it never changes the pass/fail).
        const run = await runValidation(version.id, { audit: true }); // collects the corpus itself
        const { tier, note } = tierOf(run.verdict, run.score, f.goal);
        const pass =
          (f.min === undefined || tierIndex(tier) >= tierIndex(f.min)) &&
          (f.max === undefined || tierIndex(tier) <= tierIndex(f.max));
        if (!pass) failures++;
        console.log(
          `score ${run.score} · ${run.verdict} · confidence ${run.confidence} → ${tier}${note ? ` (${note})` : ""} · ${pass ? "PASS" : `FAIL — ${f.why}`}`
        );
        if (run.audit) {
          const worst = [...run.audit.criteria]
            .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
            .slice(0, 3)
            .map((c) => `${c.name} ${c.delta >= 0 ? "+" : ""}${c.delta}`)
            .join(", ");
          console.log(
            `  audit (${run.audit.model}): ${
              run.audit.flagged.length ? `FLAGGED >15 on ${run.audit.flagged.join(", ")}` : "agreed within 15 pts"
            } · largest deltas (audit−ours): ${worst}`
          );
        }
        row = [
          f.id,
          f.goal,
          String(run.score),
          run.verdict,
          String(run.confidence),
          tier + (note ? "*" : ""),
          expectLabel(f.min, f.max),
          pass ? "PASS" : "FAIL",
        ];
      } catch (e) {
        failures++;
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`ERROR: ${msg}`);
        row = [f.id, f.goal, "-", "ERROR", "-", "-", expectLabel(f.min, f.max), "FAIL"];
      }
      rows.push(row);
    }

    console.log("\n=== calibration scorecard ===");
    printTable(["fixture", "goal", "score", "verdict", "conf", "tier", "expected", "result"], rows);
    console.log(`\nTier scale: ${TIERS.join(" < ")}  (* = INSUFFICIENT EVIDENCE, tier derived from the score)`);
    console.log(
      failures
        ? `\n${failures}/${FIXTURES.length} fixtures FAILED their expected band.`
        : `\nAll ${FIXTURES.length} fixtures landed in their expected bands.`
    );
  } finally {
    // cost first — cleanup deletes the fixtures' usage_log rows with the ideas
    console.log(`\nActual spend: $${actualCost(ideaIds).toFixed(2)}`);
    cleanupFixtures(ideaIds);
  }

  if (failures) process.exit(1);
}

function expectLabel(min?: string, max?: string): string {
  if (min && max) return `${min}..${max}`;
  if (min) return `≥ ${min}`;
  if (max) return `≤ ${max}`;
  return "(any)";
}

main().catch((e) => {
  console.error(e instanceof Error ? e.stack ?? e.message : String(e));
  process.exit(1);
});
