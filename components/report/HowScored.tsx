import {
  BASE_WEIGHTS,
  CRITERIA,
  GATES,
  GOAL_WEIGHTS,
  MEASURED_SCORE_SD,
  criterionWeight,
  normalizeGoal,
  scoringSamples,
  verdictBands,
  type GoalBucket,
} from "@/lib/scoring";

// "How this is scored" — the published scoring machinery, imported from the SAME
// module the recompute uses (lib/scoring.ts). Nothing here is hardcoded copy: if a
// weight or gate changes, this disclosure changes with it.

const GOAL_LABELS: Record<GoalBucket, string> = {
  lifestyle: "Lifestyle / replace my job",
  side_hustle: "Side hustle",
  venture: "Venture-scale",
  unsure: "Not sure yet",
};

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
        How this is scored — published weights, bands &amp; gates
      </summary>
      <div className="space-y-5 border-t border-border p-5">
        <p className="max-w-3xl text-xs leading-relaxed text-muted">
          The model writes a rationale, then a coarse letter band (A+…F) per criterion — it never
          picks the overall number. The system maps bands to scores, weights them for your goal
          (<b className="text-fg/80">{GOAL_LABELS[g]}</b>), and applies non-compensatory gates.
          These constants are the exact ones the scorer runs on.
        </p>

        {/* per-goal verdict bands */}
        <div>
          <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            Verdict bands · {GOAL_LABELS[g]}
          </div>
          <div className="flex flex-wrap gap-2 font-mono text-xs">
            <span className="rounded-md border border-good/30 bg-good/10 px-2 py-1 text-good">GO ≥ {bands.go}</span>
            <span className="rounded-md border border-warn/30 bg-warn/10 px-2 py-1 text-warn">MAYBE ≥ {bands.maybe}</span>
            <span className="rounded-md border border-bad/30 bg-bad/10 px-2 py-1 text-bad">NO-GO &lt; {bands.maybe}</span>
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
