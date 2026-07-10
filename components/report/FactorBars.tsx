"use client";

import { Card } from "@/components/ui";
import { criterionLabel } from "@/lib/i18n/t";
import { criterionTone as scoreColor } from "@/lib/scoring";
import { useT } from "../LocaleProvider";
import { LeverChip } from "./chips";
import { SpreadMarker } from "./SpreadMarker";

type Criterion = {
  name: string;
  score: number;
  band?: string; // the elicited letter band the score derives from
  group: "demand" | "build";
  category: string;
  explanation: string;
  lever?: string; // positioning | evidence | execution | exogenous
  lever_action?: string; // the ONE concrete line that would move this criterion
  spread?: number; // k-sample disagreement (max−min) when it exceeded threshold
};

function FactorColumn({
  label,
  title,
  items,
}: {
  label: string;
  title: string;
  items: Criterion[];
}) {
  const t = useT();
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
      <h3 className="mt-0.5 text-base font-bold text-fg">{title}</h3>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">{t("report.noFactors")}</p>
      ) : (
        <div className="mt-4 space-y-5">
          {items.map((c, i) => {
            const score = Math.max(0, Math.min(100, Number(c.score) || 0));
            const color = scoreColor(score);
            const evidenceLever = c.lever === "evidence";
            return (
              <div key={`${c.name}-${i}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="flex flex-wrap items-center gap-1.5 text-sm text-fg/90">
                    {criterionLabel(c.name, t)}
                    <LeverChip lever={c.lever} />
                    <SpreadMarker spread={c.spread} />
                  </span>
                  <span
                    className="shrink-0 font-mono text-sm font-bold tabular-nums"
                    style={{ color }}
                    title={c.band ? `Banded ${c.band} by the model; the number is the code-side mapping.` : undefined}
                  >
                    {c.band ? `${c.band} · ` : ""}
                    {score}/100
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${score}%`, background: color }}
                  />
                </div>
                {c.lever_action && (
                  <p className="mt-1.5 text-[11px] leading-snug text-muted">
                    {evidenceLever ? (
                      <span className="text-warn">→ test it, don&apos;t reword it: </span>
                    ) : (
                      <span className="text-muted/70">→ </span>
                    )}
                    {c.lever_action}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function FactorBars({ criteria }: { criteria: Criterion[] }) {
  const t = useT();
  const list = Array.isArray(criteria) ? criteria : [];
  const demand = list.filter((c) => c?.group === "demand");
  const build = list.filter((c) => c?.group === "build");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FactorColumn
        label={t("report.demandAndMarket")}
        title={t("report.willPeopleBuy")}
        items={demand}
      />
      <FactorColumn
        label={t("report.executionAndFit")}
        title={t("report.canYouWin")}
        items={build}
      />
    </div>
  );
}
