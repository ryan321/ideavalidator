"use client";

import { criterionLabel } from "@/lib/i18n/t";
import { CRITERIA } from "@/lib/scoring";
import { useT } from "../LocaleProvider";

// The per-criterion delta view for the version-compare table: for each of the 10
// criteria, the baseline version's score and every other version's movement vs it
// (↑ green / ↓ red / — flat), read client-side from each version's stored artifact.
// This is where a refine loop's real work shows — which criteria a new version actually
// moved, not just the headline number.

type CriteriaMap = Record<string, number>;

export type DeltaVersion = {
  id: string;
  n: number;
  label?: string | null;
  criteria: CriteriaMap; // criterion name → numeric score
};

function DeltaCell({ base, score }: { base: number | undefined; score: number | undefined }) {
  if (score == null) return <span className="text-muted/50">—</span>;
  if (base == null) return <span className="font-mono tabular-nums text-fg/80">{score}</span>;
  const d = score - base;
  if (d === 0) return <span className="font-mono tabular-nums text-muted">{score} <span className="text-muted/50">·0</span></span>;
  const up = d > 0;
  return (
    <span className="font-mono tabular-nums" style={{ color: up ? "var(--color-good)" : "var(--color-bad)" }}>
      {score} <span className="text-[10px]">{up ? "↑" : "↓"}{Math.abs(d)}</span>
    </span>
  );
}

export function CriteriaDeltaTable({ versions }: { versions: DeltaVersion[] }) {
  const t = useT();
  // Need a baseline plus at least one other scored version to show deltas.
  if (versions.length < 2) return null;
  // Baseline = earliest version (smallest n) — the origin every later try refined from.
  const ordered = [...versions].sort((a, b) => a.n - b.n);
  const baseline = ordered[0];
  const rest = ordered.slice(1);

  return (
    <div className="border-t border-border">
      <div className="px-3 pt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
        {t("report.perCriterionDelta", { n: baseline.n })}
      </div>
      <div className="overflow-x-auto p-3">
        <table className="w-full min-w-[520px] text-xs">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wide text-muted">
              <th className="px-2 py-1.5 font-medium">{t("report.criterion")}</th>
              <th className="px-2 py-1.5 text-right font-medium">v{baseline.n}</th>
              {rest.map((v) => (
                <th key={v.id} className="px-2 py-1.5 text-right font-medium">v{v.n}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CRITERIA.map((name) => {
              const base = baseline.criteria[name];
              return (
                <tr key={name} className="border-b border-border/50 last:border-0">
                  <td className="px-2 py-1.5 text-fg/80">{criterionLabel(name, t)}</td>
                  <td className="px-2 py-1.5 text-right">
                    <DeltaCell base={undefined} score={base} />
                  </td>
                  {rest.map((v) => (
                    <td key={v.id} className="px-2 py-1.5 text-right">
                      <DeltaCell base={base} score={v.criteria[name]} />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
