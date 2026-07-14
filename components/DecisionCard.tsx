"use client";

import React, { useState } from "react";
import type { Validation } from "@/lib/generators/validation";
import {
  MEASURED_SCORE_SD,
  criterionWeight,
  normalizeGoal,
  type CriterionName,
} from "@/lib/scoring";
import type { TranslateFn } from "@/lib/i18n/t";
import { criterionLabel, verdictLabel } from "@/lib/i18n/t";
import { ScoreRing } from "./VerdictBox";
import { useT } from "./LocaleProvider";

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

function distanceLine(
  score: number,
  bands: Bands,
  insufficient: boolean,
  t: TranslateFn
): string | null {
  if (insufficient) return null;
  const s = Math.round(score);
  if (s >= bands.go) {
    const over = s - bands.go;
    return over === 0
      ? t("decision.onGo", { go: bands.go, line: t("verdict.go") })
      : t("decision.aboveGo", { n: over, go: bands.go, line: t("verdict.go") });
  }
  if (s >= bands.maybe)
    return t("decision.underGo", {
      n: bands.go - s,
      go: bands.go,
      line: t("verdict.go"),
    });
  return t("decision.underMaybe", {
    n: bands.maybe - s,
    maybe: bands.maybe,
    line: t("verdict.maybe"),
  });
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
  const t = useT();
  const [ideaOpen, setIdeaOpen] = useState(false);
  const ideaExpanded = ideaOpen || !!ideaExtras;

  const goalKey = d.goal_scored ?? normalizeGoal(goal);
  const insufficient = d.verdict === "INSUFFICIENT EVIDENCE";
  const score = Math.round(d.score);
  const dist = distanceLine(score, bands, insufficient, t);
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

  return (
    <section
      className="folio folio-enter mb-6 overflow-hidden"
      aria-label={t("a11y.decisionSurface")}
    >
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
            {verdictLabel(d.verdict, t)}
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
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">
            {t("decision.validationRead")}
          </p>
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
        </div>
        {revenue && (
          <div className="text-center sm:text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              {t("decision.obtainableYr")}
            </div>
            <div className="mt-1 font-display text-2xl font-extrabold leading-none tracking-tight text-accent2 sm:text-3xl">
              {revenue}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-5 px-5 py-5 sm:px-7">
        {/* 2 · Why this score — the focal, plain-English explanation */}
        <div
          className="rounded-xl border p-4 sm:p-5"
          style={{
            borderColor: `color-mix(in srgb, ${color} 32%, var(--color-border))`,
            background: `color-mix(in srgb, ${color} 5%, var(--color-panel))`,
          }}
        >
          <div
            className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{ color }}
          >
            {t("decision.whyThisScore")}
          </div>
          {(drags.length > 0 || vitamin || painkiller || pivotal) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {vitamin && (
                <span
                  className="rounded-full border border-warn/40 bg-warn/10 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-warn"
                  title={d.narrative?.why || "Nice-to-have — harder to sell."}
                >
                  {t("report.vitamin")}
                </span>
              )}
              {painkiller && (
                <span
                  className="rounded-full border border-good/40 bg-good/10 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-good"
                  title={d.narrative?.why || "Acute pain buyers must solve."}
                >
                  {t("report.painkiller")}
                </span>
              )}
              {drags.map((c) => (
                <span
                  key={c.name}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-panel2/80 px-2.5 py-0.5 font-mono text-[10px] text-muted"
                  title={`Weighted drag · band ${c.band}`}
                >
                  <span className="text-fg/80">{criterionLabel(c.name, t)}</span>
                  <span className="tabular-nums text-bad/90">{Math.round(c.score)}</span>
                </span>
              ))}
              {pivotal && (
                <span className="rounded-full border border-accent2/35 bg-accent2/10 px-2.5 py-0.5 font-mono text-[10px] text-accent2">
                  {t("report.lever", { name: criterionLabel(pivotal, t) })}
                </span>
              )}
            </div>
          )}
          {summary && (
            <p className="mt-3 max-w-3xl whitespace-pre-wrap text-[15px] leading-relaxed text-fg/90">
              {summary}
            </p>
          )}
          {goalNote && goalNote !== summary && (
            <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-muted">
              <span className="font-medium text-fg/70">{t("decision.goalFit")} </span>
              {goalNote}
            </p>
          )}
        </div>

        {/* 3 · Next to prove */}
        {(openQ || testStatus) && (
          <div className="folio-inset px-4 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent2">
                {t("report.nextToProve")}
              </div>
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor }} />
                <span style={{ color: statusColor }}>
                  {t("campaign.killTest", { status: testStatus })}
                </span>
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
                : {
                    type: "button" as const,
                    onClick: primary.onClick,
                    disabled: primaryDisabled,
                    "aria-busy": primaryBusy || undefined,
                  })}
              className="inline-flex items-center gap-2 rounded-pill-pack bg-accent px-4 py-2.5 font-display text-sm font-bold tracking-tight text-on-accent transition hover:bg-accent2 disabled:opacity-50"
              title={primaryHint ?? undefined}
            >
              {primaryBusy && (
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-on-accent/30 border-t-on-accent"
                  aria-hidden
                />
              )}
              {primaryBusy ? t("a11y.working") : primary.label}
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
            aria-expanded={ideaExpanded}
            aria-label={
              ideaExpanded ? t("a11y.hideIdeaDetails") : t("a11y.showIdeaDetails")
            }
            className="flex w-full items-start gap-2 text-left"
          >
            <span className="mt-0.5 font-mono text-xs text-muted transition" aria-hidden>
              {ideaExpanded ? "▾" : "▸"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                <span>
                  {t("report.exhibit")} · {versionLabel}
                </span>
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
                <p className="mt-1 text-xs text-muted">
                  {t("report.goalDetail")} {goalDetail}
                </p>
              )}
              {ideaExtras}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
