"use client";

import {
  BASE_WEIGHTS,
  CRITERIA,
  FORECAST_ANCHORS,
  GATES,
  GOAL_WEIGHTS,
  MEASURED_SCORE_SD,
  VERDICT_BANDS,
  criterionWeight,
  forecastToBand,
  normalizeGoal,
  scoringSamples,
  verdictBands,
  type GoalBucket,
} from "@/lib/scoring";
import { useT } from "../LocaleProvider";

// "How this is scored" — the published scoring machinery, imported from the SAME
// module the recompute uses (lib/scoring.ts). Nothing here is hardcoded copy: if a
// weight or gate changes, this disclosure changes with it.

const GOAL_LABELS: Record<GoalBucket, string> = {
  lifestyle: "Lifestyle / replace my job",
  side_hustle: "Side hustle",
  venture: "Venture-scale",
  unsure: "Not sure yet",
};

// Display order: easiest bar → hardest (matches how founders tend to compare goals).
const GOAL_ORDER: GoalBucket[] = ["side_hustle", "lifestyle", "unsure", "venture"];

export function HowScored({
  goal,
  samples,
  print = false,
}: {
  goal: string | null | undefined;
  /** Active k for self-consistency scoring — passed from the server so the value matches
   * the env the recompute actually ran under (falls back to the default at k=undefined). */
  samples?: number;
  print?: boolean;
}) {
  const t = useT();
  const g = normalizeGoal(goal);
  const bands = verdictBands(g);
  const mods = GOAL_WEIGHTS[g];
  const k = samples ?? scoringSamples();

  // The gate list, phrased from the live constants.
  const gates: string[] = [
    `Any criterion ≤ ${GATES.fatalCriterion} caps the verdict at MAYBE — strengths elsewhere can't buy back a fatal flaw.`,
    `GO requires Demand Strength ≥ ${GATES.goDemandMin} AND Founder Fit ≥ ${GATES.goFounderFitMin}.`,
    `min(Competitive Position, Differentiation / Moat) < ${GATES.noEdgeMin} caps the overall score at ${GATES.noEdgeCap} (the "no-edge cap").`,
    `A "Vitamin" narrative verdict clamps Demand Strength to ≤ ${GATES.vitaminDemandClamp} before averaging.`,
    `Goal Fit < ${GATES.goalFitMin} caps the overall score at ${GATES.goalFitCap} — the uncapped score is recorded and shown.`,
    `No verifiable search trend or category momentum clamps Market Timing to ≤ ${GATES.timingUnverifiedClamp} ("Why Now" unverified).`,
    `Computed confidence < ${GATES.insufficientEvidenceConfidence} replaces the verdict with INSUFFICIENT EVIDENCE (the score stays visible).`,
  ];

  return (
    <details className="group rounded-xl border border-border bg-panel/40" open={print}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 font-mono text-[13px] uppercase tracking-[0.12em] text-muted hover:text-fg">
        <span className="transition group-open:rotate-90">▸</span>
        {t("report.howScored")}
      </summary>
      <div className="space-y-5 border-t border-border p-5">
        <p className="max-w-3xl text-xs leading-relaxed text-muted">
          The model writes a rationale, then a coarse letter band (A+…F) per criterion — it never
          picks the overall number. The system maps bands to scores, weights them for your goal
          (<b className="text-fg/80">{GOAL_LABELS[g]}</b>), and applies non-compensatory gates.
          These constants are the exact ones the scorer runs on.
        </p>

        {/* per-goal verdict bands — full table so a 66 vs 72 GO line is self-explanatory */}
        <div>
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Verdict bands by goal
          </div>
          <p className="mb-2 max-w-3xl text-xs leading-relaxed text-muted">
            The same weighted score clears a different bar depending on what you&apos;re going for.
            This report is judged against{" "}
            <b className="text-fg/80">{GOAL_LABELS[g]}</b> ({t("verdict.go")} ≥ {bands.go},{" "}
            {t("verdict.maybe")} ≥ {bands.maybe}).
            Change the goal when creating a variant (or via Edit goal) and the next run uses that
            goal&apos;s line; older versions keep the bar they were scored under.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[20rem] text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-panel2/60 font-mono text-[10px] uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-medium">Goal</th>
                  <th className="px-3 py-2 font-medium text-good">{t("verdict.go")} ≥</th>
                  <th className="px-3 py-2 font-medium text-warn">{t("verdict.maybe")} ≥</th>
                  <th className="px-3 py-2 font-medium text-bad">{t("verdict.noGo")} &lt;</th>
                </tr>
              </thead>
              <tbody>
                {GOAL_ORDER.map((key) => {
                  const b = VERDICT_BANDS[key];
                  const active = key === g;
                  return (
                    <tr
                      key={key}
                      className={`border-b border-border/60 last:border-0 ${
                        active ? "bg-accent/10 text-fg" : "text-muted"
                      }`}
                    >
                      <td className="px-3 py-2">
                        {GOAL_LABELS[key]}
                        {active && (
                          <span className="ml-2 rounded-full border border-accent/40 bg-accent/15 px-1.5 py-px font-mono text-[9px] uppercase tracking-wide text-accent">
                            this report
                          </span>
                        )}
                      </td>
                      <td className={`px-3 py-2 font-mono tabular-nums ${active ? "text-good" : ""}`}>
                        {b.go}
                      </td>
                      <td className={`px-3 py-2 font-mono tabular-nums ${active ? "text-warn" : ""}`}>
                        {b.maybe}
                      </td>
                      <td className={`px-3 py-2 font-mono tabular-nums ${active ? "text-bad" : ""}`}>
                        {b.maybe}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 font-mono text-xs">
            <span className="rounded-md border border-border bg-panel2 px-2 py-1 text-muted">
              INSUFFICIENT EVIDENCE · confidence &lt; {GATES.insufficientEvidenceConfidence}
            </span>
          </div>
          <p className="mt-1.5 text-xs text-muted">
            Measured run-to-run scoring noise is ±{MEASURED_SCORE_SD} points — a score within that
            of a line is borderline, not a decision.
          </p>
        </div>

        {/* k-sample self-consistency mechanics */}
        <div>
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Self-consistency · {k} scoring {k === 1 ? "run" : "runs"}
          </div>
          {k > 1 ? (
            <p className="max-w-3xl text-xs leading-relaxed text-muted">
              Each validation fires <b className="text-fg/80">{k}</b> independent scoring runs on the
              same claims brief and evidence corpus. Every criterion&apos;s score is the{" "}
              <b className="text-fg/80">median</b> of the {k} runs (not one lucky roll); the rest of
              the report (narrative, market, money, plan) comes from the median-overall run. When the{" "}
              {k} runs disagree by more than 10 points on a criterion, it gets a{" "}
              <span className="rounded-full border border-warn/40 bg-warn/10 px-1.5 py-px font-mono text-[9px] uppercase tracking-wide text-warn">disagree</span>{" "}
              marker. Overall agreement then nudges confidence: a tight spread (≤5) adds points, a
              wide one (&gt;12) subtracts — surfaced as a system adjustment.
            </p>
          ) : (
            <p className="max-w-3xl text-xs leading-relaxed text-muted">
              Scoring runs a single pass (<code className="font-mono">SCORING_SAMPLES=1</code>) — no
              medians or agreement adjustment. Set <code className="font-mono">SCORING_SAMPLES</code>{" "}
              higher to fire k parallel runs and take the per-criterion median (at ~k× the run cost).
            </p>
          )}
        </div>

        {/* verbalized probability — the two forecast criteria */}
        <div>
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Verbalized probability · Market Timing &amp; Competitive Position
          </div>
          <p className="max-w-3xl text-xs leading-relaxed text-muted">
            Those two criteria are forecast-shaped — they assert something about the future. For them,
            the model states a concrete, dated, checkable event and its{" "}
            <b className="text-fg/80">probability</b> (0–1), and the system{" "}
            <b className="text-fg/80">derives the band and score from that probability</b> via the fixed
            monotonic map below (overriding the emitted band), so the number is auditable against the
            stated odds. You see the forecast on each of those criterion rows.
          </p>
          <div className="mt-2 overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[24rem] text-xs">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wide text-muted">
                  <th className="px-3 py-1.5 font-medium">P(event)</th>
                  {FORECAST_ANCHORS.map(([p]) => (
                    <th key={p} className="px-3 py-1.5 text-right font-medium">
                      {Math.round(p * 100)}%
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/60">
                  <td className="px-3 py-1.5 text-muted">Score</td>
                  {FORECAST_ANCHORS.map(([p]) => (
                    <td key={p} className="px-3 py-1.5 text-right font-mono font-bold">
                      {forecastToBand(p).score}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="px-3 py-1.5 text-muted">Band</td>
                  {FORECAST_ANCHORS.map(([p]) => (
                    <td key={p} className="px-3 py-1.5 text-right font-mono text-accent2">
                      {forecastToBand(p).band}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-xs text-muted">
            Probabilities between anchors are interpolated, then snapped to the nearest band — a
            forecast-derived score is otherwise identical to an elicited band downstream (it flows
            through every gate and the weighted average the same way).
          </p>
        </div>

        {/* the active weight vector */}
        <div>
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Criterion weights (base × goal multiplier)
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[24rem] text-xs">
              <thead>
                <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wide text-muted">
                  <th className="px-3 py-1.5 font-medium">Criterion</th>
                  <th className="px-3 py-1.5 text-right font-medium">Base</th>
                  <th className="px-3 py-1.5 text-right font-medium">× Goal</th>
                  <th className="px-3 py-1.5 text-right font-medium">Effective</th>
                </tr>
              </thead>
              <tbody>
                {CRITERIA.map((name) => {
                  const mod = mods[name] ?? 1;
                  return (
                    <tr key={name} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-1.5">{name}</td>
                      <td className="px-3 py-1.5 text-right font-mono text-muted">{BASE_WEIGHTS[name].toFixed(1)}</td>
                      <td className={`px-3 py-1.5 text-right font-mono ${mod !== 1 ? "font-bold text-accent2" : "text-muted"}`}>
                        {mod.toFixed(1)}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold">
                        {criterionWeight(name, g).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* the gates */}
        <div>
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Non-compensatory gates
          </div>
          <ul className="space-y-1.5">
            {gates.map((gate, i) => (
              <li key={i} className="flex gap-2 text-xs leading-relaxed text-fg/85">
                <span className="text-warn" aria-hidden>▸</span>
                {gate}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">
            Every gate that fires on a run appears in the “System adjustments” list — enforcement
            is visible, never silent.
          </p>
        </div>
      </div>
    </details>
  );
}
