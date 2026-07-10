"use client";

import { Card, Section } from "@/components/ui";
import type { TranslateFn } from "@/lib/i18n/t";
import { useT } from "../LocaleProvider";

type RiskCategory = "tech" | "market" | "financial";

type Risk = {
  title: string;
  category: RiskCategory;
  probability: number;
  impact: number;
  mitigation: string;
};

const CATEGORY_COLOR: Record<RiskCategory, string> = {
  tech: "var(--color-accent)",
  market: "var(--color-warn)",
  financial: "var(--color-bad)",
};

function categoryLabel(c: RiskCategory, t: TranslateFn): string {
  switch (c) {
    case "tech":
      return t("report.riskCatTech");
    case "market":
      return t("report.riskCatMarket");
    case "financial":
      return t("report.riskCatFinancial");
    default:
      return c;
  }
}

const clamp = (n: number) => Math.max(1, Math.min(5, Math.round(Number.isFinite(n) ? n : 1)));

// Tint a cell from greenish (low prob*impact) to reddish (high prob*impact).
// Hue goes 130 (green) → 0 (red) as the product scales from 1..25.
function cellTint(probability: number, impact: number): string {
  const product = probability * impact; // 1..25
  const t = (product - 1) / 24; // 0..1
  const hue = 130 - 130 * t; // 130..0
  const opacity = 0.12 + 0.33 * t; // subtle on dark theme
  return `hsl(${hue.toFixed(0)} 70% 45% / ${opacity.toFixed(3)})`;
}

export function RiskMatrix({ risks }: { risks: Risk[] }) {
  const t = useT();
  const list = Array.isArray(risks) ? risks : [];

  // Build a lookup of risks per cell, keyed by `${probability}-${impact}`.
  const cellRisks = new Map<string, Risk[]>();
  for (const r of list) {
    if (!r) continue;
    const p = clamp(r.probability);
    const i = clamp(r.impact);
    const key = `${p}-${i}`;
    const arr = cellRisks.get(key);
    if (arr) arr.push(r);
    else cellRisks.set(key, [r]);
  }

  // Rows: probability 5 (top) → 1 (bottom). Cols: impact 1 (left) → 5 (right).
  const rows = [5, 4, 3, 2, 1];
  const cols = [1, 2, 3, 4, 5];

  return (
    <Section title={t("report.riskMap")}>
      <p className="mb-4 text-xs text-muted">{t("report.riskMatrixBlurb")}</p>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* LEFT: heatmap */}
        <Card className="bg-panel2">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
            {t("report.riskMatrix")}
          </div>

          <div className="flex gap-2">
            {/* Y-axis label */}
            <div className="flex items-center">
              <span className="rotate-180 text-[10px] text-muted [writing-mode:vertical-rl]">
                {t("report.probabilityAxis")}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="keep-color grid grid-cols-5 gap-1">
                {rows.map((p) =>
                  cols.map((i) => {
                    const key = `${p}-${i}`;
                    const here = cellRisks.get(key) ?? [];
                    return (
                      <div
                        key={key}
                        className="relative aspect-square rounded-md border border-border"
                        style={{ background: cellTint(p, i) }}
                        title={t("report.riskPI", { p, i })}
                      >
                        {here.length > 0 && (
                          <div className="absolute inset-0 flex flex-wrap content-center items-center justify-center gap-0.5 p-0.5">
                            {here.slice(0, 6).map((r, idx) => (
                              <span
                                key={idx}
                                className="h-2.5 w-2.5 rounded-full ring-1 ring-black/40"
                                style={{
                                  background:
                                    CATEGORY_COLOR[r.category] ?? "var(--color-muted)",
                                }}
                                title={r.title}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* X-axis label */}
              <div className="mt-2 text-center text-[10px] text-muted">
                {t("report.impactAxis")}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="keep-color mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
            {(Object.keys(CATEGORY_COLOR) as RiskCategory[]).map((c) => (
              <span key={c} className="flex items-center gap-1.5 text-[11px] text-muted">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: CATEGORY_COLOR[c] }}
                />
                {categoryLabel(c, t)}
              </span>
            ))}
          </div>
        </Card>

        {/* RIGHT: risk list */}
        <Card className="bg-panel2">
          <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted">
            {t("report.risksList")}
          </div>

          {list.length === 0 ? (
            <p className="text-sm text-muted">{t("report.noRisks")}</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {list.map((r, idx) => {
                const color = CATEGORY_COLOR[r?.category] ?? "var(--color-muted)";
                const p = clamp(r?.probability ?? 1);
                const i = clamp(r?.impact ?? 1);
                return (
                  <li
                    key={idx}
                    className="flex gap-3 rounded-lg border border-border bg-panel p-3"
                  >
                    <span
                      className="keep-color mt-0.5 h-3 w-3 flex-none rounded-full ring-1 ring-black/40"
                      style={{ background: color }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-semibold text-fg">
                          {r?.title ?? t("report.untitledRisk")}
                        </span>
                        <span className="font-mono text-xs text-muted">
                          {t("report.riskPI", { p, i })}
                        </span>
                      </div>
                      {r?.mitigation && (
                        <p className="mt-1 text-xs text-muted">
                          {t("report.mitigation")} {r.mitigation}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </Section>
  );
}
