"use client";

import React, { useState } from "react";
import { Card, Metric, Section, SectionHead } from "./ui";
import type { Source } from "@/lib/ai/client";
import type { Validation } from "@/lib/generators/validation";
import type { EvidenceCorpus } from "@/lib/evidence/types";

// Report subcomponents (built as standalone files).
import { CriteriaRadar } from "./report/CriteriaRadar";
import { FactorBars } from "./report/FactorBars";
import { ValidationSummary } from "./report/ValidationSummary";
import { ValidationScorecard } from "./report/ValidationScorecard";
import { RiskMatrix } from "./report/RiskMatrix";
import { MarketSizing } from "./report/MarketSizing";
import { EvidencePanel, FetchedBadge, WtpTag, relDate, sourceLabel } from "./report/EvidencePanel";

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

// ---- Validation (composed) ---------------------------------------------------

// good if value===good, warn if ===mid, else bad.
function tone3(value: string, good: string, mid: string): string {
  return value === good
    ? "var(--color-good)"
    : value === mid
      ? "var(--color-warn)"
      : "var(--color-bad)";
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
// click away, so the report doesn't open as a wall of text. `print` disables the
// clamp entirely (a printed "+ More" button is dead weight).
function ClampText({ text, className = "", print = false }: { text: string; className?: string; print?: boolean }) {
  const [open, setOpen] = useState(false);
  const long = !print && text.length > 170;
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

// Subtle provenance tag: this figure is the model's synthesis of its web search,
// not a measured feed — the opposite of a fake "VERIFIED / LIVE DATA" badge.
function ModelEstimateTag() {
  return (
    <span className="font-mono text-[10px] uppercase tracking-wide text-muted/70" title="An estimate synthesized by the model from web-search results — check the cited sources before relying on it.">
      model estimate — see sources
    </span>
  );
}

export function ValidationView({
  d,
  evidence,
  onRefreshEvidence,
  refreshingEvidence,
  print = false,
}: {
  d: Validation;
  /** The fetched Reddit/HN corpus behind the demand read (shown as its own section). */
  evidence?: EvidenceCorpus | null;
  onRefreshEvidence?: () => void;
  refreshingEvidence?: boolean;
  /** Print/PDF render: open every collapsed section and unclamp prose. */
  print?: boolean;
}) {
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
        {evidence && <a href="#evidence" className={navLink}>Evidence</a>}
      </nav>

      {/* ============================ VERDICT (hero) ============================ */}
      <section id="verdict" className="scroll-mt-20 space-y-5">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-panel2 to-panel">
          {/* verdict-tinted top hairline — the only place the verdict color leads */}
          <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
          <div className="p-6 sm:p-7">
            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
              <span>Validation readout</span>
              <span
                className="flex items-center gap-1.5"
                title="Computed from the fetched evidence corpus + distinct cited web sources; the model's self-report only nudges it (max 15 pts)."
              >
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
          <ClampText text={d.summary} print={print} className="max-w-2xl text-[15px] text-fg/90" />
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
              {d.demand.reasoning && <ClampText text={d.demand.reasoning} print={print} className="mt-3 max-w-2xl text-sm text-muted" />}
            </div>
          )}

          {/* full pain → solution breakdown — the heaviest block, collapsed by default */}
          {narrativeRows.length > 0 && (
            <details className="group" open={print}>
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
            <details className="group" open={print}>
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
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Search interest · direction per web search</div>
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
                    <div className="mt-1.5"><ModelEstimateTag /></div>
                  </div>
                )}
                {d.market.momentum && (
                  <div className="bg-panel p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Recent momentum</div>
                    <p className="mt-1 text-sm text-fg/90">{d.market.momentum}</p>
                    <div className="mt-1.5"><ModelEstimateTag /></div>
                  </div>
                )}
              </div>
            )}

            {(d.market.competitors ?? []).length > 0 && (
              <div>
                <div className="mb-2.5 flex items-baseline justify-between gap-2 font-mono text-sm uppercase tracking-[0.1em] text-muted">
                  Competitors
                  <ModelEstimateTag />
                </div>
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
                <p className="mb-2.5 text-xs text-muted">
                  Posts fetched from the Reddit / Hacker News APIs — every link and vote count is real, not model-asserted.
                </p>
                <div className="space-y-2">
                  {d.market.demand_signals!.map((s, i) => (
                    <div key={i} className="rounded-lg border border-border/70 bg-panel/40 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {s.tag && (
                          <span className="rounded-full border border-accent2/30 bg-accent2/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent2">
                            {s.tag}
                          </span>
                        )}
                        {s.wtp_signal && <WtpTag />}
                        <span className="ml-auto flex items-center gap-2">
                          {s.url && s.source ? (
                            <a href={s.url} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-accent2 hover:underline">
                              {sourceLabel({ source: s.source, community: s.community })} ↗
                            </a>
                          ) : null}
                          {s.source && <FetchedBadge source={s.source} />}
                        </span>
                      </div>
                      {s.quote && <p className="mt-1.5 text-sm leading-relaxed text-fg/90">“{s.quote}”</p>}
                      {(s.score != null || s.num_comments != null || !!s.created_utc) && (
                        <div className="mt-1.5 font-mono text-[11px] text-muted">
                          {s.score != null ? `▲${s.score}` : ""}
                          {s.num_comments != null ? ` · ${s.num_comments} comments` : ""}
                          {s.created_utc ? ` · ${relDate(s.created_utc)}` : ""}
                        </div>
                      )}
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
          <SectionHead n="03" title="Money" hint="the unit economics" right={<ModelEstimateTag />} />
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
            <Metric label="Startup cost" value={d.financials.startup_cost || "—"} />
            <Metric label="CAC" value={d.financials.unit_economics?.cac || "—"} hint="Cost to acquire a customer" />
            <Metric label="LTV" value={d.financials.unit_economics?.ltv || "—"} hint="Lifetime value of a customer" />
            <Metric label="Payback" value={d.financials.unit_economics?.payback || "—"} hint="Time to recoup acquisition cost" />
          </div>
          {d.financials.revenue_model && <p className="mt-3 text-sm text-muted">{d.financials.revenue_model}</p>}
          {(d.financials.projections ?? []).length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-baseline justify-between gap-2 font-mono text-sm uppercase tracking-[0.1em] text-muted">
                Projections
                <ModelEstimateTag />
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
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

      {/* ============================ EVIDENCE ============================ */}
      {evidence && (
        <section id="evidence" className="no-print scroll-mt-20">
          <SectionHead n="06" title="Evidence" hint="the fetched corpus behind the demand read" />
          <EvidencePanel corpus={evidence} onRefresh={onRefreshEvidence} refreshing={refreshingEvidence} />
        </section>
      )}

      {/* ===================== full scorecard (the deep dive) ===================== */}
      <details className="group rounded-xl border border-border bg-panel/40" open={print}>
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
