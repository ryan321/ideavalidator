"use client";

import React, { useState } from "react";
import { Bullets, Card, Field, Prose, Section } from "./ui";
import type { Source } from "@/lib/ai/client";
import type { Validation } from "@/lib/generators/validation";
import type { Market } from "@/lib/generators/market";
import type { Plan } from "@/lib/generators/plan";
import type { Brand } from "@/lib/generators/brand";
import type { Logo } from "@/lib/generators/logo";
import type { Marketing } from "@/lib/generators/marketing";
import type { CustomerPitch } from "@/lib/generators/customer_pitch";
import type { Pitch } from "@/lib/generators/pitch";
import type { Outreach } from "@/lib/generators/outreach";
import type { Promotion } from "@/lib/generators/promotion";

// Report subcomponents (built as standalone files).
import { CriteriaRadar } from "./report/CriteriaRadar";
import { FactorBars } from "./report/FactorBars";
import { ValidationSummary } from "./report/ValidationSummary";
import { ValidationScorecard } from "./report/ValidationScorecard";
import { RiskMatrix } from "./report/RiskMatrix";
import { MarketHeader } from "./report/MarketHeader";
import { MarketSizing } from "./report/MarketSizing";
import { MarketTrajectory } from "./report/MarketTrajectory";
import { MarketStage } from "./report/MarketStage";
import { DemandSignals } from "./report/DemandSignals";
import { CompetitiveLandscape } from "./report/CompetitiveLandscape";
import { TargetDiscovery } from "./report/TargetDiscovery";
import { FinancialsView } from "./report/FinancialsView";

export { FinancialsView };

function scoreColor(n: number): string {
  if (n >= 70) return "var(--color-good)";
  if (n >= 45) return "var(--color-warn)";
  return "var(--color-bad)";
}

// Plain-English calibration for the 0-100 score (already judged relative to the goal),
// so a founder knows whether the number is good without startup intuition.
function scoreBand(n: number): { label: string; hint: string } {
  if (n >= 70) return { label: "Strong signal", hint: "clears the bar for your goal — worth committing and moving to build/sell." };
  if (n >= 45) return { label: "Mixed", hint: "promising but not there yet — refine the weak criteria below, then re-validate." };
  return { label: "Weak as written", hint: "doesn't clear the bar for your goal — iterate hard or reconsider the wedge." };
}

export function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * c;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={8} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="48%" textAnchor="middle" fontSize={size * 0.28} fontWeight={700} fill={color} fontFamily="var(--font-mono)">
        {Math.round(score)}
      </text>
      <text x="50%" y="66%" textAnchor="middle" fontSize={size * 0.1} fill="var(--color-muted)">
        / 100
      </text>
    </svg>
  );
}

export function SourcesList({ sources }: { sources: Source[] }) {
  if (!sources?.length) return null;
  return (
    <Section title={`Sources (${sources.length})`}>
      <ul className="space-y-1">
        {sources.map((s, i) => (
          <li key={i} className="truncate text-sm">
            <a href={s.url} target="_blank" rel="noreferrer" className="text-accent2 hover:underline">
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// Defense-in-depth for model-generated SVG rendered via dangerouslySetInnerHTML.
// Strip active/embedding elements and any vector for script execution or remote loads.
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<\s*(script|foreignObject|iframe|a|image|use|set|animate\w*)\b[\s\S]*?<\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|foreignObject|iframe|a|image|use|set|animate\w*)\b[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "") // quoted event handlers
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "") // unquoted event handlers
    .replace(/(href|xlink:href)\s*=\s*(["'])\s*(javascript|data):[^"']*\2/gi, "") // dangerous URLs
    .replace(/(href|xlink:href)\s*=\s*(["'])\s*(https?:)?\/\/[^"']*\2/gi, "") // external refs
    .replace(/url\(\s*['"]?\s*(https?:)?\/\/[^)]*\)/gi, "none"); // external url() refs
}

export function SvgLogo({ svg }: { svg: string }) {
  return (
    <div
      className="grid h-44 w-44 place-items-center rounded-xl border border-border bg-white p-3 [&_svg]:h-full [&_svg]:w-full"
      dangerouslySetInnerHTML={{ __html: sanitizeSvg(svg) }}
    />
  );
}

// ---- Validation (composed) ---------------------------------------------------

// good if value===good, warn if ===mid, else bad.
function tone3(value: string, good: string, mid: string): string {
  return value === good
    ? "var(--color-good)"
    : value === mid
      ? "var(--color-warn)"
      : "var(--color-bad)";
}

// A borderless metric cell — sits inside a gap-px hairline grid so the report
// reads as instrument panels, not a stack of equally-weighted bordered cards.
function Metric({ label, value, color, hint }: { label: string; value: string; color?: string; hint?: string }) {
  return (
    <div className="bg-panel px-3.5 py-3" title={hint}>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</div>
      <div
        className="mt-1 text-sm font-semibold leading-snug [overflow-wrap:anywhere]"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

// The editorial spine: a numbered eyebrow + a hairline rule. Replaces bordered
// section cards so the eye gets anchors, not boxes.
function SectionHead({ n, title, id, hint }: { n: string; title: string; id?: string; hint?: string }) {
  return (
    <div id={id} className="mb-5 flex items-center gap-3 scroll-mt-20">
      <span className="font-mono text-sm font-semibold tabular-nums text-accent2">{n}</span>
      <h2 className="font-display text-xl font-semibold uppercase tracking-[0.06em] text-fg">{title}</h2>
      <div className="h-px flex-1 bg-border" />
      {hint && <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:block">{hint}</span>}
    </div>
  );
}

// The headline reads, as one divided instrument strip (not four cards).
function DimensionStrip({ dims }: { dims: { label: string; value: string; color?: string; hint?: string }[] }) {
  if (!dims.length) return null;
  return (
    <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
      {dims.map((d) => (
        <Metric key={d.label} label={d.label} value={d.value} color={d.color} hint={d.hint} />
      ))}
    </div>
  );
}

// Compact, promoted strengths / risks — the most actionable read, pulled up out
// of the collapsed scorecard.
function MiniSignals({ tone, label, items }: { tone: "good" | "warn"; label: string; items: { text: string; category?: string }[] }) {
  const cls = tone === "good" ? "text-good" : "text-warn";
  const mark = tone === "good" ? "+" : "!";
  if (!items.length) return null;
  return (
    <div>
      <div className={`mb-2.5 font-mono text-sm uppercase tracking-[0.1em] ${cls}`}>{label}</div>
      <ul className="space-y-2.5">
        {items.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-sm leading-snug">
            <span className={`mt-px font-mono font-bold ${cls}`} aria-hidden>{mark}</span>
            <span className="text-fg/90">
              {s.text}
              {s.category ? <span className="ml-1.5 font-mono text-[10px] uppercase tracking-wide text-muted">· {s.category}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PainkillerTag({ verdict }: { verdict: "Painkiller" | "Vitamin" }) {
  const pain = verdict === "Painkiller";
  const c = pain ? "var(--color-good)" : "var(--color-warn)";
  return (
    <span
      className="shrink-0 rounded-full border px-3 py-1 text-xs font-bold"
      title={pain
        ? "Painkiller — solves an urgent, must-fix pain people already pay to relieve. Easier to sell."
        : "Vitamin — a nice-to-have improvement. Real, but harder to sell because no one is forced to act."}
      style={{ color: c, borderColor: `color-mix(in srgb, ${c} 40%, transparent)`, background: `color-mix(in srgb, ${c} 8%, transparent)` }}
    >
      {pain ? "💊 Painkiller" : "🟡 Vitamin"}
    </span>
  );
}

// Signature instrument: a calibrated 0-100 verdict meter. The three zones are the
// REAL scoring thresholds (NO-GO <45, MAYBE 45-69, GO ≥70), with a needle at the
// score — so the founder reads not just "59" but "59, in MAYBE, 11 below the GO line".
function VerdictMeter({ score }: { score: number }) {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const pos = Math.max(5, Math.min(95, s)); // keep the needle chip on-canvas at extremes
  const color = scoreColor(s);
  const toGo = s >= 70 ? null : 70 - s;
  return (
    <div className="keep-color">
      {/* score needle + chip */}
      <div className="relative h-7">
        <div className="absolute -translate-x-1/2 text-center" style={{ left: `${pos}%` }}>
          <span
            className="inline-block rounded-md px-2 py-0.5 font-mono text-sm font-bold tabular-nums"
            style={{
              color,
              background: `color-mix(in srgb, ${color} 16%, transparent)`,
              border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
            }}
          >
            {s}
          </span>
          <div className="mx-auto h-2 w-px" style={{ background: color }} />
        </div>
      </div>
      {/* the calibrated track */}
      <div className="relative h-2.5">
        <div className="absolute inset-0 flex overflow-hidden rounded-full">
          <div style={{ width: "45%", background: "color-mix(in srgb, var(--color-bad) 30%, transparent)" }} />
          <div style={{ width: "25%", background: "color-mix(in srgb, var(--color-warn) 30%, transparent)" }} />
          <div style={{ width: "30%", background: "color-mix(in srgb, var(--color-good) 30%, transparent)" }} />
        </div>
        {/* GO line */}
        <div className="absolute -top-1 -bottom-1 w-px bg-fg/40" style={{ left: "70%" }} />
        {/* needle on the track */}
        <div
          className="absolute -top-1 -bottom-1 w-[3px] rounded"
          style={{ left: `${pos}%`, transform: "translateX(-1.5px)", background: color, boxShadow: "0 0 0 2px var(--color-panel)" }}
        />
      </div>
      {/* zone labels under their bands */}
      <div className="relative mt-1.5 h-3 font-mono text-[10px] uppercase tracking-wider">
        <span className="absolute -translate-x-1/2 text-bad/70" style={{ left: "22.5%" }}>No-go</span>
        <span className="absolute -translate-x-1/2 text-warn/80" style={{ left: "57.5%" }}>Maybe</span>
        <span className="absolute -translate-x-1/2 text-good/80" style={{ left: "85%" }}>Go · 70+</span>
      </div>
      <div className="mt-2.5 font-mono text-xs" style={{ color }}>
        {toGo != null
          ? `${toGo} point${toGo === 1 ? "" : "s"} below the GO line`
          : `clears the GO line`}
      </div>
    </div>
  );
}

// Lead with the gist: clamp long prose to three lines and keep the rest one
// click away, so the report doesn't open as a wall of text.
function ClampText({ text, className = "" }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > 170;
  return (
    <div className={className}>
      <p className={open || !long ? "leading-relaxed" : "line-clamp-3 leading-relaxed"}>{text}</p>
      {long && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="mt-1 font-mono text-[11px] uppercase tracking-wide text-accent2 hover:underline"
        >
          {open ? "− Less" : "+ More"}
        </button>
      )}
    </div>
  );
}

export function ValidationView({ d }: { d: Validation }) {
  const navLink =
    "rounded-md px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide text-muted transition hover:bg-panel2 hover:text-fg";
  const color = scoreColor(d.score);
  const band = scoreBand(d.score);

  // only show a section (and its nav link) when it actually has content — a partial
  // analysis shouldn't leave a nav link that jumps to a blank section.
  const m = d.market;
  const showMarket = !!m && !!(
    m.sizing?.tam?.value || m.sizing?.sam?.value || m.sizing?.som?.value ||
    m.search_trend?.note || m.momentum || m.competitors?.length || m.demand_signals?.length
  );
  const f = d.financials;
  const showMoney = !!f && !!(
    f.startup_cost || f.revenue_model || f.unit_economics?.cac || f.unit_economics?.ltv ||
    f.unit_economics?.payback || f.projections?.length
  );
  const pl = d.plan;
  const showPlan = !!pl && !!(pl.milestones?.length || pl.team_and_ops);

  // the four headline reads → one divided strip
  const dims: { label: string; value: string; color?: string; hint?: string }[] = [];
  if (d.demand) dims.push({ label: "Demand", value: d.demand.strength, color: tone3(d.demand.strength, "Strong", "Moderate"), hint: "How strongly the target wants this." });
  if (d.demand) dims.push({ label: "Will pay", value: d.demand.willingness_to_pay, hint: "What they'll realistically pay." });
  if (d.operating) dims.push({ label: "Effort to run", value: d.operating.effort_level, color: tone3(d.operating.effort_level, "Low", "Medium"), hint: "Ongoing work to operate it." });
  if (d.acquisition) dims.push({ label: "Hard to sell", value: d.acquisition.difficulty, color: tone3(d.acquisition.difficulty, "Easy", "Moderate"), hint: "How hard it is to win each customer." });

  // promoted strengths / risks — the top items; the full lists stay in the scorecard.
  const strengths = [...(d.go_signals?.key_strengths ?? []), ...(d.go_signals?.positive_signals ?? [])].slice(0, 3);
  const risks = [...(d.stop_signals?.critical_risks ?? []), ...(d.stop_signals?.areas_of_concern ?? [])].slice(0, 3);

  const sens = d.demand?.sensitivity;
  const hasSens = !!sens && !!(sens.conservative || sens.optimistic);

  const narrativeRows: [string, string, string][] = d.narrative
    ? [
        ["Who feels it", d.narrative.who, ""],
        ["The pain", d.narrative.pain, ""],
        ["Today they", d.narrative.status_quo, "text-muted"],
        ["Cost of nothing", d.narrative.cost_of_inaction, "text-bad"],
        ["Your solution", d.narrative.solution, "text-accent"],
        ["After", d.narrative.after, "text-good"],
      ]
    : [];

  return (
    <div className="space-y-12">
      {/* on-this-report nav */}
      <nav className="no-print sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-1 border-b border-border bg-bg/85 px-1 py-2.5 backdrop-blur">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Report</span>
        <a href="#verdict" className={navLink}>Verdict</a>
        <a href="#brief" className={navLink}>Brief</a>
        {showMarket && <a href="#market" className={navLink}>Market</a>}
        {showMoney && <a href="#money" className={navLink}>Money</a>}
        {d.risk_matrix?.length ? <a href="#risks" className={navLink}>Risks</a> : null}
        {showPlan && <a href="#plan" className={navLink}>Plan</a>}
      </nav>

      {/* ============================ VERDICT (hero) ============================ */}
      <section id="verdict" className="scroll-mt-20 space-y-5">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-panel2 to-panel">
          {/* verdict-tinted top hairline — the only place the verdict color leads */}
          <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
          <div className="p-6 sm:p-7">
            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
              <span>Validation readout</span>
              <span className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                {d.confidence}% confidence
              </span>
            </div>

            <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
              <div className="min-w-0">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-5xl font-bold leading-none tracking-tight sm:text-6xl" style={{ color }}>
                    {d.verdict}
                  </span>
                  <span className="font-mono text-2xl font-bold tabular-nums" style={{ color }}>
                    {Math.round(d.score)}
                    <span className="text-base text-muted">/100</span>
                  </span>
                </div>
                <div className="mt-2.5 max-w-md text-sm leading-relaxed text-muted">
                  <b className="text-fg/80">{band.label}.</b> {band.hint}
                </div>
              </div>
              <div className="max-w-[15rem] text-right">
                <div className="font-mono text-2xl font-bold leading-tight text-accent2 [overflow-wrap:anywhere] sm:text-3xl">
                  {d.demand?.obtainable_revenue ?? "—"}
                </div>
                <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">obtainable / yr</div>
              </div>
            </div>

            <div className="mt-7">
              <VerdictMeter score={d.score} />
            </div>
          </div>

          {/* the four reads as the instrument footer */}
          <DimensionStrip dims={dims} />
        </div>

        {/* the read, in plain words — clamped so the verdict stays above the fold */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <ClampText text={d.summary} className="max-w-2xl text-[15px] text-fg/90" />
          {d.narrative && <PainkillerTag verdict={d.narrative.verdict} />}
        </div>
      </section>

      {/* ============================== THE BRIEF ============================== */}
      <section id="brief" className="scroll-mt-20">
        <SectionHead n="01" title="The brief" hint="what you need to know" />
        <div className="space-y-8">
          {/* thesis — the one-line painkiller read, always visible */}
          {d.narrative?.why && (
            <p className="max-w-3xl text-sm leading-relaxed text-fg/90">
              <b style={{ color: d.narrative.verdict === "Painkiller" ? "var(--color-good)" : "var(--color-warn)" }}>
                {d.narrative.verdict}:
              </b>{" "}
              {d.narrative.why}
            </p>
          )}

          {/* the actionable core, scannable — leads the brief */}
          {(strengths.length > 0 || risks.length > 0) && (
            <div className="grid gap-6 sm:grid-cols-2 sm:divide-x sm:divide-border">
              <div className="sm:pr-6"><MiniSignals tone="good" label="What's working" items={strengths} /></div>
              <div className="sm:pl-6"><MiniSignals tone="warn" label="What to watch" items={risks} /></div>
            </div>
          )}

          {d.demand && (
            <div>
              <div className="mb-3 font-mono text-sm uppercase tracking-[0.1em] text-muted">The number</div>
              {d.demand.math && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted">
                  <span className="text-fg/80" title="customers you can realistically reach">{d.demand.math.reachable}</span>
                  <span>reach ×</span>
                  <span className="text-fg/80" title="share/conversion you'd win">{d.demand.math.capture}</span>
                  <span>win ×</span>
                  <span className="text-fg/80" title="annual revenue per customer">{d.demand.math.price}</span>
                  <span>each ≈</span>
                  <span className="font-bold text-accent2">{d.demand.obtainable_revenue}</span>
                  <span>/yr</span>
                </div>
              )}
              {hasSens && (
                <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
                  <Metric label="Conservative" value={sens!.conservative || "—"} hint="If it goes worse than expected" />
                  <Metric label="Base" value={sens!.base || d.demand.obtainable_revenue || "—"} color="var(--color-accent2)" hint="The headline estimate" />
                  <Metric label="Optimistic" value={sens!.optimistic || "—"} hint="If it goes well" />
                </div>
              )}
              {d.demand.reasoning && <ClampText text={d.demand.reasoning} className="mt-3 max-w-2xl text-sm text-muted" />}
            </div>
          )}

          {/* full pain → solution breakdown — the heaviest block, collapsed by default */}
          {narrativeRows.length > 0 && (
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-mono text-[13px] uppercase tracking-[0.12em] text-muted hover:text-fg">
                <span className="transition group-open:rotate-90">▸</span>
                Why they&apos;ll buy — full pain → solution breakdown
              </summary>
              <div className="mt-4 grid max-w-3xl gap-x-6 gap-y-2.5 text-sm sm:grid-cols-[130px_minmax(0,1fr)]">
                {narrativeRows.map(([label, text, cls]) => (
                  <React.Fragment key={label}>
                    <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted sm:pt-0.5">{label}</div>
                    <div className={`leading-relaxed ${cls}`}>{text}</div>
                  </React.Fragment>
                ))}
              </div>
            </details>
          )}

          {d.goal_fit_note && (
            <div className="rounded-r-lg border-l-2 border-warn/50 bg-warn/5 px-4 py-3 text-sm">
              <span className="font-mono text-[13px] uppercase tracking-wide text-warn">Goal fit · </span>
              <span className="text-fg/90">{d.goal_fit_note}</span>
            </div>
          )}

          {d.clarifying_questions && d.clarifying_questions.length > 0 && (
            <div className="rounded-r-lg border-l-2 border-accent2/50 bg-accent2/5 px-4 py-3">
              <div className="mb-1.5 font-mono text-[13px] uppercase tracking-wide text-accent2">Open questions</div>
              <p className="mb-2 text-xs text-muted">Answer these via “💬 Discuss → Respond” to sharpen the next pass.</p>
              <ul className="space-y-1.5">
                {d.clarifying_questions.map((q, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-snug text-fg/90">
                    <span className="text-accent2" aria-hidden>?</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(d.operating || d.acquisition) && (
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-mono text-[13px] uppercase tracking-[0.12em] text-muted hover:text-fg">
                <span className="transition group-open:rotate-90">▸</span>
                How it runs &amp; how you sell
              </summary>
              <div className="mt-3 space-y-3 border-l border-border pl-4 text-sm leading-relaxed text-fg/90">
                {d.operating && (
                  <p>
                    <span className="font-mono text-[11px] uppercase tracking-wide text-muted">{d.operating.effort_level} effort · </span>
                    {d.operating.description}
                  </p>
                )}
                {d.acquisition && (
                  <p>
                    <span className="font-mono text-[11px] uppercase tracking-wide text-muted">{d.acquisition.difficulty} to sell · </span>
                    {d.acquisition.reasoning}
                  </p>
                )}
              </div>
            </details>
          )}
        </div>
      </section>

      {/* ============================ MARKET ============================ */}
      {showMarket && d.market && (
        <section id="market" className="scroll-mt-20">
          <SectionHead n="02" title="Market & competition" hint="proof the pain is real" />
          <div className="space-y-6">
            {d.market.sizing && (d.market.sizing.tam?.value || d.market.sizing.sam?.value || d.market.sizing.som?.value) && (
              <MarketSizing sizing={d.market.sizing} cagrPct={d.market.cagr_pct ?? 0} />
            )}

            {((d.market.search_trend && d.market.search_trend.note) || d.market.momentum) && (
              <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
                {d.market.search_trend && d.market.search_trend.note && (
                  <div className="bg-panel p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Search interest</div>
                    <div
                      className="mt-1 text-sm font-medium"
                      style={{
                        color:
                          d.market.search_trend.direction === "Rising"
                            ? "var(--color-good)"
                            : d.market.search_trend.direction === "Falling"
                              ? "var(--color-bad)"
                              : "var(--color-fg)",
                      }}
                    >
                      {d.market.search_trend.direction === "Rising" ? "↗ " : d.market.search_trend.direction === "Falling" ? "↘ " : "→ "}
                      {d.market.search_trend.note}
                    </div>
                    {d.market.search_trend.keyword && <div className="mt-0.5 font-mono text-[11px] text-muted">“{d.market.search_trend.keyword}”</div>}
                  </div>
                )}
                {d.market.momentum && (
                  <div className="bg-panel p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Recent momentum</div>
                    <p className="mt-1 text-sm text-fg/90">{d.market.momentum}</p>
                  </div>
                )}
              </div>
            )}

            {(d.market.competitors ?? []).length > 0 && (
              <div>
                <div className="mb-2.5 font-mono text-sm uppercase tracking-[0.1em] text-muted">Competitors</div>
                <div className="space-y-2">
                  {d.market.competitors!.map((c, i) => (
                    <div key={i} className="rounded-lg border border-border/70 bg-panel/40 p-4">
                      <div className="text-sm font-semibold">{c.name}</div>
                      {c.note && <p className="mt-1 text-sm text-muted">{c.note}</p>}
                      {c.complaint_theme && (
                        <p className="mt-1.5 text-xs">
                          <span className="font-semibold text-warn">Customers complain: </span>
                          <span className="text-fg/85">{c.complaint_theme}</span>
                        </p>
                      )}
                      {c.your_edge && (
                        <p className="mt-1 text-xs">
                          <span className="font-semibold text-accent">Your edge: </span>
                          <span className="text-fg/85">{c.your_edge}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(d.market.demand_signals ?? []).length > 0 && (
              <div>
                <div className="mb-1 font-mono text-sm uppercase tracking-[0.1em] text-muted">What people are actually saying</div>
                <p className="mb-2.5 text-xs text-muted">Real posts found while researching — the pain in their own words.</p>
                <div className="space-y-2">
                  {d.market.demand_signals!.map((s, i) => (
                    <div key={i} className="rounded-lg border border-border/70 bg-panel/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        {s.tag && (
                          <span className="rounded-full border border-accent2/30 bg-accent2/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent2">
                            {s.tag}
                          </span>
                        )}
                        {s.url ? (
                          <a href={s.url} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-accent2 hover:underline">
                            {s.source || "source"} ↗
                          </a>
                        ) : (
                          <span className="truncate text-xs text-muted">{s.source}</span>
                        )}
                      </div>
                      {s.quote && <p className="mt-1.5 text-sm leading-relaxed text-fg/90">“{s.quote}”</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============================ MONEY ============================ */}
      {showMoney && d.financials && (
        <section id="money" className="scroll-mt-20">
          <SectionHead n="03" title="Money" hint="the unit economics" />
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
            <Metric label="Startup cost" value={d.financials.startup_cost || "—"} />
            <Metric label="CAC" value={d.financials.unit_economics?.cac || "—"} hint="Cost to acquire a customer" />
            <Metric label="LTV" value={d.financials.unit_economics?.ltv || "—"} hint="Lifetime value of a customer" />
            <Metric label="Payback" value={d.financials.unit_economics?.payback || "—"} hint="Time to recoup acquisition cost" />
          </div>
          {d.financials.revenue_model && <p className="mt-3 text-sm text-muted">{d.financials.revenue_model}</p>}
          {(d.financials.projections ?? []).length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[28rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-left font-mono text-[11px] uppercase tracking-wide text-muted">
                    <th className="px-3 py-2 font-medium">Year</th>
                    <th className="px-3 py-2 font-medium">Revenue</th>
                    <th className="px-3 py-2 font-medium">Customers</th>
                    <th className="px-3 py-2 font-medium">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {d.financials.projections.map((p, i) => (
                    <tr key={i} className="border-b border-border/60 last:border-0">
                      <td className="px-3 py-2 align-top font-mono text-accent2">{p.year}</td>
                      <td className="px-3 py-2 align-top font-mono font-bold">{p.revenue}</td>
                      <td className="px-3 py-2 align-top text-muted">{p.customers}</td>
                      <td className="px-3 py-2 align-top text-xs text-muted">{p.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ============================ RISKS ============================ */}
      {d.risk_matrix?.length ? (
        <section id="risks" className="scroll-mt-20">
          <SectionHead n="04" title="Risks" hint="probability × impact" />
          <RiskMatrix risks={d.risk_matrix} />
          {d.downside && (
            <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
              <Metric label="Capital at risk" value={d.downside.capital_at_risk} />
              <Metric label="Liability" value={d.downside.liability} />
              <Metric label="If it fails" value={d.downside.if_it_fails} />
            </div>
          )}
        </section>
      ) : null}

      {/* ============================ PLAN ============================ */}
      {showPlan && d.plan && (
        <section id="plan" className="scroll-mt-20">
          <SectionHead n="05" title="Plan" hint="path to first revenue" />
          <ol className="space-y-2">
            {(d.plan.milestones ?? []).map((mi, i) => (
              <li key={i} className="flex gap-3 rounded-lg border border-border/70 bg-panel/40 p-3">
                <span className="mt-0.5 font-mono text-xs text-accent2">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <div className="text-sm font-semibold">{mi.title}</div>
                  <div className="mt-0.5 text-xs text-muted">
                    {mi.when}
                    {mi.metric ? ` · ${mi.metric}` : ""}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {d.plan.team_and_ops && (
            <p className="mt-3 text-sm text-muted">
              <span className="font-medium text-fg/80">Team &amp; ops: </span>
              {d.plan.team_and_ops}
            </p>
          )}
        </section>
      )}

      {/* ===================== full scorecard (the deep dive) ===================== */}
      <details className="group rounded-xl border border-border bg-panel/40">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 font-mono text-[13px] uppercase tracking-[0.12em] text-muted hover:text-fg">
          <span className="transition group-open:rotate-90">▸</span>
          Full scorecard &amp; signals — the evidence behind the score
        </summary>
        <div className="space-y-6 border-t border-border p-5">
          <Section title="Visual Overview">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <Card>
                <CriteriaRadar criteria={d.criteria} />
              </Card>
              <FactorBars criteria={d.criteria} />
            </div>
          </Section>
          <ValidationSummary go={d.go_signals} stop={d.stop_signals} />
          <ValidationScorecard validations={d.validations} criteria={d.criteria} />
        </div>
      </details>
    </div>
  );
}

// ---- Market (composed) -------------------------------------------------------

export function MarketView({ d }: { d: Market }) {
  return (
    <div className="space-y-8">
      <Prose>{d.summary}</Prose>
      <MarketHeader cagrLabel={d.cagr_label} maturity={d.maturity} competitorCount={d.competitors.length} />
      <MarketSizing sizing={d.sizing} cagrPct={d.cagr_pct} />
      <MarketTrajectory baseYear={d.trajectory.base_year} endYear={d.trajectory.end_year} cagrPct={d.cagr_pct} />
      <MarketStage
        maturity={d.maturity}
        maturityRationale={d.maturity_rationale}
        seasonality={d.seasonality}
        regions={d.regions}
      />
      <DemandSignals reddit={d.demand_signals.reddit} search={d.demand_signals.search_trends} />
      <CompetitiveLandscape competitors={d.competitors} />
      <TargetDiscovery persona={d.persona} discovery={d.discovery} />
      <Field label="Pricing recommendation" value={d.pricing_recommendation} />
    </div>
  );
}

// ---- Plan / Brand / Logo / Marketing / Pitch (unchanged schemas) -------------

export function PlanView({ d }: { d: Plan }) {
  const sections: [string, string][] = [
    ["Executive summary", d.executive_summary],
    ["Problem", d.problem],
    ["Solution", d.solution],
    ["Business model", d.business_model],
    ["Go-to-market", d.go_to_market],
    ["Team & operations", d.team_and_ops],
    ["Risks & mitigations", d.risks_and_mitigations],
  ];
  return (
    <div className="space-y-6">
      {sections.map(([title, body]) => (
        <Section key={title} title={title}>
          <Prose>{body}</Prose>
        </Section>
      ))}
      <Section title="Financials">
        <Card className="p-4">
          <Prose>{d.financials.summary}</Prose>
          <div className="mt-3">
            <Field label="Year 1 revenue" value={d.financials.year1_revenue} />
          </div>
          <div className="mt-3 text-xs font-medium text-muted">Assumptions</div>
          <Bullets items={d.financials.assumptions} />
        </Card>
      </Section>
      <Section title="Milestones">
        <div className="space-y-2">
          {d.milestones.map((m, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <span className="w-28 shrink-0 font-mono text-accent2">{m.when}</span>
              <span>{m.goal}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function BrandView({ d }: { d: Brand }) {
  return (
    <div>
      <Card className="mb-6 p-5">
        <div className="text-xs uppercase tracking-wide text-muted">Archetype</div>
        <div className="text-xl font-bold text-accent">{d.archetype.name}</div>
        <p className="mt-1 text-sm text-muted">{d.archetype.why}</p>
      </Card>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Mission" value={d.mission} />
        <Field label="Vision" value={d.vision} />
      </div>
      <div className="mt-6">
        <Field label="Value proposition" value={d.value_proposition} />
      </div>
      <div className="mt-6">
        <Field label="Positioning statement" value={d.positioning_statement} />
      </div>
      <Section title="Name ideas">
        <div className="mt-3 flex flex-wrap gap-2">
          {d.name_ideas.map((n, i) => (
            <span key={i} className="rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-xs text-accent">
              {n}
            </span>
          ))}
        </div>
      </Section>
      <Section title="Taglines">
        <Bullets items={d.tagline_options} />
      </Section>
      <div className="grid gap-6 sm:grid-cols-2">
        <Section title={`Voice — do (${d.tone})`}>
          <Bullets items={d.voice_dos} />
        </Section>
        <Section title="Voice — don't">
          <Bullets items={d.voice_donts} />
        </Section>
      </div>
    </div>
  );
}

export function LogoView({ d }: { d: Logo }) {
  return (
    <div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <SvgLogo svg={d.logo_svg} />
        <div className="flex-1">
          <div className="text-lg font-semibold">{d.wordmark}</div>
          <p className="mt-1 text-sm text-muted">{d.concept}</p>
        </div>
      </div>
      <Section title="Palette">
        <div className="mt-3 flex flex-wrap gap-3">
          {d.palette.map((c, i) => (
            <div key={i} className="w-32">
              <div className="h-16 rounded-lg border border-border" style={{ background: c.hex }} />
              <div className="mt-1 text-sm font-medium">{c.name}</div>
              <div className="font-mono text-xs text-muted">{c.hex}</div>
              <div className="text-xs text-muted">{c.usage}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Typography">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted">Heading</div>
            <div className="text-lg font-semibold">{d.typography.heading.font}</div>
            <p className="text-xs text-muted">{d.typography.heading.note}</p>
          </Card>
          <Card className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted">Body</div>
            <div className="text-lg font-semibold">{d.typography.body.font}</div>
            <p className="text-xs text-muted">{d.typography.body.note}</p>
          </Card>
        </div>
      </Section>
      <Section title="Usage notes">
        <Bullets items={d.usage_notes} />
      </Section>
    </div>
  );
}

export function MarketingView({ d }: { d: Marketing }) {
  return (
    <div>
      <Section title="Ad creatives">
        <div className="grid gap-3 sm:grid-cols-2">
          {d.ads.map((a, i) => (
            <Card key={i} className="p-4">
              <span className="rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-xs text-accent">
                {a.platform}
              </span>
              <div className="mt-2 text-sm font-semibold">{a.headline}</div>
              <p className="mt-1 text-sm text-muted">{a.primary_text}</p>
              <div className="mt-2 text-xs">
                <span className="text-accent">CTA:</span> {a.cta}
              </div>
              <div className="mt-1 text-xs text-muted">Visual: {a.visual_idea}</div>
            </Card>
          ))}
        </div>
      </Section>
      <Section title="Landing page copy">
        <Card className="p-5">
          <div className="text-xl font-bold">{d.landing_copy.hero_headline}</div>
          <p className="mt-1 text-sm text-muted">{d.landing_copy.subheadline}</p>
          <div className="mt-3">
            <Bullets items={d.landing_copy.bullets} />
          </div>
          <div className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">
            {d.landing_copy.cta}
          </div>
        </Card>
      </Section>
      <Section title="Email sequence">
        <div className="space-y-3">
          {d.email_sequence.map((e, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-xs text-accent">
                  {e.stage}
                </span>
                <span className="text-sm font-semibold">{e.subject}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{e.body}</p>
            </Card>
          ))}
        </div>
      </Section>
      <Section title="UGC scripts">
        <div className="space-y-3">
          {d.ugc_scripts.map((u, i) => (
            <Card key={i} className="p-4">
              <span className="rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-xs text-accent">
                {u.platform}
              </span>
              <div className="mt-2 text-sm font-semibold">Hook: {u.hook}</div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{u.script}</p>
              <div className="mt-1 text-xs">
                <span className="text-accent">CTA:</span> {u.cta}
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function PromotionView({ d }: { d: Promotion }) {
  return (
    <div className="space-y-5">
      <Card className="border-accent2/40 bg-accent2/5 p-4">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-accent2">Channel strategy</div>
        <p className="mt-1.5 text-sm text-fg/90">{d.channel_strategy}</p>
      </Card>

      <Section title="Where to show up">
        <div className="grid gap-3 sm:grid-cols-2">
          {d.channels.map((c, i) => (
            <Card key={i} className="p-4">
              <div className="text-sm font-semibold">{c.channel}</div>
              <p className="mt-1 text-sm text-muted">{c.why}</p>
              {c.first_move && (
                <p className="mt-2 text-xs">
                  <span className="font-semibold text-accent">First move: </span>
                  <span className="text-fg/85">{c.first_move}</span>
                </p>
              )}
            </Card>
          ))}
        </div>
      </Section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Section title="Stand this up">
          <Card className="p-4">
            <Bullets items={d.presence_checklist} />
          </Card>
        </Section>
        <Section title="Get the word out">
          <Card className="p-4">
            <Bullets items={d.launch_tactics} />
          </Card>
        </Section>
      </div>

      <Section title="What to post">
        <div className="space-y-2">
          {d.content_plan.map((c, i) => (
            <Card key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 p-3">
              <span className="text-sm font-semibold">{c.theme}</span>
              <span className="text-xs text-muted">{c.formats}</span>
              <span className="ml-auto rounded-full border border-border bg-panel2 px-2 py-0.5 font-mono text-[11px] text-muted">
                {c.cadence}
              </span>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function OutreachView({ d }: { d: Outreach }) {
  return (
    <div className="space-y-5">
      <Card className="border-accent2/40 bg-accent2/5 p-4">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-accent2">Channel strategy</div>
        <p className="mt-1.5 text-sm text-fg/90">{d.channel_strategy}</p>
      </Card>

      <Section title="Cold openers">
        <div className="space-y-3">
          {d.openers.map((o, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-xs text-accent">
                  {o.channel}
                </span>
                {o.why && <span className="text-[11px] text-muted">{o.why}</span>}
              </div>
              {o.subject && (
                <div className="mt-2 text-sm">
                  <span className="text-muted">Subject: </span>
                  <span className="font-medium">{o.subject}</span>
                </div>
              )}
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-fg/90">{o.message}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section title="Plan to first 5 paying customers">
        <Card className="p-4">
          <ol className="space-y-2">
            {d.first_five_plan.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm">
                <span className="font-mono text-xs text-accent2">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-fg/90">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      </Section>
    </div>
  );
}

export function CustomerPitchView({ d }: { d: CustomerPitch }) {
  return (
    <div className="space-y-5">
      {/* the line you lead with */}
      <Card className="p-5">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-accent2">One-liner</div>
        <p className="mt-1.5 text-lg font-semibold leading-snug">{d.one_liner}</p>
        <p className="mt-3 border-t border-border pt-3 text-sm leading-relaxed text-fg/90">
          <span className="font-mono text-xs uppercase tracking-wide text-muted">Hook · </span>
          {d.hook}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          <span className="font-mono text-xs uppercase tracking-wide text-muted">Elevator · </span>
          {d.elevator}
        </p>
      </Card>

      <Section title="Walkthrough script">
        <ol className="space-y-2">
          {d.demo_script.map((s, i) => (
            <li key={i} className="flex gap-3 rounded-lg border border-border bg-panel2 p-3">
              <span className="mt-0.5 font-mono text-xs text-accent2">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <div className="text-sm font-semibold">{s.beat}</div>
                <p className="mt-0.5 text-sm text-muted">“{s.say}”</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="Objections &amp; answers">
        <div className="space-y-2">
          {d.objections.map((o, i) => (
            <Card key={i} className="p-4">
              <div className="text-sm font-semibold text-warn">“{o.objection}”</div>
              <p className="mt-1 text-sm text-fg/90">{o.response}</p>
            </Card>
          ))}
        </div>
      </Section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Section title="Proof points">
          <Card className="p-4">
            <Bullets items={d.proof_points} />
          </Card>
        </Section>
        <Section title="Why now">
          <Card className="flex h-full flex-col p-4">
            <p className="flex-1 text-sm text-fg/90">{d.why_now}</p>
          </Card>
        </Section>
      </div>

      <Card className="border-accent/40 bg-accent/5 p-5">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-accent">The ask</div>
        <p className="mt-1.5 text-base font-medium">{d.call_to_action}</p>
      </Card>

      {d.claim_check && d.claim_check.length > 0 && <ClaimCheck items={d.claim_check} />}
    </div>
  );
}

const CLAIM_TONE: Record<string, { color: string; label: string }> = {
  grounded: { color: "var(--color-good)", label: "Grounded" },
  assumption: { color: "var(--color-warn)", label: "Assumption" },
  aspirational: { color: "var(--color-bad)", label: "Aspirational" },
};

function ClaimCheck({ items }: { items: { claim: string; basis: string; note: string }[] }) {
  return (
    <Section title="Reality check — before you say it out loud">
      <div className="space-y-2">
        {items.map((c, i) => {
          const t = CLAIM_TONE[c.basis] ?? CLAIM_TONE.assumption;
          return (
            <Card key={i} className="flex items-start gap-3 p-3">
              <span
                className="mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ color: t.color, borderColor: `color-mix(in srgb, ${t.color} 40%, transparent)` }}
              >
                {t.label}
              </span>
              <div className="min-w-0">
                <div className="text-sm text-fg/90">{c.claim}</div>
                {c.note && <div className="mt-0.5 text-xs text-muted">{c.note}</div>}
              </div>
            </Card>
          );
        })}
      </div>
    </Section>
  );
}

export function PitchView({ d }: { d: Pitch }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {d.slides.map((s, i) => (
        <Card key={i} className="flex flex-col p-5">
          <div className="font-mono text-xs text-muted">Slide {i + 1}</div>
          <div className="mt-1 text-base font-bold">{s.title}</div>
          <div className="text-sm text-accent2">{s.subtitle}</div>
          <div className="mt-3 flex-1">
            <Bullets items={s.bullets} />
          </div>
          <p className="mt-3 border-t border-border pt-2 text-xs italic text-muted">{s.speaker_notes}</p>
        </Card>
      ))}
    </div>
  );
}
