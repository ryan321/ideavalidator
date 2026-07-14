"use client";

import React, { useEffect, useRef, useState } from "react";
import { Card, Metric, Section } from "./ui";
import type { Source } from "@/lib/ai/client";
import type { Validation } from "@/lib/generators/validation";
import type { EvidenceCorpus } from "@/lib/evidence/types";
import { GATES, MEASURED_SCORE_SD, normalizeGoal, verdictBands } from "@/lib/scoring";

// Report subcomponents (built as standalone files).
import { CriteriaRadar } from "./report/CriteriaRadar";
import { FactorBars } from "./report/FactorBars";
import { ValidationSummary } from "./report/ValidationSummary";
import { ValidationScorecard } from "./report/ValidationScorecard";
import { RiskMatrix } from "./report/RiskMatrix";
import { MarketSizing } from "./report/MarketSizing";
import { SystemAdjustments } from "./report/SystemAdjustments";
import { HowScored } from "./report/HowScored";
import {
  EvidencePanel,
  FetchedBadge,
  WtpTag,
  relDate,
  signalTagLabel,
  sourceLabel,
} from "./report/EvidencePanel";
import { NextTest } from "./report/NextTest";
import { IcpCard } from "./report/IcpCard";
import { MoatPanel } from "./report/MoatPanel";
import { KillTestKit } from "./report/KillTestKit";
import { TestResultPanel } from "./report/TestResultPanel";
import type { Kit } from "@/lib/generators/kit";
import type { Intel } from "@/lib/generators/intel";
import type { TestResultData } from "@/lib/generators/testresult";
import { ClaimsLedger } from "./report/ClaimsAudit";
import {
  AuditPanel,
  CoveLedger,
  DeepMemos,
  ModeBadge,
  ProvenanceTag,
  SispFlag,
  TarpitCallout,
} from "./report/DeepReport";
import { WhyThisScore } from "./report/WhyThisScore";
import { ReportChapter } from "./report/ReportChapter";
import { criterionLabel, verdictLabel, type TranslateFn } from "@/lib/i18n/t";
import { useT } from "./LocaleProvider";

/** Localize common "Year 1" / "Y1" projection labels; pass other values through. */
function formatProjectionYear(year: string | undefined, t: TranslateFn): string {
  const raw = (year ?? "").trim();
  if (!raw) return "—";
  const m = raw.match(/^(?:year|yr|y)\s*(\d+)$/i) || raw.match(/^(\d+)$/);
  if (m) return t("report.projectionYear", { n: m[1] });
  return raw;
}

// Light structural guard for a stored kit artifact (KitSchema lives server-side with
// the generator — its module pulls in the db, so the client checks shape, not zod).
function asKit(data: unknown): Kit | null {
  const k = data as Kit | null;
  return k &&
    typeof k.who === "string" &&
    Array.isArray(k.questions) &&
    Array.isArray(k.green_signals) &&
    Array.isArray(k.red_signals) &&
    k.outreach &&
    typeof k.tally === "string"
    ? k
    : null;
}

// The milestone list + team/ops prose. When the verdict isn't a GO it renders
// collapsed behind an "unlocks when the test passes" summary (open in print so the
// PDF stays complete) — visible on request, never leading.
function PlanBody({
  plan,
  collapsed,
  print,
}: {
  plan: NonNullable<Validation["plan"]>;
  collapsed: boolean;
  print?: boolean;
}) {
  const t = useT();
  const body = (
    <>
      <ol className="space-y-2">
        {(plan.milestones ?? []).map((mi, i) => (
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
      {plan.team_and_ops && (
        <p className="mt-3 text-sm text-muted">
          <span className="font-medium text-fg/80">{t("report.teamAndOps")} </span>
          {plan.team_and_ops}
        </p>
      )}
    </>
  );
  if (!collapsed) return body;
  return (
    <details className="group" open={print || undefined}>
      <summary className="flex cursor-pointer list-none items-center gap-2 font-mono text-[12px] uppercase tracking-[0.12em] text-muted hover:text-fg">
        <span className="transition group-open:rotate-90">▸</span>
        {t("report.buildPlanSummary", { n: (plan.milestones ?? []).length })}
      </summary>
      <div className="mt-3">{body}</div>
    </details>
  );
}

// Light structural guard for a stored test-result artifact (schema lives server-side).
function asTestResult(data: unknown): TestResultData | null {
  const x = data as TestResultData | null;
  return x && typeof x.report === "string" && typeof x.outcome === "string" ? x : null;
}

// Light structural guard for a stored intel artifact (schema lives server-side).
function asIntel(data: unknown): Intel | null {
  const x = data as Intel | null;
  return x && Array.isArray(x.competitors) && typeof x.one_liner === "string" ? x : null;
}

// The copyable positioning one-liner — a small founder deliverable, derived from the
// current wedge (not hype), pasteable into a deck/DM/landing page.
function OneLiner({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-accent/30 bg-accent/5 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">Your one-liner</div>
        <p className="mt-0.5 text-sm font-medium leading-relaxed text-fg">“{text}”</p>
      </div>
      <button
        onClick={() => {
          navigator.clipboard?.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="no-print shrink-0 rounded-md border border-accent/40 px-2.5 py-1 text-xs font-medium text-accent transition hover:bg-accent/10"
      >
        {copied ? "✓ copied" : "copy"}
      </button>
    </div>
  );
}

// The overall score is judged against the GOAL's verdict bands (lib/scoring.ts) —
// there is no fixed 70/45 line; a venture GO sits higher than a side-hustle GO.
type Bands = { go: number; maybe: number };

function scoreColor(n: number, b: Bands): string {
  if (n >= b.go) return "var(--color-good)";
  if (n >= b.maybe) return "var(--color-warn)";
  return "var(--color-bad)";
}

// Plain-English calibration for the 0-100 score, against the goal's real thresholds,
// so a founder knows whether the number is good without startup intuition.
function scoreBand(
  n: number,
  b: Bands,
  labels: { strong: string; mixed: string; weak: string }
): { label: string; hint: string } {
  if (n >= b.go)
    return {
      label: labels.strong,
      hint: `clears the ${b.go}+ GO bar for your goal — worth committing and moving to build/sell.`,
    };
  if (n >= b.maybe)
    return {
      label: labels.mixed,
      hint: `in the MAYBE band (${b.maybe}–${b.go - 1}) for your goal — refine the weak criteria below, then re-validate.`,
    };
  return {
    label: labels.weak,
    hint: `below the ${b.maybe} MAYBE bar for your goal — iterate hard or reconsider the wedge.`,
  };
}

// Human noun for the goal, used in goal-conditional copy.
const GOAL_NOUN: Record<string, string> = {
  lifestyle: "lifestyle",
  side_hustle: "side-hustle",
  venture: "venture",
  unsure: "unspecified",
};

/** Cited web sources — collapsed by default (audit trail, not the primary read). */
export function SourcesList({
  sources,
  defaultOpen = false,
}: {
  sources: Source[];
  /** Print/PDF should pass true so the full list is present. */
  defaultOpen?: boolean;
}) {
  const t = useT();
  if (!sources?.length) return null;
  return (
    <details
      className="group mt-4 overflow-hidden rounded-xl border border-border bg-panel/50 transition hover:border-accent/35 hover:bg-panel2/40"
      open={defaultOpen}
    >
      <summary
        className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3 select-none transition hover:bg-panel2/55 sm:px-4"
        title="Click to expand or collapse cited sources"
      >
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-panel2 font-mono text-sm text-accent2 transition group-open:border-accent/40 group-open:bg-accent/10"
          aria-hidden
        >
          <span className="inline-block transition-transform duration-150 group-open:rotate-90">▸</span>
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-fg/85">
          {t("report.sourcesCount", { n: sources.length })}
        </span>
        <span className="hidden text-xs text-muted sm:inline">{t("report.citedOptional")}</span>
        <span className="ml-auto shrink-0 rounded-md border border-border/80 bg-panel2/80 px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wide text-muted transition group-open:border-accent/30 group-open:text-accent2">
          <span className="group-open:hidden">{t("common.expand")}</span>
          <span className="hidden group-open:inline">{t("common.collapse")}</span>
        </span>
      </summary>
      <ul className="space-y-1.5 border-t border-border/60 px-4 py-3">
        {sources.map((s, i) => (
          <li key={i} className="truncate text-sm">
            <a href={s.url} target="_blank" rel="noreferrer" className="text-accent2 hover:underline">
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </details>
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

// Signature instrument: a calibrated 0-100 verdict meter. The three zones are the
// REAL per-goal thresholds from lib/scoring.ts (e.g. venture NO-GO <50 / MAYBE / GO ≥78),
// with a needle at the score — so the founder reads not just "59" but "59, in MAYBE,
// N below this goal's GO line". A ±SD ribbon around the needle shows scoring noise.
function VerdictMeter({
  score,
  bands,
  insufficient = false,
}: {
  score: number;
  bands: Bands;
  insufficient?: boolean;
}) {
  const t = useT();
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const pos = Math.max(5, Math.min(95, s)); // keep the needle chip on-canvas at extremes
  // Under INSUFFICIENT EVIDENCE the whole instrument goes neutral — a green needle
  // would imply a read the confidence doesn't support.
  const color = insufficient ? "var(--color-muted)" : scoreColor(s, bands);
  const toGo = s >= bands.go ? null : bands.go - s;
  const sd = MEASURED_SCORE_SD;
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
          <div style={{ width: `${bands.maybe}%`, background: "color-mix(in srgb, var(--color-bad) 30%, transparent)" }} />
          <div style={{ width: `${bands.go - bands.maybe}%`, background: "color-mix(in srgb, var(--color-warn) 30%, transparent)" }} />
          <div style={{ width: `${100 - bands.go}%`, background: "color-mix(in srgb, var(--color-good) 30%, transparent)" }} />
        </div>
        {/* ±SD noise ribbon around the needle (run-to-run variance of the same idea) */}
        <div
          className="absolute -top-0.5 -bottom-0.5 rounded"
          title={`±${sd} run-to-run scoring noise`}
          style={{
            left: `${Math.max(0, s - sd)}%`,
            width: `${Math.min(100, s + sd) - Math.max(0, s - sd)}%`,
            background: `color-mix(in srgb, ${color} 22%, transparent)`,
          }}
        />
        {/* GO line — this goal's threshold */}
        <div className="absolute -top-1 -bottom-1 w-px bg-fg/40" style={{ left: `${bands.go}%` }} />
        {/* needle on the track */}
        <div
          className="absolute -top-1 -bottom-1 w-[3px] rounded"
          style={{ left: `${pos}%`, transform: "translateX(-1.5px)", background: color, boxShadow: "0 0 0 2px var(--color-panel)" }}
        />
      </div>
      {/* zone labels under their bands */}
      <div className="relative mt-1.5 h-3 font-mono text-[10px] uppercase tracking-wider">
        <span className="absolute -translate-x-1/2 text-bad/70" style={{ left: `${bands.maybe / 2}%` }}>{t("report.noGo")}</span>
        <span className="absolute -translate-x-1/2 text-warn/80" style={{ left: `${(bands.maybe + bands.go) / 2}%` }}>{t("report.maybe")}</span>
        <span className="absolute -translate-x-1/2 text-good/80" style={{ left: `${(bands.go + 100) / 2}%` }}>{t("report.goLine", { go: bands.go })}</span>
      </div>
      <div className="mt-2.5 font-mono text-xs" style={{ color }}>
        {insufficient
          ? "score shown for reference — confidence is too low to grade this idea"
          : toGo != null
            ? `${toGo} point${toGo === 1 ? "" : "s"} below this goal's GO line (${bands.go})`
            : `clears this goal's GO line (${bands.go})`}
      </div>
    </div>
  );
}

// Lead with the gist: clamp long prose to three lines and keep the rest one
// click away, so the report doesn't open as a wall of text. `print` disables the
// clamp entirely (a printed "+ More" button is dead weight).
function ClampText({ text, className = "", print = false }: { text: string; className?: string; print?: boolean }) {
  const t = useT();
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
          {open ? t("report.lessClamp") : t("report.more")}
        </button>
      )}
    </div>
  );
}

// Subtle provenance tag: this figure is the model's synthesis of its web search,
// not a measured feed — the opposite of a fake "VERIFIED / LIVE DATA" badge.
function ModelEstimateTag() {
  const t = useT();
  return (
    <span
      className="font-mono text-[10px] uppercase tracking-wide text-muted/70"
      title={t("report.modelEstimate")}
    >
      {t("report.modelEstimate")}
    </span>
  );
}

function effortLabel(level: string | undefined, t: ReturnType<typeof useT>): string {
  const map: Record<string, string> = {
    Low: t("report.levelLow"),
    Medium: t("report.levelMedium"),
    High: t("report.levelHigh"),
  };
  return map[level ?? ""] ?? level ?? "";
}

function difficultyLabel(level: string | undefined, t: ReturnType<typeof useT>): string {
  const map: Record<string, string> = {
    Easy: t("report.levelEasy"),
    Moderate: t("report.levelModerate"),
    Hard: t("report.levelHard"),
  };
  return map[level ?? ""] ?? level ?? "";
}

// What evidence is missing, in plain words — derived from the corpus stats and the
// fired adjustments, for the INSUFFICIENT EVIDENCE header.
function missingEvidence(d: Validation, evidence?: EvidenceCorpus | null): string {
  const rules = new Set((d.system_adjustments ?? []).map((a) => a.rule));
  const parts: string[] = [];
  // corpus size: prefer the live corpus, fall back to the numbers the recompute
  // recorded in the insufficient-evidence adjustment ("Corpus: N items; cited web sources: M").
  const insuffDetail = d.system_adjustments?.find((a) => a.rule === "insufficient-evidence")?.detail ?? "";
  const corpusCount =
    evidence?.items.length ?? (insuffDetail.match(/Corpus:\s*(\d+)\s*items/i) ? Number(insuffDetail.match(/Corpus:\s*(\d+)\s*items/i)![1]) : null);
  if (corpusCount === 0) parts.push("no relevant fetched evidence was found");
  else if (corpusCount != null && corpusCount < 8) parts.push(`only ${corpusCount} fetched evidence item${corpusCount === 1 ? "" : "s"} were found`);
  if (rules.has("degraded-corpus")) parts.push("the evidence relevance ranking degraded (refresh the evidence)");
  if (rules.has("zero-web-sources")) parts.push("the grounded pass cited zero web sources (possible search-plugin regression)");
  if (rules.has("few-competitors")) parts.push("fewer than 2 real competitors were named");
  if (!parts.length) parts.push("the fetched corpus and cited web sources were too thin to ground a verdict");
  return parts.join("; ");
}

// Wave 3 deep mode + audit (SURFACED here). On a deep run `d.mode === "deep"` and the
// artifact carries d.bull_memo / d.bear_memo (adversarial memos), d.cove (the CoVe
// claim-verification ledger), and d.audit (the second-family cross-check). Any run may
// carry d.tarpit / d.sisp / d.forecast (per-criterion) / d.audit. Standard artifacts omit
// `mode` (⇒ "standard") and carry none of the deep-only fields. These all render via the
// components in ./report/DeepReport. The "Deep validation" action lives in the workspace
// toolbar (POSTs { deep:true }); this view only renders what the artifact carries.
export function ValidationView({
  d,
  goal,
  provenance,
  evidence,
  onRefreshEvidence,
  refreshingEvidence,
  scorePercentile,
  scoringSamples,
  kitData,
  onGenerateKit,
  generatingKit,
  intelData,
  onGenerateIntel,
  generatingIntel,
  testResultData,
  onRecordResult,
  recordingResult,
  onRevalidateWithResult,
  compactHero = false,
  print = false,
}: {
  d: Validation;
  /** The founder's goal bucket — selects the verdict bands/weights this report is judged by. */
  goal?: string | null;
  /** Where the idea came from — surfaced as a tiny header tag (organic = lived the pain). */
  provenance?: "organic" | "whiteboard" | null;
  /** The fetched Reddit/HN corpus behind the demand read (shown as its own section). */
  evidence?: EvidenceCorpus | null;
  onRefreshEvidence?: () => void;
  refreshingEvidence?: boolean;
  /** Where this version's score sits across all ideas (0-100 percentile), or null when
   * unrankable / withheld (Flows only provides it at ≥8 scores). Surface renders the badge. */
  scorePercentile?: number | null;
  /** Active k for self-consistency scoring (env SCORING_SAMPLES), resolved server-side —
   * HowScored documents the mechanics against the real value. */
  scoringSamples?: number;
  /** The stored kill-test execution kit artifact's data (null/undefined = not generated). */
  kitData?: unknown;
  onGenerateKit?: () => void;
  generatingKit?: boolean;
  /** The stored market-intel artifact's data (cited competitor facts + one-liner). */
  intelData?: unknown;
  onGenerateIntel?: () => void;
  generatingIntel?: boolean;
  /** The recorded real-world kill-test result (system-judged vs the pre-registered bars). */
  testResultData?: unknown;
  onRecordResult?: (report: string) => void;
  recordingResult?: boolean;
  onRevalidateWithResult?: () => void;
  /** The workspace masthead already shows the verdict box — skip the giant
   * verdict/score row here so the number leads exactly once on screen. */
  compactHero?: boolean;
  /** Print/PDF render: open every collapsed section and unclamp prose. */
  print?: boolean;
}) {
  const t = useT();
  const navLink =
    "rounded-md px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide text-muted transition hover:bg-panel2 hover:text-fg";
  // Judge the stored score by the goal it was actually computed under (goal_scored),
  // not the live goal picker — otherwise a goal edit re-colors a stale verdict.
  const goalKey = d.goal_scored ?? normalizeGoal(goal);
  const bands = verdictBands(goalKey);
  const insufficient = d.verdict === "INSUFFICIENT EVIDENCE";
  // INSUFFICIENT EVIDENCE is a neutral state — no verdict color may imply a read.
  const color = insufficient ? "var(--color-muted)" : scoreColor(d.score, bands);
  const band = scoreBand(d.score, bands, {
    strong: t("report.strongSignal"),
    mixed: t("report.mixed"),
    weak: t("report.weakAsWritten"),
  });
  // Where this score sits across every idea validated locally — only shown when Flows
  // provided it (it withholds the prop until there are ≥8 scores to rank against, so a
  // tiny population can't read as a meaningful "90th percentile").
  const pct = scorePercentile;
  // The market-intel pack (cited competitor facts + one-liner), if generated.
  const intel = asIntel(intelData);

  // The sticky nav's verdict chip earns its place only once the big readout has
  // scrolled OFF-screen — side by side they'd just say the same thing twice.
  const heroRef = useRef<HTMLDivElement>(null);
  const [heroVisible, setHeroVisible] = useState(true);
  useEffect(() => {
    const el = heroRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const obs = new IntersectionObserver(([e]) => setHeroVisible(e.isIntersecting), {
      rootMargin: "-48px 0px 0px 0px",
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  // "68 ± 4" sitting within the noise band of a threshold is a coin flip, not a verdict.
  const sd = MEASURED_SCORE_SD;
  const nearLine =
    Math.abs(d.score - bands.go) <= sd ? ("GO" as const) : Math.abs(d.score - bands.maybe) <= sd ? ("MAYBE" as const) : null;

  // only show a section (and its nav link) when it actually has content — a partial
  // analysis shouldn't leave a nav link that jumps to a blank section.
  const m = d.market;
  const showMarket = !!m && !!(
    m.sizing?.tam?.value || m.sizing?.sam?.value || m.sizing?.som?.value ||
    m.search_trend?.note || m.momentum || m.demand_signals?.length || d.icp
  );
  // Competitors + moat get their own chapter — "who am I up against" is a different
  // question from "is there a market", and it's usually the one that set the score.
  const showCompetition = !!(m?.competitors?.length || d.moat);
  const f = d.financials;
  const showMoney = !!f && !!(
    f.startup_cost || f.revenue_model || f.unit_economics?.cac || f.unit_economics?.ltv ||
    f.unit_economics?.payback || f.projections?.length
  );
  const pl = d.plan;
  const showPlan = !!pl && !!(pl.milestones?.length || pl.team_and_ops);

  // the four headline reads → one divided strip
  const dims: { label: string; value: string; color?: string; hint?: string }[] = [];
  if (d.demand) dims.push({ label: t("report.demand"), value: d.demand.strength, color: tone3(d.demand.strength, "Strong", "Moderate"), hint: "How strongly the target wants this." });
  if (d.demand) dims.push({ label: t("report.willPay"), value: d.demand.willingness_to_pay, hint: "What they'll realistically pay." });
  if (d.operating) dims.push({ label: t("report.effortToRun"), value: d.operating.effort_level, color: tone3(d.operating.effort_level, "Low", "Medium"), hint: "Ongoing work to operate it." });
  if (d.acquisition) dims.push({ label: t("report.hardToSell"), value: d.acquisition.difficulty, color: tone3(d.acquisition.difficulty, "Easy", "Moderate"), hint: "How hard it is to win each customer." });
  if (d.moat?.paths?.length) {
    // headline the STRONGEST graded path — honest-to-zero, so "None yet" is common
    const order = { strong: 0, plausible: 1, weak: 2, none: 3 } as const;
    const best = d.moat.paths.slice().sort((a, b) => (order[a.grade] ?? 3) - (order[b.grade] ?? 3))[0];
    const hasAny = best && best.grade !== "none";
    dims.push({
      label: t("report.moatToday"),
      value: hasAny
        ? `${best.grade[0].toUpperCase()}${best.grade.slice(1)} · ${best.type.replace(/_/g, " ")}`
        : t("report.noneYet"),
      color: best?.grade === "strong" ? "var(--color-good)" : hasAny ? "var(--color-warn)" : "var(--color-bad)",
      hint: "Strongest defensibility path graded today — details in Competition.",
    });
  }

  // promoted strengths / risks — the top items; the full lists stay in the scorecard.
  const strengths = [...(d.go_signals?.key_strengths ?? []), ...(d.go_signals?.positive_signals ?? [])].slice(0, 3);
  const risks = [...(d.stop_signals?.critical_risks ?? []), ...(d.stop_signals?.areas_of_concern ?? [])].slice(0, 3);

  const sens = d.demand?.sensitivity;
  const hasSens = !!sens && !!(sens.conservative || sens.optimistic);

  const narrativeRows: [string, string, string][] = d.narrative
    ? [
        [t("report.whoFeelsIt"), d.narrative.who, ""],
        [t("report.thePain"), d.narrative.pain, ""],
        [t("report.todayThey"), d.narrative.status_quo, "text-muted"],
        [t("report.costOfNothing"), d.narrative.cost_of_inaction, "text-bad"],
        [t("report.yourSolution"), d.narrative.solution, "text-accent"],
        [t("report.after"), d.narrative.after, "text-good"],
      ]
    : [];

  // Chapter mode (workspace): decision lives above; this report is a library you open.
  // Print keeps the full expanded editorial layout.
  const chapters = compactHero && !print;

  // One-line previews for collapsed chapters — "why open this".
  const briefPreview =
    d.narrative?.why ||
    (strengths[0]?.text ? strengths[0].text : null) ||
    (risks[0]?.text ? risks[0].text : null);
  const marketPreview =
    d.market?.momentum ||
    d.market?.search_trend?.note ||
    (d.market?.sizing?.som?.value ? `SOM ${d.market.sizing.som.value}` : null);
  const competitionPreview =
    d.market?.competitors?.[0]
      ? `vs ${d.market.competitors[0].name}${d.market.competitors.length > 1 ? ` +${d.market.competitors.length - 1}` : ""}`
      : null;
  const moneyPreview = d.financials?.revenue_model || d.demand?.obtainable_revenue || null;
  const risksPreview = d.pre_mortem?.[0] || d.risk_matrix?.[0]?.title || null;
  const planPreview =
    d.verdict === "GO"
      ? d.plan?.milestones?.[0]?.title || t("report.pathToRevenue")
      : t("report.gatedOnKillTest");
  const evidencePreview = evidence
    ? t("report.fetchedItems", { n: evidence.items?.length ?? 0 })
    : null;

  return (
    <div className={chapters ? "space-y-3" : "space-y-12"}>
      {/* on-this-report nav — only when the full readout is the lead (print / non-workspace) */}
      {!chapters && (
        <nav className="no-print sticky top-0 z-10 -mx-1 flex flex-wrap items-center gap-1 border-b border-border bg-bg/85 px-1 py-2.5 backdrop-blur">
          {!heroVisible && (
            <a
              href="#verdict"
              className="mr-2 flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-xs font-bold tracking-tight"
              style={{ color, borderColor: `color-mix(in srgb, ${color} 35%, transparent)` }}
              title={`${verdictLabel(d.verdict, t)} · ${Math.round(d.score)} ± ${sd} at ${d.confidence}% confidence`}
            >
              {verdictLabel(d.verdict, t)}
              <span className="tabular-nums">{Math.round(d.score)}</span>
            </a>
          )}
          <a href="#verdict" className={navLink}>{t("report.verdict")}</a>
          <a href="#brief" className={navLink}>{t("report.brief")}</a>
          {showMarket && <a href="#market" className={navLink}>{t("report.market")}</a>}
          {showCompetition && <a href="#competition" className={navLink}>{t("report.competition")}</a>}
          {showMoney && <a href="#money" className={navLink}>{t("report.money")}</a>}
          {d.risk_matrix?.length || d.pre_mortem?.length ? <a href="#risks" className={navLink}>{t("report.risks")}</a> : null}
          {showPlan && <a href="#plan" className={navLink}>{t("report.plan")}</a>}
          {evidence && <a href="#evidence" className={navLink}>{t("report.evidence")}</a>}
        </nav>
      )}

      {/* ============================ VERDICT / TEST ============================ */}
      <section id="verdict" className="scroll-mt-20 space-y-4">
        {/* Full hero instrument — print & standalone only. Workspace decision zone owns the score. */}
        {!chapters && (
          <div ref={heroRef} className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-panel2 to-panel">
            <div className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
            <div className="p-6 sm:p-7">
              <div className="flex items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-muted">
                <span className="flex flex-wrap items-center gap-2">
                  {t("report.validationReadout")}
                  <ModeBadge mode={d.mode} />
                  <ProvenanceTag provenance={provenance} />
                </span>
                <span
                  className="flex shrink-0 items-center gap-1.5"
                  title="Computed from the fetched evidence corpus + distinct cited web sources; the model's self-report only nudges it (max 15 pts)."
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
                  {d.confidence}% confidence
                </span>
              </div>

              <div className="mt-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span
                      className={`font-display font-bold leading-none tracking-tight ${
                        insufficient ? "text-3xl sm:text-4xl" : "text-5xl sm:text-6xl"
                      }`}
                      style={{ color }}
                    >
                      {verdictLabel(d.verdict, t)}
                    </span>
                    <span className="font-mono text-2xl font-bold tabular-nums" style={{ color }}>
                      {Math.round(d.score)}
                      <span className="text-base font-semibold text-muted"> ± {sd}</span>
                      <span className="text-base text-muted">/100</span>
                    </span>
                    {nearLine && !insufficient && (
                      <span
                        className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-warn"
                        title={`The score sits within the ±${sd}-point run-to-run scoring noise of this goal's ${nearLine} threshold (${nearLine === "GO" ? bands.go : bands.maybe}) — a re-run could land on the other side.`}
                      >
                        {t("verdict.borderlineOf", {
                          sd,
                          line: verdictLabel(nearLine, t),
                        })}
                      </span>
                    )}
                  </div>
                  {insufficient ? (
                    <div className="mt-2.5 max-w-md text-sm leading-relaxed text-muted">
                      <b className="text-fg/80">Not enough evidence to grade this idea:</b>{" "}
                      {missingEvidence(d, evidence)}. The weighted score is shown, but at{" "}
                      {d.confidence}% confidence (floor: {GATES.insufficientEvidenceConfidence}%) it
                      is a guess — refresh the evidence or add founder context, then re-run.
                    </div>
                  ) : (
                    <div className="mt-2.5 max-w-md text-sm leading-relaxed text-muted">
                      <b className="text-fg/80">{band.label}.</b> {band.hint}
                      {pct != null && (
                        <span
                          className="mt-1.5 block font-mono text-[11px] uppercase tracking-wide text-accent2"
                          title="Percentile across every non-archived, scored idea validated in this app."
                        >
                          scores higher than {pct}% of ideas validated here
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="max-w-[15rem] text-right">
                  <div className="font-mono text-2xl font-bold leading-tight text-accent2 [overflow-wrap:anywhere] sm:text-3xl">
                    {d.demand?.obtainable_revenue ?? "—"}
                  </div>
                  <div className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">obtainable / yr</div>
                </div>
              </div>

              <div className="mt-7">
                <VerdictMeter score={d.score} bands={bands} insufficient={insufficient} />
              </div>

              {d.next_test && (
                <a
                  href="#next-test"
                  className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-fg/85 transition hover:text-fg"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-accent2">Next ·</span>
                  <span className="min-w-0">
                    {d.next_test.pivotal_criterion && d.verdict === "MAYBE" ? (
                      <>
                        {t("report.resolvingMoves", {
                          criterion: criterionLabel(d.next_test.pivotal_criterion, t),
                        })}{" "}
                      </>
                    ) : null}
                    a ≤1-week test is ready below <span className="text-accent2">↓</span>
                  </span>
                </a>
              )}
            </div>
            <DimensionStrip dims={dims} />
          </div>
        )}

        {!compactHero || print ? (
          <WhyThisScore d={d} bands={bands} color={color} goal={goal} />
        ) : null}

        {/* Kill-test detail — deferred in workspace until kit/result exists so it
            doesn't restate the DecisionCard open question. CTA generates the kit. */}
        {d.next_test &&
          (!chapters || print || kitData != null || testResultData != null || generatingKit) && (
          <div id="next-test" className="scroll-mt-20 space-y-3">
            <NextTest next={d.next_test} verdict={d.verdict} print={print} />
            <KillTestKit
              kit={asKit(kitData)}
              hasKit={kitData != null}
              onGenerate={onGenerateKit}
              generating={generatingKit}
              print={print}
            />
            <TestResultPanel
              result={asTestResult(testResultData)}
              onRecord={onRecordResult}
              recording={recordingResult}
              onRevalidate={onRevalidateWithResult}
              disabled={recordingResult}
              print={print}
            />
          </div>
        )}

        {/* Scoring notes — collapsed in workspace (not a peer to the decision) */}
        {chapters ? (
          <details
            className="group overflow-hidden rounded-xl border border-border bg-panel/50 transition hover:border-accent/35 hover:bg-panel2/40"
            open={print}
          >
            <summary
              className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3 select-none transition hover:bg-panel2/55 sm:px-4"
              title="Click to expand or collapse scoring notes"
            >
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-panel2 font-mono text-sm text-accent2 transition group-open:border-accent/40 group-open:bg-accent/10"
                aria-hidden
              >
                <span className="inline-block transition-transform duration-150 group-open:rotate-90">▸</span>
              </span>
              <span className="min-w-0 flex-1 font-mono text-[11px] uppercase tracking-[0.14em] text-fg/85">
                {t("report.scoringNotes")}
              </span>
              <span className="shrink-0 rounded-md border border-border/80 bg-panel2/80 px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wide text-muted transition group-open:border-accent/30 group-open:text-accent2">
                <span className="group-open:hidden">{t("common.expand")}</span>
                <span className="hidden group-open:inline">{t("common.collapse")}</span>
              </span>
            </summary>
            <div className="space-y-4 border-t border-border/60 px-4 py-4">
              <TarpitCallout tarpit={d.tarpit} />
              <SispFlag sisp={d.sisp} />
              {d.system_adjustments?.length ? (
                <SystemAdjustments adjustments={d.system_adjustments} goalLabel={GOAL_NOUN[goalKey]} />
              ) : null}
              {d.claims_audit?.brief && (
                <div className="max-w-2xl border-l border-border pl-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{d.claims_audit.brief}</p>
                  {d.claims_audit.claims?.length ? <ClaimsLedger claims={d.claims_audit.claims} /> : null}
                </div>
              )}
              <HowScored goal={goalKey} samples={scoringSamples} print={print} />
              <DeepMemos bull={d.bull_memo} bear={d.bear_memo} print={print} />
              <CoveLedger cove={d.cove} print={print} />
              <AuditPanel audit={d.audit} print={print} />
            </div>
          </details>
        ) : (
          <>
            <TarpitCallout tarpit={d.tarpit} />
            <SispFlag sisp={d.sisp} />
            {d.system_adjustments?.length ? (
              <SystemAdjustments adjustments={d.system_adjustments} goalLabel={GOAL_NOUN[goalKey]} />
            ) : null}
            {d.claims_audit?.brief && (
              <details className="group" open={print}>
                <summary className="flex cursor-pointer list-none items-center gap-2 font-mono text-[13px] uppercase tracking-[0.12em] text-muted hover:text-fg">
                  <span className="transition group-open:rotate-90">▸</span>
                  What we scored — the neutral claims brief
                </summary>
                <div className="mt-3 max-w-2xl border-l border-border pl-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{d.claims_audit.brief}</p>
                  <p className="mt-2 text-xs text-muted/80">
                    The scorer judged this third-person restatement — the enthusiasm and superlatives
                    in the original wording carry no evidential weight.
                  </p>
                  {d.claims_audit.claims?.length ? <ClaimsLedger claims={d.claims_audit.claims} /> : null}
                </div>
              </details>
            )}
            <HowScored goal={goalKey} samples={scoringSamples} print={print} />
            <DeepMemos bull={d.bull_memo} bear={d.bear_memo} print={print} />
            <CoveLedger cove={d.cove} print={print} />
            <AuditPanel audit={d.audit} print={print} />
          </>
        )}
      </section>

      {/* ===================== full scorecard — first read after the Why ===================== */}
      <details
        className="group overflow-hidden rounded-xl border border-border bg-panel/50 transition hover:border-accent/35 hover:bg-panel2/40"
        open
      >
        <summary
          className="flex cursor-pointer list-none items-center gap-3 px-3.5 py-3.5 select-none transition hover:bg-panel2/55 sm:px-4"
          title={t("report.fullScorecard")}
        >
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-panel2 font-mono text-sm text-accent2 transition group-open:border-accent/40 group-open:bg-accent/10"
            aria-hidden
          >
            <span className="inline-block transition-transform duration-150 group-open:rotate-90">▸</span>
          </span>
          <span className="min-w-0 flex-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg/85">
            {t("report.fullScorecard")}
          </span>
          <span className="shrink-0 rounded-md border border-border/80 bg-panel2/80 px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wide text-muted transition group-open:border-accent/30 group-open:text-accent2">
            <span className="group-open:hidden">{t("common.expand")}</span>
            <span className="hidden group-open:inline">{t("common.collapse")}</span>
          </span>
        </summary>
        <div className="space-y-6 border-t border-border p-5">
          <Section title={t("report.visualOverview")}>
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

      {chapters && (
        <div className="pt-2">
          <p className="text-sm font-medium text-fg/85">{t("report.digDeeper")}</p>
          <p className="mt-0.5 text-xs text-muted">
            {t("report.digDeeperHint", {
              sections: [
                t("report.brief"),
                t("report.market"),
                t("report.competition"),
                t("report.money"),
                t("report.risks"),
                t("report.plan"),
                t("report.evidence"),
              ].join(", "),
            })}
          </p>
        </div>
      )}

      {/* ============================== THE BRIEF ============================== */}
      <ReportChapter
        id="brief"
        n="01"
        title={t("report.theBrief")}
        hint={t("report.briefHint")}
        preview={briefPreview}
        print={print}
        defaultOpen={!chapters}
      >
        <div className="space-y-8">
          {/* thesis — the one-line painkiller read, always visible */}
          {d.narrative?.why && (
            <p className="max-w-3xl text-sm leading-relaxed text-fg/90">
              <b style={{ color: d.narrative.verdict === "Painkiller" ? "var(--color-good)" : "var(--color-warn)" }}>
                {d.narrative.verdict === "Painkiller"
                  ? t("report.painkiller")
                  : d.narrative.verdict === "Vitamin"
                    ? t("report.vitamin")
                    : d.narrative.verdict}
                :
              </b>{" "}
              {d.narrative.why}
            </p>
          )}

          {/* the copyable positioning one-liner (from the intel pack) */}
          {intel?.one_liner && <OneLiner text={intel.one_liner} />}

          {/* the actionable core, scannable — leads the brief */}
          {(strengths.length > 0 || risks.length > 0) && (
            <div className="grid gap-6 sm:grid-cols-2 sm:divide-x sm:divide-border">
              <div className="sm:pr-6">
                <MiniSignals tone="good" label={t("report.whatsWorking")} items={strengths} />
              </div>
              <div className="sm:pl-6">
                <MiniSignals tone="warn" label={t("report.whatToWatch")} items={risks} />
              </div>
            </div>
          )}

          {d.demand && (
            <div>
              <div className="mb-3 font-mono text-sm uppercase tracking-[0.1em] text-muted">
                {t("report.theNumber")}
              </div>
              {d.demand.math && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-muted">
                  <span className="text-fg/80">{d.demand.math.reachable}</span>
                  <span>{t("report.reach")}</span>
                  <span className="text-fg/80">{d.demand.math.capture}</span>
                  <span>{t("report.win")}</span>
                  <span className="text-fg/80">{d.demand.math.price}</span>
                  <span>{t("report.each")}</span>
                  <span className="font-bold text-accent2">{d.demand.obtainable_revenue}</span>
                  <span>{t("report.perYear")}</span>
                </div>
              )}
              {hasSens && (
                <div className="mt-3 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-border bg-border">
                  <Metric label={t("report.conservative")} value={sens!.conservative || "—"} hint={t("report.conservativeHint")} />
                  <Metric label={t("report.base")} value={sens!.base || d.demand.obtainable_revenue || "—"} color="var(--color-accent2)" hint={t("report.baseHint")} />
                  <Metric label={t("report.optimistic")} value={sens!.optimistic || "—"} hint={t("report.optimisticHint")} />
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
                {t("report.whyTheyBuy")}
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
              <span className="font-mono text-[13px] uppercase tracking-wide text-warn">{t("report.goalFitLabel")} </span>
              <span className="text-fg/90">{d.goal_fit_note}</span>
            </div>
          )}

          {d.clarifying_questions && d.clarifying_questions.length > 0 && (
            <div className="rounded-r-lg border-l-2 border-accent2/50 bg-accent2/5 px-4 py-3">
              <div className="mb-1.5 font-mono text-[13px] uppercase tracking-wide text-accent2">{t("report.openQuestions")}</div>
              <p className="mb-2 text-xs text-muted">{t("report.openQuestionsHint")}</p>
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
                {t("report.howItRuns")}
              </summary>
              <div className="mt-3 space-y-3 border-l border-border pl-4 text-sm leading-relaxed text-fg/90">
                {d.operating && (
                  <p>
                    <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
                      {t("report.effortLine", { level: effortLabel(d.operating.effort_level, t) })}{" "}
                    </span>
                    {d.operating.description}
                  </p>
                )}
                {d.acquisition && (
                  <p>
                    <span className="font-mono text-[11px] uppercase tracking-wide text-muted">
                      {t("report.hardToSellLine", { level: difficultyLabel(d.acquisition.difficulty, t) })}{" "}
                    </span>
                    {d.acquisition.reasoning}
                  </p>
                )}
              </div>
            </details>
          )}
        </div>
      </ReportChapter>

      {/* ============================ MARKET ============================ */}
      {showMarket && d.market && (
        <ReportChapter
          id="market"
          n="02"
          title={t("report.market")}
          hint={t("report.marketHint")}
          preview={marketPreview}
          print={print}
        >
          <div className="space-y-6">
            {d.market.sizing && (d.market.sizing.tam?.value || d.market.sizing.sam?.value || d.market.sizing.som?.value) && (
              <MarketSizing sizing={d.market.sizing} cagrPct={d.market.cagr_pct ?? 0} />
            )}

            {((d.market.search_trend && d.market.search_trend.note) || d.market.momentum) && (
              <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
                {d.market.search_trend && d.market.search_trend.note && (
                  <div className="bg-panel p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{t("report.searchInterest")}</div>
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
                    <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{t("report.recentMomentum")}</div>
                    <p className="mt-1 text-sm text-fg/90">{d.market.momentum}</p>
                    <div className="mt-1.5"><ModelEstimateTag /></div>
                  </div>
                )}
              </div>
            )}

            {/* who buys & how — channels grounded in the corpus's proven communities */}
            {d.icp && <IcpCard icp={d.icp} communities={evidence?.stats.communities ?? []} />}

            {(d.market.demand_signals ?? []).length > 0 && (
              <div>
                <div className="mb-1 font-mono text-sm uppercase tracking-[0.1em] text-muted">
                  {t("report.peopleSaying")}
                </div>
                <p className="mb-2.5 text-xs text-muted">{t("report.peopleSayingBlurb")}</p>
                <div className="space-y-2">
                  {d.market.demand_signals!.map((s, i) => (
                    <div key={i} className="rounded-lg border border-border/70 bg-panel/40 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {s.tag && (
                          <span className="rounded-full border border-accent2/30 bg-accent2/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent2">
                            {signalTagLabel(s.tag, t)}
                          </span>
                        )}
                        {s.wtp_signal && <WtpTag />}
                        <span className="ml-auto flex items-center gap-2">
                          {s.url && s.source ? (
                            <a href={s.url} target="_blank" rel="noopener noreferrer" className="truncate text-xs text-accent2 hover:underline">
                              {sourceLabel({ source: s.source, community: s.community }, t)} ↗
                            </a>
                          ) : null}
                          {s.source && <FetchedBadge source={s.source} />}
                        </span>
                      </div>
                      {s.quote && <p className="mt-1.5 text-sm leading-relaxed text-fg/90">“{s.quote}”</p>}
                      {(s.score != null || s.num_comments != null || !!s.created_utc) && (
                        <div className="mt-1.5 font-mono text-[11px] text-muted">
                          {s.score != null ? `▲${s.score}` : ""}
                          {s.num_comments != null
                            ? ` · ${
                                s.num_comments === 1
                                  ? t("report.commentsOne")
                                  : t("report.comments", { n: s.num_comments })
                              }`
                            : ""}
                          {s.created_utc ? ` · ${relDate(s.created_utc, t)}` : ""}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ReportChapter>
      )}

      {/* ============================ COMPETITION ============================ */}
      {showCompetition && (
        <ReportChapter
          id="competition"
          n="03"
          title={t("report.competition")}
          hint={t("report.competitionHint")}
          preview={competitionPreview}
          print={print}
        >
          <div className="space-y-6">
            {d.market && (d.market.competitors ?? []).length > 0 && (
              <div>
                <div className="mb-2.5 flex items-baseline justify-between gap-2 font-mono text-sm uppercase tracking-[0.1em] text-muted">
                  {t("report.competitors")}
                  <ModelEstimateTag />
                </div>
                {/* competitor pricing range, from CITED pages only — the anchor for pricing */}
                {intel?.pricing_anchor && (
                  <p className="mb-2.5 rounded-lg border border-accent2/30 bg-accent2/[0.05] px-3.5 py-2 text-sm text-fg/90">
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent2">
                      {t("report.pricingAnchor")}{" "}
                    </span>
                    {intel.pricing_anchor}
                  </p>
                )}
                <div className="space-y-2">
                  {d.market.competitors!.map((c, i) => {
                    // join the intel pack by name (case-insensitive) for cited facts
                    const info = intel?.competitors.find(
                      (x) => x.name && c.name && x.name.toLowerCase().includes(c.name.toLowerCase().split(" ")[0])
                    );
                    return (
                      <div key={i} className="rounded-lg border border-border/70 bg-panel/40 p-4">
                        <div className="text-sm font-semibold">{c.name}</div>
                        {c.note && <p className="mt-1 text-sm text-muted">{c.note}</p>}
                        {c.complaint_theme && (
                          <p className="mt-1.5 text-xs">
                            <span className="font-semibold text-warn">{t("report.customersComplain")} </span>
                            <span className="text-fg/85">{c.complaint_theme}</span>
                          </p>
                        )}
                        {c.your_edge && (
                          <p className="mt-1 text-xs">
                            <span className="font-semibold text-accent">{t("report.yourEdge")} </span>
                            <span className="text-fg/85">{c.your_edge}</span>
                          </p>
                        )}
                        {(info?.pricing || info?.funding || info?.positioning) && (
                          <div className="mt-2 space-y-1 border-t border-border/60 pt-2 text-xs">
                            {info.positioning && (
                              <p>
                                <span className="font-semibold text-fg/70">{t("report.theySay")} </span>
                                <span className="text-fg/85">{info.positioning}</span>
                              </p>
                            )}
                            {info.pricing && (
                              <p>
                                <span className="font-semibold text-fg/70">{t("report.pricingLabel")} </span>
                                <span className="text-fg/85">{info.pricing}</span>{" "}
                                {info.pricing_url && (
                                  <a href={info.pricing_url} target="_blank" rel="noopener noreferrer" className="text-accent2 hover:underline">
                                    {t("report.sourceArrow")}
                                  </a>
                                )}
                              </p>
                            )}
                            {info.funding && (
                              <p>
                                <span className="font-semibold text-fg/70">{t("report.fundingLabel")} </span>
                                <span className="text-fg/85">{info.funding}</span>{" "}
                                {info.funding_url && (
                                  <a href={info.funding_url} target="_blank" rel="noopener noreferrer" className="text-accent2 hover:underline">
                                    {t("report.sourceArrow")}
                                  </a>
                                )}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* enrichment affordance — cited web facts, never estimated ones */}
                {!intel && onGenerateIntel && !print && (
                  <div className="no-print mt-2.5 flex items-center gap-3 rounded-lg border border-dashed border-border px-3.5 py-2.5">
                    <span className="text-xs text-muted">{t("report.enrichIntel")}</span>
                    <button
                      onClick={onGenerateIntel}
                      disabled={generatingIntel}
                      className="ml-auto shrink-0 rounded-md border border-accent2/40 px-2.5 py-1 text-xs font-medium text-accent2 transition hover:bg-accent2/10 disabled:opacity-50"
                    >
                      {generatingIntel ? t("report.searchingIntel") : t("report.enrichCta")}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* defensibility — honest-to-zero moat grades + what would earn one */}
            {d.moat && <MoatPanel moat={d.moat} />}
          </div>
        </ReportChapter>
      )}

      {/* ============================ MONEY ============================ */}
      {showMoney && d.financials && (
        <ReportChapter
          id="money"
          n="04"
          title={t("report.money")}
          hint={t("report.moneyHint")}
          preview={moneyPreview}
          print={print}
        >
          <div className="mb-3 flex justify-end">
            <ModelEstimateTag />
          </div>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
            <Metric label={t("report.startupCost")} value={d.financials.startup_cost || "—"} />
            <Metric label={t("report.cac")} value={d.financials.unit_economics?.cac || "—"} hint={t("report.cacHint")} />
            <Metric label={t("report.ltv")} value={d.financials.unit_economics?.ltv || "—"} hint={t("report.ltvHint")} />
            <Metric label={t("report.payback")} value={d.financials.unit_economics?.payback || "—"} hint={t("report.paybackHint")} />
          </div>
          {d.financials.revenue_model && <p className="mt-3 text-sm text-muted">{d.financials.revenue_model}</p>}
          {(d.financials.projections ?? []).length > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-baseline justify-between gap-2 font-mono text-sm uppercase tracking-[0.1em] text-muted">
                {t("report.projections")}
                <ModelEstimateTag />
              </div>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full min-w-[28rem] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left font-mono text-[11px] uppercase tracking-wide text-muted">
                      <th className="px-3 py-2 font-medium">{t("report.year")}</th>
                      <th className="px-3 py-2 font-medium">{t("report.revenue")}</th>
                      <th className="px-3 py-2 font-medium">{t("report.customers")}</th>
                      <th className="px-3 py-2 font-medium">{t("report.note")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.financials.projections.map((p, i) => (
                      <tr key={i} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2 align-top font-mono text-accent2">
                          {formatProjectionYear(p.year, t)}
                        </td>
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
        </ReportChapter>
      )}

      {/* ============================ RISKS ============================ */}
      {d.risk_matrix?.length || d.pre_mortem?.length ? (
        <ReportChapter
          id="risks"
          n="05"
          title={t("report.risks")}
          hint={t("report.risksHint")}
          preview={risksPreview}
          print={print}
        >
          {d.pre_mortem?.length ? (
            <div className="mb-5 rounded-xl border border-bad/25 bg-bad/5 p-4">
              <div className="mb-1 font-mono text-[13px] uppercase tracking-[0.12em] text-bad">{t("report.preMortem")}</div>
              <p className="mb-2.5 text-xs text-muted">{t("report.preMortemBlurb")}</p>
              <ul className="space-y-1.5">
                {d.pre_mortem.map((p, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-snug text-fg/90">
                    <span className="mt-px shrink-0 font-mono text-xs tabular-nums text-bad" aria-hidden>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {d.risk_matrix?.length ? <RiskMatrix risks={d.risk_matrix} /> : null}
          {d.downside && (
            <div className="mt-4 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
              <Metric label={t("report.capitalAtRisk")} value={d.downside.capital_at_risk} />
              <Metric label={t("report.liability")} value={d.downside.liability} />
              <Metric label={t("report.ifItFails")} value={d.downside.if_it_fails} />
            </div>
          )}
        </ReportChapter>
      ) : null}

      {/* ============================ PLAN ============================ */}
      {showPlan && d.plan && (
        <ReportChapter
          id="plan"
          n="06"
          title={t("report.plan")}
          hint={d.verdict === "GO" ? t("report.planHintGo") : t("report.planHintTest")}
          preview={planPreview}
          print={print}
        >
          {d.verdict !== "GO" && (
            <div className="mb-3 flex gap-3 rounded-lg border border-accent2/40 bg-accent2/[0.06] p-3">
              <span className="mt-0.5 font-mono text-xs text-accent2">00</span>
              <div>
                <div className="text-sm font-semibold">{t("verdict.killTestGates")}</div>
                <div className="mt-0.5 text-xs text-muted">
                  {t("verdict.thisVerdictIs", {
                    label: d.verdict
                      ? verdictLabel(d.verdict, t)
                      : t("verdict.notAGo"),
                  })}{" "}
                  <a href="#next-test" className="text-accent2 hover:underline">
                    →
                  </a>
                </div>
              </div>
            </div>
          )}
          <PlanBody plan={d.plan} collapsed={d.verdict !== "GO"} print={print} />
        </ReportChapter>
      )}

      {/* ============================ EVIDENCE ============================ */}
      {evidence && (
        <div className="no-print">
          <ReportChapter
            id="evidence"
            n="07"
            title={t("report.evidence")}
            hint={t("report.evidenceHint")}
            preview={evidencePreview}
            print={print}
          >
            <EvidencePanel corpus={evidence} onRefresh={onRefreshEvidence} refreshing={refreshingEvidence} />
          </ReportChapter>
        </div>
      )}

    </div>
  );
}
