"use client";

import { verdictLabel } from "@/lib/i18n/t";
import { useT } from "./LocaleProvider";

// The masthead instrument: verdict + score in a box beside the idea, above the fold.
// This is the ONE place the number leads on screen — the readout below renders its
// hero compact (compactHero) so the score is stated prominently exactly once.
//
// The ring is an honest gauge, not decoration: outer faded NO-GO/MAYBE/GO zones
// from the goal's verdict bands, solid score arc on the inner ring, ticks at the
// real MAYBE/GO thresholds.

/**
 * Calibrated score ring (same model as the linear VerdictMeter):
 *   outer ring — wide faded NO-GO / MAYBE / GO zones (the map)
 *   inner ring — solid score arc 0→N + tip (where you landed)
 *   center     — score number
 *   footer     — tiny color key (not on-arc chips)
 */
export function ScoreRing({
  score,
  color,
  bands,
  insufficient,
}: {
  score: number;
  /** @deprecated unused on this dial; kept optional so callers need not change. */
  sd?: number;
  color: string;
  bands: { go: number; maybe: number };
  insufficient?: boolean;
}) {
  const t = useT();
  // Concentric radii (viewBox 0–120, center 60,60)
  const R_ZONE = 48; // outer: zone map
  const R_SCORE = 36; // inner: solid score
  const ZONE_W = 11;
  const SCORE_W = 8.5; // score arc reads louder than the zone map
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  // Circumference at a given radius
  const circ = (r: number) => 2 * Math.PI * r;
  const arcLen = (r: number, v: number) => (circ(r) * clamp(v)) / 100;
  // 0–100 → angle from 12 o'clock, clockwise (screen coords, y-down).
  const ang = (v: number) => (clamp(v) / 100) * 2 * Math.PI - Math.PI / 2;
  const pt = (v: number, r: number) => {
    const a = ang(v);
    return { x: 60 + r * Math.cos(a), y: 60 + r * Math.sin(a) };
  };
  const tick = (v: number, inner: number, outer: number) => {
    const a = pt(v, inner);
    const b = pt(v, outer);
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  };
  // Circle strokes: dash origin is 3 o'clock; rotate -90 around center → 12 o'clock.
  const ringSpin = "rotate(-90 60 60)";

  const bandSeg = (
    r: number,
    from: number,
    to: number,
    stroke: string,
    width: number,
    opacity: number,
    key: string
  ) => {
    const f = clamp(from);
    const t = clamp(to);
    if (t <= f) return null;
    const c = circ(r);
    const len = arcLen(r, t) - arcLen(r, f);
    return (
      <circle
        key={key}
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={width}
        opacity={opacity}
        strokeDasharray={`${len} ${c - len}`}
        strokeDashoffset={-arcLen(r, f)}
        transform={ringSpin}
      />
    );
  };

  const s = clamp(score);
  const tip = pt(s, R_SCORE);

  // Zones stay as context — very faded so the solid score arc owns the dial
  const zoneNoGo = "color-mix(in srgb, var(--color-bad) 18%, transparent)";
  const zoneMaybe = "color-mix(in srgb, var(--color-warn) 20%, transparent)";
  const zoneGo = "color-mix(in srgb, var(--color-good) 18%, transparent)";

  const ringLabel = insufficient
    ? t("a11y.scoreRingInsufficient", { score: Math.round(score) })
    : t("a11y.scoreRing", {
        score: Math.round(score),
        maybe: bands.maybe,
        go: bands.go,
      });

  return (
    <div className="mx-auto flex w-[148px] flex-col items-center">
      <div
        className="relative h-[132px] w-[132px]"
        role="img"
        aria-label={ringLabel}
      >
        <svg viewBox="0 0 120 120" className="h-full w-full overflow-visible" aria-hidden>
          {/* ── outer: zone map ─────────────────────────────────────────── */}
          <circle
            cx="60"
            cy="60"
            r={R_ZONE}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={ZONE_W}
            opacity="0.22"
            transform={ringSpin}
          />
          {!insufficient && (
            <>
              {bandSeg(R_ZONE, 0, bands.maybe, zoneNoGo, ZONE_W, 1, "nogo")}
              {bandSeg(R_ZONE, bands.maybe, bands.go, zoneMaybe, ZONE_W, 1, "maybe")}
              {bandSeg(R_ZONE, bands.go, 100, zoneGo, ZONE_W, 1, "go")}
            </>
          )}

          {/* ── inner: solid score 0 → N ────────────────────────────────── */}
          <circle
            cx="60"
            cy="60"
            r={R_SCORE}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={SCORE_W}
            opacity="0.4"
            transform={ringSpin}
          />
          <circle
            cx="60"
            cy="60"
            r={R_SCORE}
            fill="none"
            stroke={insufficient ? "var(--color-muted)" : color}
            strokeWidth={SCORE_W}
            strokeLinecap="round"
            strokeDasharray={`${arcLen(R_SCORE, s)} ${circ(R_SCORE)}`}
            opacity={insufficient ? 0.45 : 1}
            transform={ringSpin}
          />

          {/* threshold ticks spanning outer → inner */}
          <line
            {...tick(bands.maybe, R_SCORE - SCORE_W / 2, R_ZONE + ZONE_W / 2)}
            stroke="var(--color-warn)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.9"
          />
          <line
            {...tick(bands.go, R_SCORE - SCORE_W / 2, R_ZONE + ZONE_W / 2)}
            stroke="var(--color-good)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* score tip — unmistakable end of the solid arc */}
          <circle
            cx={tip.x}
            cy={tip.y}
            r="5.5"
            fill={insufficient ? "var(--color-muted)" : color}
            stroke="var(--color-panel)"
            strokeWidth="2.5"
          />
        </svg>

        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <div
            className="font-mono text-3xl font-bold leading-none tabular-nums"
            style={{ color }}
          >
            {Math.round(score)}
          </div>
        </div>
      </div>

      {/* legend — color key under the dial, not chips on the arc */}
      {!insufficient && (
        <div
          className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide"
          aria-hidden
          title={`${t("verdict.noGo")} < ${bands.maybe} · ${t("verdict.maybe")} ${bands.maybe}–${bands.go - 1} · ${t("verdict.go")} ≥ ${bands.go}`}
        >
          <span className="inline-flex items-center gap-1 text-good">
            <span className="h-1.5 w-1.5 rounded-full bg-good/80" aria-hidden />
            {t("verdict.go")}
          </span>
          <span className="inline-flex items-center gap-1 text-warn">
            <span className="h-1.5 w-1.5 rounded-full bg-warn/80" aria-hidden />
            {t("verdict.maybe")}
          </span>
          <span className="inline-flex items-center gap-1 text-bad">
            <span className="h-1.5 w-1.5 rounded-full bg-bad/80" aria-hidden />
            {t("verdict.noGo")}
          </span>
        </div>
      )}
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
  /** Machine code (GO / MAYBE / NO-GO / INSUFFICIENT EVIDENCE) — display is localized. */
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
  const t = useT();
  const label = verdictLabel(verdict, t);
  return (
    <a
      href="#verdict"
      title={`Jump to the full validation readout — ring ticks mark this goal's MAYBE (${bands.maybe}) and GO (${bands.go}) lines; the halo is the ±${sd} run-to-run noise`}
      className="flex flex-col rounded-xl border bg-gradient-to-b from-panel2 to-panel p-4 transition hover:brightness-110"
      style={{ borderColor: `color-mix(in srgb, ${color} 30%, var(--color-border))` }}
    >
      <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
        <span>{t("report.verdict")}</span>
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
          {label}
        </div>
        {borderline && !insufficient && (
          <div className="mt-2 text-center">
            <span className="inline-block rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-warn">
              {t("verdict.borderlineOf", {
                sd,
                line: verdictLabel(borderline, t),
              })}
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
