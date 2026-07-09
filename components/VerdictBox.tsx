"use client";

// The masthead instrument: verdict + score in a box beside the idea, above the fold.
// This is the ONE place the number leads on screen — the readout below renders its
// hero compact (compactHero) so the score is stated prominently exactly once.
//
// The ring is an honest gauge, not decoration: the arc is colored by the GOAL's
// verdict bands, tick marks sit at the real MAYBE/GO thresholds, and the ±SD
// run-to-run noise renders as a translucent halo around the score's position —
// the gauge itself admits the measurement's uncertainty.

/** Exported so DecisionCard can reuse the same honest gauge (ticks + ±SD halo). */
export function ScoreRing({
  score,
  sd,
  color,
  bands,
  insufficient,
}: {
  score: number;
  sd: number;
  color: string;
  bands: { go: number; maybe: number };
  insufficient?: boolean;
}) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  const arcLen = (v: number) => (C * clamp(v)) / 100;
  // a radial tick at value v (0-100 mapped to a full turn from 12 o'clock)
  const tick = (v: number, inner: number, outer: number) => {
    const a = (clamp(v) / 100) * 2 * Math.PI - Math.PI / 2;
    return {
      x1: 60 + inner * Math.cos(a),
      y1: 60 + inner * Math.sin(a),
      x2: 60 + outer * Math.cos(a),
      y2: 60 + outer * Math.sin(a),
    };
  };
  const noiseStart = clamp(score - sd);
  const noiseLen = arcLen(clamp(score + sd) - noiseStart);

  return (
    <div className="relative mx-auto h-[124px] w-[124px]">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        {/* track */}
        <circle cx="60" cy="60" r={R} fill="none" stroke="var(--color-border)" strokeWidth="5" opacity="0.6" />
        {/* ±SD noise halo around the score's position — uncertainty made visible */}
        {!insufficient && (
          <circle
            cx="60" cy="60" r={R} fill="none" stroke={color} strokeWidth="11" opacity="0.18"
            strokeDasharray={`${noiseLen} ${C}`} strokeDashoffset={-arcLen(noiseStart)}
          />
        )}
        {/* the score arc */}
        <circle
          cx="60" cy="60" r={R} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={`${arcLen(score)} ${C}`} opacity={insufficient ? 0.4 : 1}
        />
        {/* threshold ticks at the goal's real lines */}
        {[bands.maybe, bands.go].map((t, i) => {
          const l = tick(t, R - 6, R + 6);
          return (
            <line
              key={i} {...l}
              stroke={i === 1 ? "var(--color-good)" : "var(--color-warn)"}
              strokeWidth="2" opacity="0.8"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-mono text-3xl font-bold leading-none tabular-nums" style={{ color }}>
          {Math.round(score)}
        </div>
        <div className="mt-0.5 font-mono text-[10px] text-muted">± {sd} /100</div>
      </div>
    </div>
  );
}

export function VerdictBox({
  verdict,
  score,
  sd,
  color,
  bands,
  confidence,
  revenue,
  borderline,
  insufficient,
}: {
  verdict: string;
  score: number;
  sd: number;
  color: string;
  /** The goal's verdict thresholds — drawn as ticks on the ring. */
  bands: { go: number; maybe: number };
  confidence?: number | null;
  revenue?: string | null;
  /** Name of the goal line the score sits within ±sd of ("GO" | "MAYBE"), if any. */
  borderline?: string | null;
  insufficient?: boolean;
}) {
  return (
    <a
      href="#verdict"
      title={`Jump to the full validation readout — ring ticks mark this goal's MAYBE (${bands.maybe}) and GO (${bands.go}) lines; the halo is the ±${sd} run-to-run noise`}
      className="flex flex-col rounded-xl border bg-gradient-to-b from-panel2 to-panel p-4 transition hover:brightness-110"
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

      <div className="mt-3">
        <ScoreRing score={score} sd={sd} color={color} bands={bands} insufficient={insufficient} />
        <div
          className={`mt-2.5 text-center font-display font-bold leading-none tracking-tight ${insufficient ? "text-lg" : "text-3xl"}`}
          style={{ color }}
        >
          {verdict}
        </div>
        {borderline && !insufficient && (
          <div className="mt-2 text-center">
            <span className="inline-block rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-warn">
              borderline · ±{sd} of the {borderline} line
            </span>
          </div>
        )}
      </div>

      {revenue && (
        <div className="mt-auto border-t border-border/60 pt-2.5 text-center">
          <div className="font-mono text-lg font-bold leading-tight text-accent2 [overflow-wrap:anywhere]">{revenue}</div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">obtainable / yr</div>
        </div>
      )}
    </a>
  );
}
