"use client";

import type { SystemAdjustment } from "@/lib/generators/validation";
import { useT } from "../LocaleProvider";

// The report shows its own enforcement: every code-level rule that fired (gates,
// clamps, lints, rewrites) renders as a visible amber note — never silent.

// When the goal-fit cap fired, the recompute recorded the uncapped score inside the
// detail string ("Uncapped score: 71") — surface it as a goal-conditional read.
const UNCAPPED_RE = /uncapped(?: score)?:?\s*(\d+)/i;

export function SystemAdjustments({
  adjustments,
  goalLabel,
}: {
  adjustments: SystemAdjustment[];
  /** Human-readable goal noun, e.g. "venture" / "side-hustle" — for the goal-fit-cap line. */
  goalLabel: string;
}) {
  const t = useT();
  if (!adjustments?.length) return null;
  return (
    <div className="rounded-xl border border-warn/40 bg-warn/5 p-4">
      <div className="mb-1 font-mono text-[13px] uppercase tracking-[0.12em] text-warn">
        {t("report.systemAdjustments", { n: adjustments.length })}
      </div>
      <p className="mb-3 text-xs text-muted">{t("report.systemAdjustmentsBlurb")}</p>
      <ul className="space-y-3">
        {adjustments.map((a, i) => {
          const uncapped =
            a.rule === "goal-fit-cap" ? a.detail.match(UNCAPPED_RE)?.[1] : null;
          return (
            <li key={i} className="flex gap-2.5 text-sm leading-snug">
              <span className="mt-px font-mono font-bold text-warn" aria-hidden>
                !
              </span>
              <div className="min-w-0">
                <span className="mr-1.5 inline-block rounded border border-warn/30 bg-warn/10 px-1.5 py-px align-baseline font-mono text-[10px] uppercase tracking-wide text-warn">
                  {a.rule}
                </span>
                <span className="text-fg/90">{a.detail}</span>
                {uncapped && (
                  <div className="mt-1 text-xs text-muted">
                    {t("report.wouldScoreUnderGoal", {
                      score: uncapped,
                      goal: goalLabel,
                    })}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
