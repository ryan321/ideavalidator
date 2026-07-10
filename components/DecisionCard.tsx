"use client";

import React, { useState } from "react";
import type { Validation } from "@/lib/generators/validation";
import {
  MEASURED_SCORE_SD,
  criterionWeight,
  normalizeGoal,
  type CriterionName,
} from "@/lib/scoring";
import { ScoreRing } from "./VerdictBox";

type Bands = { go: number; maybe: number };

function dragCriteria(d: Validation, goal: string | null | undefined, n = 2) {
  const list = Array.isArray(d.criteria) ? d.criteria : [];
  return list
    .map((c) => ({
      name: c.name as CriterionName | string,
      score: c.score,
      band: c.band,
      drag: Math.max(0, 72 - c.score) * criterionWeight(c.name, goal),
    }))
    .filter((c) => c.score < 72)
    .sort((a, b) => b.drag - a.drag || a.score - b.score)
    .slice(0, n);
}

function distanceLine(score: number, bands: Bands, insufficient: boolean): string | null {
  if (insufficient) return null;
  const s = Math.round(score);
  if (s >= bands.go) {
    const over = s - bands.go;
    return over === 0 ? `On GO (${bands.go})` : `+${over} above GO (${bands.go})`;
  }
  if (s >= bands.maybe) return `${bands.go - s} pts under GO (${bands.go})`;
  return `${bands.maybe - s} pts under MAYBE (${bands.maybe})`;
}

/**
 * Decision surface: score ring → why this score → next to prove + one primary CTA.
 * Idea statement stays folded; secondary tools sit next to the CTA.
 */
export function DecisionCard({
  d,
  bands,
  color,
  goal,
  title,
  statement,
  versionLabel,
  rationale,
  goalLabel,
  goalDetail,
  testStatus,
  primary,
  primaryBusy,
  primaryDisabled,
  primaryHint,
  secondary,
  ideaExtras,
  /** Current version number — badge shown top-right when variantCount > 1. */
  versionN,
  variantCount = 1,
}: {
  d: Validation;
  bands: Bands;
  color: string;
  goal?: string | null;
  title: string;
  statement: string;
  versionLabel: string;
  rationale?: string | null;
  goalLabel: string;
  goalDetail?: string | null;
  testStatus: string;
  primary: { label: string; href?: string; onClick?: () => void };
  primaryBusy?: boolean;
  primaryDisabled?: boolean;
  /** One line under the CTA row — what the primary button actually does. */
  primaryHint?: string | null;
  secondary: React.ReactNode;
  ideaExtras?: React.ReactNode;
  versionN?: number;
  variantCount?: number;
}) {
  const [whyOpen, setWhyOpen] = useState(false);
  const [ideaOpen, setIdeaOpen] = useState(false);
  const ideaExpanded = ideaOpen || !!ideaExtras;

  const goalKey = d.goal_scored ?? normalizeGoal(goal);
  const insufficient = d.verdict === "INSUFFICIENT EVIDENCE";
  const score = Math.round(d.score);
  const dist = distanceLine(score, bands, insufficient);
  const drags = dragCriteria(d, goalKey);
  const vitamin = d.narrative?.verdict === "Vitamin";
  const painkiller = d.narrative?.verdict === "Painkiller";
  const pivotal = d.next_test?.pivotal_criterion?.trim() || null;
  const summary = (d.summary ?? "").trim();
  const goalNote = (d.goal_fit_note ?? "").trim();
  const openQ = d.next_test?.riskiest_assumption?.trim() || null;
  const revenue = d.demand?.obtainable_revenue ?? null;
  const sd = MEASURED_SCORE_SD;
  const borderline =
    !insufficient &&
    (Math.abs(score - bands.go) <= sd
      ? "GO"
      : Math.abs(score - bands.maybe) <= sd
        ? "MAYBE"
        : null);

  const statusColor =
    testStatus === "PASS"
      ? "var(--color-good)"
      : testStatus === "KILL"
        ? "var(--color-bad)"
        : testStatus === "INCONCLUSIVE"
          ? "var(--color-warn)"
          : testStatus === "KIT READY"
            ? "var(--color-accent2)"
            : "var(--color-muted)";

  const PrimaryTag = primary.href ? "a" : "button";
  // Show ~2–3 sentences by default; long dumps still expand.
  const summaryLong = summary.length > 280 || summary.split(/\n+/).length > 2;

  return (
    <section className="folio folio-enter mb-6 overflow-hidden" aria-label="Decision">
      {/* 1 · Stamp + ring + revenue — the memo masthead */}
      <div
        className="relative grid gap-5 border-b border-border/70 px-5 py-6 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:px-7 sm:py-7"
        style={{
          background: `linear-gradient(135deg, color-mix(in srgb, ${color} 10%, transparent), transparent 55%)`,
        }}
      >
        {variantCount > 1 && versionN != null && (
          <span
            className="absolute right-4 top-4 z-10 rounded-full border border-border bg-panel/90 px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-fg sm:right-6 sm:top-5"
            title={`Variant ${versionN} of ${variantCount}`}
          >
            v{versionN}
          </span>
        )}
        <div className="flex flex-col items-center gap-3 sm:items-start">
          <span className="verdict-stamp text-lg sm:text-xl" style={{ color }}>
            {insufficient ? "INSUFFICIENT" : d.verdict}
          </span>
          <ScoreRing
            score={score}
            sd={sd}
            color={color}
            bands={bands}
            insufficient={insufficient}
          />
        </div>
        <div className="min-w-0 text-center sm:pr-10 sm:text-left">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Validation read</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-start">
            {dist && (
              <span className="font-mono text-sm font-medium tabular-nums" style={{ color }}>
                {dist}
              </span>
            )}
            {typeof d.confidence === "number" && (
              <span className="font-mono text-[11px] text-muted">{d.confidence}% conf.</span>
            )}
            {borderline && (
              <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 font-mono text-[10px] text-warn">
                borderline · ±{sd}
              </span>
            )}
          </div>
          {summary && (
            <p
              className={`mt-3 max-w-2xl text-[15px] leading-relaxed text-fg/90 ${
                whyOpen || !summaryLong ? "whitespace-pre-wrap" : "line-clamp-2"
              }`}
            >
              {summary}
            </p>
          )}
        </div>
        {revenue && (
          <div className="text-center sm:text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Obtainable / yr</div>
            <div className="mt-1 font-display text-2xl font-extrabold leading-none tracking-tight text-accent2 sm:text-3xl">
              {revenue}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-7">
        {/* 2 · Drags + rationale */}
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
              Why this score
            </div>
          </div>
          {(drags.length > 0 || vitamin || painkiller || pivotal) && (
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {vitamin && (
                <span
                  className="rounded-full border border-warn/40 bg-warn/10 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-warn"
                  title={d.narrative?.why || "Nice-to-have — harder to sell."}
                >
                  Vitamin
                </span>
              )}
              {painkiller && (
                <span
                  className="rounded-full border border-good/40 bg-good/10 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-good"
                  title={d.narrative?.why || "Acute pain buyers must solve."}
                >
                  Painkiller
                </span>
              )}
              {drags.map((c) => (
                <span
                  key={c.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel2/80 px-2.5 py-0.5 font-mono text-[10px] text-muted"
                  title={`Weighted drag · band ${c.band}`}
                >
                  <span className="text-fg/80">{c.name}</span>
                  <span className="tabular-nums text-bad/90">{Math.round(c.score)}</span>
                </span>
              ))}
              {pivotal && (
                <span className="rounded-full border border-accent2/35 bg-accent2/10 px-2.5 py-0.5 font-mono text-[10px] text-accent2">
                  Lever · {pivotal}
                </span>
              )}
            </div>
          )}
          {(whyOpen || !summaryLong) && goalNote && goalNote !== summary && (
            <p className="max-w-3xl text-sm leading-relaxed text-muted">
              <span className="font-medium text-fg/70">Goal fit: </span>
              {goalNote}
            </p>
          )}
          {summaryLong && (
            <button
              type="button"
              onClick={() => setWhyOpen((o) => !o)}
              className="mt-1.5 font-mono text-[11px] uppercase tracking-wide text-accent2 hover:underline"
            >
              {whyOpen ? "− Less" : "+ Full rationale"}
            </button>
          )}
        </div>

        {/* 3 · Next to prove */}
        {(openQ || testStatus) && (
          <div className="folio-inset px-4 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent2">
                Next to prove
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor }} />
                <span style={{ color: statusColor }}>kill-test · {testStatus}</span>
              </div>
            </div>
            {openQ && (
              <p className="mt-2 text-sm font-medium leading-snug text-fg/90">{openQ}</p>
            )}
          </div>
        )}

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <PrimaryTag
              {...(primary.href
                ? { href: primary.href }
                : { type: "button" as const, onClick: primary.onClick, disabled: primaryDisabled })}
              className="inline-flex items-center gap-2 rounded-pill-pack bg-accent px-4 py-2.5 font-display text-sm font-bold tracking-tight text-on-accent transition hover:bg-accent2 disabled:opacity-50"
              title={primaryHint ?? undefined}
            >
              {primaryBusy && (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-on-accent/30 border-t-on-accent" />
              )}
              {primary.label}
              {!primaryBusy && <span aria-hidden>→</span>}
            </PrimaryTag>
            {secondary}
          </div>
          {primaryHint && (
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">{primaryHint}</p>
          )}
        </div>

        {/* Idea — collapsed by default */}
        <div className="border-t border-border/60 pt-4">
          <button
            type="button"
            onClick={() => setIdeaOpen((o) => !o)}
            className="flex w-full items-start gap-2 text-left"
          >
            <span className="mt-0.5 font-mono text-xs text-muted transition">
              {ideaExpanded ? "▾" : "▸"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                <span>Exhibit · {versionLabel}</span>
                <span className="normal-case tracking-normal text-fg/50">{goalLabel}</span>
              </div>
              {!ideaExpanded && (
                <p className="mt-0.5 line-clamp-1 text-sm text-fg/80">{title}</p>
              )}
            </div>
          </button>
          {ideaExpanded && (
            <div className="mt-2 pl-5">
              <h2 className="font-display text-sm font-bold text-fg">{title}</h2>
              <p className="mt-1 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-muted">
                {statement}
              </p>
              {rationale && <p className="mt-1.5 text-xs text-accent2">{rationale}</p>}
              {goalDetail && (
                <p className="mt-1 text-xs text-muted">Goal detail: {goalDetail}</p>
              )}
              {ideaExtras}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
