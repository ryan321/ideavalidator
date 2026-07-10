"use client";

import type { Lever } from "@/lib/scoring";
import { leverLabel } from "@/lib/i18n/t";
import { useT } from "../LocaleProvider";

// Shared report chips: the lever tag on a criterion (positioning | evidence |
// execution | exogenous) and the Mom-Test evidence tier chip (T1 money/behavior …
// T4 compliment). One definition each so the scorecard, factor bars, evidence panel,
// and claims audit all read the same vocabulary.

// Lever → chip color. evidence is amber (route it to the kill-test, don't reword it);
// the rest are neutral-with-accent so they read as "fixable in the room".
const LEVER_STYLE: Record<Lever, string> = {
  positioning: "border-accent/30 bg-accent/10 text-accent",
  evidence: "border-warn/40 bg-warn/10 text-warn",
  execution: "border-accent2/30 bg-accent2/10 text-accent2",
  exogenous: "border-border bg-panel2 text-muted",
};

/** The lever chip for one criterion: names the force that could move it (localized). */
export function LeverChip({ lever }: { lever?: string | null }) {
  const t = useT();
  if (!lever || !(lever in LEVER_STYLE)) return null;
  const l = lever as Lever;
  const m = leverLabel(l, t);
  if (!m) return null;
  return (
    <span
      className={`inline-block shrink-0 rounded-full border px-1.5 py-px font-mono text-[9px] tracking-wide ${LEVER_STYLE[l]}`}
      title={t("report.leverPrefix", { help: m.help })}
    >
      {m.label}
    </span>
  );
}

// Mom-Test evidence tiers: what the item actually SHOWS, not how nice it sounds.
const TIER_CLS: Record<1 | 2 | 3 | 4, string> = {
  1: "border-good/40 bg-good/10 text-good",
  2: "border-accent2/40 bg-accent2/10 text-accent2",
  3: "border-border bg-panel2 text-muted",
  4: "border-border/60 bg-transparent text-muted/60",
};

function tierMeta(tier: 1 | 2 | 3 | 4, tr: ReturnType<typeof useT>) {
  const labels = {
    1: { label: tr("report.tier1"), help: tr("report.tier1Help") },
    2: { label: tr("report.tier2"), help: tr("report.tier2Help") },
    3: { label: tr("report.tier3"), help: tr("report.tier3Help") },
    4: { label: tr("report.tier4"), help: tr("report.tier4Help") },
  } as const;
  return { ...labels[tier], cls: TIER_CLS[tier] };
}

/** The evidence-tier chip. Old corpora lack a tier — default to 3 so nothing crashes.
 * `compact` drops the words, showing just "T1". */
export function TierChip({ tier, compact = false }: { tier?: 1 | 2 | 3 | 4 | null; compact?: boolean }) {
  const tr = useT();
  const t = (tier ?? 3) as 1 | 2 | 3 | 4;
  const m = tierMeta(t, tr);
  return (
    <span
      className={`inline-block shrink-0 rounded-full border px-1.5 py-px font-mono text-[9px] uppercase tracking-wide ${m.cls}`}
      title={m.help}
    >
      {compact ? `T${t}` : m.label}
    </span>
  );
}

// A one-line legend for the four tiers — rendered once above a tiered list.
export function TierLegend({ className = "" }: { className?: string }) {
  const tr = useT();
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      <span className="font-mono text-[9px] uppercase tracking-wide text-muted/70">
        {tr("report.momTestTiers")}
      </span>
      {([1, 2, 3, 4] as const).map((tier) => {
        const m = tierMeta(tier, tr);
        return (
          <span key={tier} className="font-mono text-[9px] text-muted" title={m.help}>
            {m.label}
          </span>
        );
      })}
    </div>
  );
}
