"use client";

import React, { useState } from "react";
import type { Validation } from "@/lib/generators/validation";
import {
  criterionWeight,
  normalizeGoal,
  type CriterionName,
} from "@/lib/scoring";

type Bands = { go: number; maybe: number };

/** Lowest-scoring criteria, ordered by how hard they drag the weighted mean. */
function dragCriteria(d: Validation, goal: string | null | undefined, n = 2) {
  const list = Array.isArray(d.criteria) ? d.criteria : [];
  return list
    .map((c) => ({
      name: c.name as CriterionName | string,
      score: c.score,
      band: c.band,
      weight: criterionWeight(c.name, goal),
      drag: Math.max(0, 72 - c.score) * criterionWeight(c.name, goal),
    }))
    .filter((c) => c.score < 72)
    .sort((a, b) => b.drag - a.drag || a.score - b.score)
    .slice(0, n);
}

function bandDistanceLine(score: number, bands: Bands, insufficient: boolean): string | null {
  if (insufficient) return null;
  const s = Math.round(score);
  if (s >= bands.go) {
    const over = s - bands.go;
    return over === 0
      ? `Sits on this goal's GO line (${bands.go})`
      : `${over} point${over === 1 ? "" : "s"} above this goal's GO line (${bands.go})`;
  }
  const toGo = bands.go - s;
  if (s >= bands.maybe) {
    return `${toGo} point${toGo === 1 ? "" : "s"} below this goal's GO line (${bands.go})`;
  }
  const toMaybe = bands.maybe - s;
  return `${toMaybe} point${toMaybe === 1 ? "" : "s"} below this goal's MAYBE line (${bands.maybe}) · ${toGo} short of GO`;
}

/**
 * Why this score — structured drivers + prose.
 * `compact` (workspace default): chips + short teaser; full rationale one click away.
 */
export function WhyThisScore({
  d,
  bands,
  color,
  goal,
  compact = false,
}: {
  d: Validation;
  bands: Bands;
  color: string;
  goal?: string | null;
  /** Collapse long prose so the decision zone stays scannable. */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(!compact);
  const goalKey = d.goal_scored ?? normalizeGoal(goal);
  const insufficient = d.verdict === "INSUFFICIENT EVIDENCE";
  const distance = bandDistanceLine(d.score, bands, insufficient);
  const drags = dragCriteria(d, goalKey);
  const vitamin = d.narrative?.verdict === "Vitamin";
  const painkiller = d.narrative?.verdict === "Painkiller";
  const pivotal = d.next_test?.pivotal_criterion?.trim() || null;
  const summary = typeof d.summary === "string" ? d.summary.trim() : "";
  const goalNote = typeof d.goal_fit_note === "string" ? d.goal_fit_note.trim() : "";

  if (!summary && !distance && drags.length === 0 && !pivotal && !vitamin) {
    return null;
  }

  const showFull = open || !compact;

  return (
    <section
      className="rounded-xl border bg-gradient-to-b from-panel2 to-panel p-4 sm:p-5"
      style={{ borderColor: `color-mix(in srgb, ${color} 28%, var(--color-border))` }}
      aria-label="Why this score"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
          Why this score
        </div>
        {distance && (
          <div className="font-mono text-[11px] tabular-nums" style={{ color }}>
            {distance}
          </div>
        )}
      </div>

      {(drags.length > 0 || vitamin || painkiller || pivotal) && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {vitamin && (
            <span
              className="rounded-full border border-warn/40 bg-warn/10 px-2.5 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide text-warn"
              title={d.narrative?.why || "Nice-to-have — harder to sell because no one is forced to act."}
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
              title={`Weighted drag on the score · band ${c.band}`}
            >
              <span className="text-fg/80">{c.name}</span>
              <span className="tabular-nums text-bad/90">{Math.round(c.score)}</span>
            </span>
          ))}
          {pivotal && (
            <span
              className="rounded-full border border-accent2/35 bg-accent2/10 px-2.5 py-0.5 font-mono text-[10px] text-accent2"
              title="The criterion whose resolution most likely exits this verdict band"
            >
              Lever · {pivotal}
            </span>
          )}
        </div>
      )}

      {summary && (
        <p
          className={`mt-3 max-w-3xl text-[15px] leading-relaxed text-fg/90 whitespace-pre-wrap ${
            showFull ? "" : "line-clamp-2"
          }`}
        >
          {summary}
        </p>
      )}

      {showFull && goalNote && goalNote !== summary && (
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">
          <span className="font-medium text-fg/70">Goal fit: </span>
          {goalNote}
        </p>
      )}

      {showFull && pivotal && d.next_test?.riskiest_assumption && (
        <p className="mt-2.5 max-w-3xl text-sm leading-relaxed text-muted">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent2">
            Next ·{" "}
          </span>
          Resolving <b className="text-fg/85">{pivotal}</b> moves this off the line —{" "}
          {d.next_test.riskiest_assumption}
        </p>
      )}

      {compact && (summary.length > 120 || goalNote || (pivotal && d.next_test?.riskiest_assumption)) && (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mt-2 font-mono text-[11px] uppercase tracking-wide text-accent2 hover:underline"
        >
          {open ? "− Less" : "+ Full rationale"}
        </button>
      )}
    </section>
  );
}
