"use client";

import type { Validation } from "@/lib/generators/validation";
import { criterionLabel } from "@/lib/i18n/t";
import { useT } from "../LocaleProvider";

// "The one thing to test next" — the report's LEAD. The deliverable is a decision
// plus the cheapest way to change it, so the kill-test reads BEFORE the verdict meter:
// the riskiest assumption, a ≤1-week test with its channel, the pre-registered
// pass/kill commitment as a pair, what would flip it both directions, and (borderline
// only) the pivotal criterion whose resolution exits the MAYBE band.

export function NextTest({
  next,
  verdict,
  print = false,
}: {
  next: NonNullable<Validation["next_test"]>;
  verdict?: string;
  print?: boolean;
}) {
  const t = useT();
  const pivotal = next.pivotal_criterion?.trim();
  // The pivotal-criterion callout is meaningful only for a borderline read — the model
  // is told to leave it blank otherwise, but gate on the verdict too so it never shows
  // on a clean GO/NO-GO even if the model over-fills it.
  const showPivotal = !!pivotal && verdict === "MAYBE";

  return (
    <section className="folio border-accent2/35 p-5 sm:p-6">
      <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-accent2">
        <span aria-hidden>◎</span>
        {t("report.nextToProve")}
      </div>

      {/* the riskiest assumption — the belief the corpus does NOT already settle */}
      <p className="mt-3 font-display text-lg font-bold leading-snug tracking-tight text-fg sm:text-xl">
        {next.riskiest_assumption}
      </p>

      {/* the cheapest test that could change the verdict, with its channel */}
      <div className="mt-4">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{t("report.cheapestTest")}</div>
        <p className="mt-1 text-[15px] leading-relaxed text-fg/90">{next.cheapest_test}</p>
      </div>

      {/* pass / kill as ONE pre-registered commitment — both bars visible together so
          the founder can't move the goalposts after seeing the result */}
      <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
        <div className="bg-panel px-3.5 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-good">{t("report.passKeep")}</div>
          <p className="mt-1 text-sm leading-snug text-fg/90">{next.pass_threshold}</p>
        </div>
        <div className="bg-panel px-3.5 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-bad">{t("report.killPivot")}</div>
          <p className="mt-1 text-sm leading-snug text-fg/90">{next.kill_threshold}</p>
        </div>
      </div>

      {/* what evidence would flip the verdict, both directions */}
      {(next.would_flip?.to_go || next.would_flip?.to_no_go) && (
        <div className="mt-4 space-y-1.5 text-sm">
          {next.would_flip?.to_go && (
            <div className="flex gap-2 leading-snug">
              <span className="mt-px shrink-0 font-mono font-bold text-good" aria-hidden>↑</span>
              <span className="text-fg/85">
                <span className="text-good">{t("report.flipsUp")}</span> {next.would_flip.to_go}
              </span>
            </div>
          )}
          {next.would_flip?.to_no_go && (
            <div className="flex gap-2 leading-snug">
              <span className="mt-px shrink-0 font-mono font-bold text-bad" aria-hidden>↓</span>
              <span className="text-fg/85">
                <span className="text-bad">{t("report.flipsDown")}</span> {next.would_flip.to_no_go}
              </span>
            </div>
          )}
        </div>
      )}

      {/* borderline MAYBE only: the ONE criterion whose resolution exits the band */}
      {showPivotal && (
        <div className="mt-4 rounded-r-lg border-l-2 border-warn/50 bg-warn/5 px-3.5 py-2.5 text-sm">
          <span className="font-mono text-[11px] uppercase tracking-wide text-warn">
            {t("report.pivotal")}{" "}
          </span>
          <span className="text-fg/90">
            {t("report.pivotalBlurb", {
              criterion: criterionLabel(pivotal, t),
            })}
          </span>
        </div>
      )}
    </section>
  );
}
