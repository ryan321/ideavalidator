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
    <section
      className="mb-5 overflow-hidden rounded-2xl border bg-gradient-to-b from-panel2 to-panel"
      style={{ borderColor: `color-mix(in srgb, ${color} 32%, var(--color-border))` }}
      aria-label="Decision"
    >
      {/* 1 · Score — ring leads; verdict + revenue sit beside it */}
      <div className="relative grid gap-4 border-b border-border/70 px-4 py-4 sm:grid-cols-[auto_1fr] sm:items-center sm:px-5 sm:py-5">
        {variantCount > 1 && versionN != null && (
          <span
            className="absolute right-3 top-3 z-10 rounded-lg border border-border bg-panel2 px-2.5 py-1 font-mono text-base font-bold tabular-nums text-fg shadow-sm sm:right-4 sm:top-4 sm:text-lg"
            title={`Variant ${versionN} of ${variantCount}`}
          >
            v{versionN}
          </span>
        )}
        <ScoreRing
          score={score}
          sd={sd}
          color={color}
          bands={bands}
          insufficient={insufficient}
        />
        <div className="min-w-0 text-center sm:pr-14 sm:text-left">
          <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 sm:justify-start">
            <span
              className={`font-display font-bold leading-none tracking-tight ${
                insufficient ? "text-2xl" : "text-3xl sm:text-4xl"
              }`}
              style={{ color }}
            >
              {d.verdict}
            </span>
            {typeof d.confidence === "number" && (
              <span className="font-mono text-[11px] text-muted">{d.confidence}% conf.</span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-[11px] text-muted sm:justify-start">
            {dist && <span style={{ color }}>{dist}</span>}
            {borderline && (
              <span className="rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-warn">
                borderline · ±{sd} of {borderline}
              </span>
            )}
          </div>
          {revenue && (
            <div className="mt-3">
              <div className="font-mono text-xl font-bold leading-tight text-accent2 sm:text-2xl">
                {revenue}
              </div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                obtainable / yr
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        {/* 2 · Why this score — second thing the founder cares about, not a footnote */}
        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              Why this score
            </div>
            {dist && (
              <div className="font-mono text-[11px] tabular-nums" style={{ color }}>
                {dist}
              </div>
            )}
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
          {summary && (
            <p
              className={`max-w-3xl text-[15px] leading-relaxed text-fg/90 ${
                whyOpen || !summaryLong ? "whitespace-pre-wrap" : "line-clamp-3"
              }`}
            >
              {summary}
            </p>
          )}
          {(whyOpen || !summaryLong) && goalNote && goalNote !== summary && (
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
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

        {/* 3 · Next to prove + primary CTA */}
        {(openQ || testStatus) && (
          <div className="rounded-lg border border-border/80 bg-bg/40 px-3.5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent2">
                Next to prove
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor }} />
                <span style={{ color: statusColor }}>kill-test · {testStatus}</span>
              </div>
            </div>
            {openQ && (
              <p className="mt-1.5 text-sm font-medium leading-snug text-fg/90">{openQ}</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <PrimaryTag
            {...(primary.href
              ? { href: primary.href }
              : { type: "button" as const, onClick: primary.onClick, disabled: primaryDisabled })}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {primaryBusy && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            )}
            {primary.label}
            {!primaryBusy && <span aria-hidden>→</span>}
          </PrimaryTag>
          {secondary}
        </div>

        {/* Idea — collapsed by default */}
        <div className="border-t border-border/60 pt-3">
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
                <span>Idea · {versionLabel}</span>
                <span className="normal-case tracking-normal text-fg/50">{goalLabel}</span>
              </div>
              {!ideaExpanded && (
                <p className="mt-0.5 line-clamp-1 text-sm text-fg/80">{title}</p>
              )}
            </div>
          </button>
          {ideaExpanded && (
            <div className="mt-2 pl-5">
              <h2 className="text-sm font-semibold text-fg">{title}</h2>
              <p className="mt-1 max-w-3xl whitespace-pre-wrap text-sm leading-relaxed text-muted">
                {statement}
              </p>
              {rationale && <p className="mt-1.5 text-xs text-accent">{rationale}</p>}
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
