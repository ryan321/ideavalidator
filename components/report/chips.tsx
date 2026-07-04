import { LEVER_MEANING, type Lever } from "@/lib/scoring";

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

/** The lever chip for one criterion: names the force that could move it, with the
 * LEVER_MEANING taxonomy in the tooltip. */
export function LeverChip({ lever }: { lever?: string | null }) {
  if (!lever || !(lever in LEVER_STYLE)) return null;
  const l = lever as Lever;
  return (
    <span
      className={`inline-block shrink-0 rounded-full border px-1.5 py-px font-mono text-[9px] uppercase tracking-wide ${LEVER_STYLE[l]}`}
      title={`Lever — ${LEVER_MEANING[l]}`}
    >
      {l}
    </span>
  );
}

// Mom-Test evidence tiers: what the item actually SHOWS, not how nice it sounds.
export const TIER_META: Record<1 | 2 | 3 | 4, { label: string; help: string; cls: string }> = {
  1: { label: "T1 · money/behavior", help: "Tier 1 — money or behavior actually changed (paid, switched, built a workaround). Weighs heaviest.", cls: "border-good/40 bg-good/10 text-good" },
  2: { label: "T2 · commitment", help: "Tier 2 — a costly commitment (time, reputation, a waitlist deposit). Weighs heavily.", cls: "border-accent2/40 bg-accent2/10 text-accent2" },
  3: { label: "T3 · past fact", help: "Tier 3 — a specific past fact or complaint. A real but weaker signal.", cls: "border-border bg-panel2 text-muted" },
  4: { label: "T4 · compliment", help: "Tier 4 — a compliment or hypothetical (\"I'd totally buy that\"). Weighs ≈ zero.", cls: "border-border/60 bg-transparent text-muted/60" },
};

/** The evidence-tier chip. Old corpora lack a tier — default to 3 so nothing crashes.
 * `compact` drops the words, showing just "T1". */
export function TierChip({ tier, compact = false }: { tier?: 1 | 2 | 3 | 4 | null; compact?: boolean }) {
  const t = (tier ?? 3) as 1 | 2 | 3 | 4;
  const m = TIER_META[t];
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
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      <span className="font-mono text-[9px] uppercase tracking-wide text-muted/70">Mom-Test tiers:</span>
      {([1, 2, 3, 4] as const).map((t) => (
        <span key={t} className="font-mono text-[9px] text-muted" title={TIER_META[t].help}>
          {TIER_META[t].label}
        </span>
      ))}
    </div>
  );
}
