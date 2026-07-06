"use client";

// The masthead instrument: verdict + score in a box beside the idea, above the fold.
// This is the ONE place the number leads on screen — the readout below renders its
// hero compact (compactHero) so the score is stated prominently exactly once.

export function VerdictBox({
  verdict,
  score,
  sd,
  color,
  confidence,
  revenue,
  borderline,
  insufficient,
}: {
  verdict: string;
  score: number;
  sd: number;
  color: string;
  confidence?: number | null;
  revenue?: string | null;
  /** Name of the goal line the score sits within ±sd of ("GO" | "MAYBE"), if any. */
  borderline?: string | null;
  insufficient?: boolean;
}) {
  return (
    <a
      href="#verdict"
      title="Jump to the full validation readout"
      className="flex flex-col justify-between rounded-xl border bg-gradient-to-b from-panel2 to-panel p-4 transition hover:brightness-110"
      style={{ borderColor: `color-mix(in srgb, ${color} 30%, var(--color-border))` }}
    >
      <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        <span>Verdict</span>
        {typeof confidence === "number" && (
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            {confidence}%
          </span>
        )}
      </div>

      <div className="mt-2">
        <div className={`font-display font-bold leading-none tracking-tight ${insufficient ? "text-xl" : "text-4xl"}`} style={{ color }}>
          {verdict}
        </div>
        <div className="mt-1.5 font-mono text-lg font-bold tabular-nums" style={{ color }}>
          {Math.round(score)}
          <span className="text-sm font-semibold text-muted"> ± {sd}</span>
          <span className="text-sm text-muted">/100</span>
        </div>
        {borderline && !insufficient && (
          <div className="mt-1.5 inline-block rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-warn">
            borderline · ±{sd} of the {borderline} line
          </div>
        )}
      </div>

      {revenue && (
        <div className="mt-3 border-t border-border/60 pt-2.5">
          <div className="font-mono text-lg font-bold leading-tight text-accent2 [overflow-wrap:anywhere]">{revenue}</div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">obtainable / yr</div>
        </div>
      )}
    </a>
  );
}
