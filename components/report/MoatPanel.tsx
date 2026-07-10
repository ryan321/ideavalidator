"use client";

import type { Validation } from "@/lib/generators/validation";
import type { TranslateFn } from "@/lib/i18n/t";
import { useT } from "../LocaleProvider";

// Defensibility, graded honest-to-zero. Most pre-launch ideas have no moat — this
// panel says so plainly (that's a finding, not an insult) and shows the 1-3 concrete,
// checkable conditions that would EARN one. Those conditions are exactly what the
// wedge explorer / refine loop should aim at next.

function gradeStyle(grade: string, t: TranslateFn): { label: string; cls: string } {
  const map: Record<string, { label: string; cls: string }> = {
    none: { label: t("report.moatGradeNone"), cls: "border-border bg-panel2 text-muted" },
    weak: { label: t("report.moatGradeWeak"), cls: "border-warn/40 bg-warn/10 text-warn" },
    plausible: {
      label: t("report.moatGradePlausible"),
      cls: "border-accent2/40 bg-accent2/10 text-accent2",
    },
    strong: { label: t("report.moatGradeStrong"), cls: "border-good/40 bg-good/10 text-good" },
  };
  return map[grade] ?? map.none;
}

/** Map machine moat type keys to localized labels. */
function prettyType(type: string, t: TranslateFn): string {
  const key = type.toLowerCase().replace(/\s+/g, "_");
  const map: Record<string, string> = {
    network_effects: t("report.moatTypeNetworkEffects"),
    switching_costs: t("report.moatTypeSwitchingCosts"),
    proprietary_data: t("report.moatTypeProprietaryData"),
    distribution: t("report.moatTypeDistribution"),
    regulatory: t("report.moatTypeRegulatory"),
    brand: t("report.moatTypeBrand"),
    scale_economies: t("report.moatTypeScaleEconomies"),
  };
  if (map[key]) return map[key];
  const s = type.replace(/_/g, " ").trim();
  return s ? s[0].toUpperCase() + s.slice(1) : type;
}

export function MoatPanel({ moat }: { moat: NonNullable<Validation["moat"]> }) {
  const t = useT();
  const paths = (moat.paths ?? []).filter((p) => p.type);
  const toBuild = (moat.to_build ?? []).filter((p) => p.becomes_true);
  if (!moat.today && !paths.length && !toBuild.length) return null;

  return (
    <div>
      <div className="mb-2.5 flex items-baseline justify-between gap-2 font-mono text-sm uppercase tracking-[0.1em] text-muted">
        {t("report.defensibility")}
        <span className="text-[10px] normal-case tracking-normal">{t("report.moatHonestHint")}</span>
      </div>

      {moat.today && (
        <p className="mb-3 rounded-lg border border-border/70 bg-panel/40 p-3.5 text-sm leading-relaxed text-fg/90">
          <span className="font-semibold text-fg">{t("report.whatStopsCopycat")} </span>
          {moat.today}
        </p>
      )}

      {paths.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border/70">
          {paths.map((p, i) => {
            const g = gradeStyle(p.grade, t);
            return (
              <div
                key={i}
                className={`flex flex-wrap items-baseline gap-x-3 gap-y-1 px-3.5 py-2 ${i % 2 ? "bg-panel/40" : "bg-panel/70"}`}
              >
                <span className="w-36 shrink-0 text-sm font-medium text-fg/90">
                  {prettyType(p.type, t)}
                </span>
                <span
                  className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${g.cls}`}
                >
                  {g.label}
                </span>
                {p.note && (
                  <span className="min-w-0 flex-1 text-xs leading-relaxed text-muted">{p.note}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toBuild.length > 0 && (
        <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-3.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
            {t("report.whatToEarnMoat")}
          </div>
          <ul className="mt-2 space-y-1.5">
            {toBuild.map((p, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-fg/90">
                <span className="mt-px shrink-0 font-mono text-xs text-accent" aria-hidden>
                  →
                </span>
                <span>
                  {p.path && <b className="text-fg">{prettyType(p.path, t)}: </b>}
                  {p.becomes_true}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
