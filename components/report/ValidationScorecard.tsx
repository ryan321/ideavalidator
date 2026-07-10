"use client";

import { Card, Section, Badge } from "@/components/ui";
import { criterionLabel } from "@/lib/i18n/t";
import { criterionTone as scoreColor } from "@/lib/scoring";
import { useT } from "../LocaleProvider";
import { LeverChip } from "./chips";
import { SpreadMarker } from "./SpreadMarker";

type Pillar = { score: number; rationale: string };

type Criterion = {
  name: string;
  score: number;
  band?: string; // the elicited letter band the score derives from
  group: "demand" | "build";
  category: string;
  explanation: string;
  lever?: string; // positioning | evidence | execution | exogenous
  lever_action?: string; // the ONE concrete line that would move this criterion
  spread?: number; // k-sample disagreement (max−min) when it exceeded threshold
  // VERBALIZED PROBABILITY — only on the two forecast criteria (Market Timing,
  // Competitive Position). The band/score above was DERIVED from this probability.
  forecast?: { event: string; probability: number };
};

function clampScore(n: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

// Plain-English meaning for each criterion, shown on hover so a non-startup-native
// founder knows what the score is actually measuring.
const CRITERIA_HELP: Record<string, string> = {
  "Demand Strength": "How many people actively feel this problem and want it solved.",
  "Willingness to Pay": "Whether those people will actually open their wallet, and how much.",
  "Problem-Solution Fit": "Evidence this solution mechanism demonstrably delivers the outcome.",
  "Retention & Recurrence": "How often the problem comes back, and whether value compounds with use.",
  "Market Timing": "Why now — a verified enabling change that makes this the right moment.",
  "Competitive Position": "How open the market structure is to any good new entrant.",
  "Differentiation / Moat": "Your specific edge, classified as a real power (or not one).",
  "Acquisition Ease": "The market's channel structure: known category, budget line, sales cycle.",
  "Founder Fit": "Your skills, domain insight, capital, and distribution access for this.",
  "Goal Fit": "How well the idea matches the goal, time, and budget you set.",
};

function PillarCard({ title, pillar }: { title: string; pillar?: Pillar }) {
  const raw = pillar?.score ?? 0;
  const score = clampScore(raw);
  const color = scoreColor(score);
  return (
    <Card className="flex flex-col">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="text-sm font-semibold text-fg">{title}</h4>
        <div className="font-mono text-lg font-bold leading-none" style={{ color }}>
          {score}
          <span className="text-xs font-medium text-muted">/100</span>
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-panel2">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        {pillar?.rationale || "No rationale provided."}
      </p>
    </Card>
  );
}

function CriterionCard({ criterion }: { criterion: Criterion }) {
  const t = useT();
  const score = clampScore(criterion?.score ?? 0);
  const color = scoreColor(score);
  const tone = criterion?.group === "demand" ? "accent" : undefined;
  const label = criterionLabel(criterion?.name, t) || t("report.untitledCriterion");
  return (
    <div className="rounded-xl border border-border bg-panel2 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div
            className="truncate text-sm font-bold text-fg"
            title={CRITERIA_HELP[criterion?.name] ?? undefined}
          >
            {label}
            {CRITERIA_HELP[criterion?.name] && <span className="ml-1 cursor-help text-xs text-muted">ⓘ</span>}
          </div>
          {(criterion?.category || criterion?.lever || criterion?.spread) ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {criterion?.category ? <Badge tone={tone}>{criterion.category}</Badge> : null}
              <LeverChip lever={criterion?.lever} />
              <SpreadMarker spread={criterion?.spread} />
            </div>
          ) : null}
        </div>
        <span
          className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-xs font-semibold"
          style={{ color, borderColor: color }}
          title={criterion?.band ? `Banded ${criterion.band} by the model; the number is the code-side mapping.` : undefined}
        >
          {criterion?.band ? `${criterion.band} · ` : ""}
          {score}/100
        </span>
      </div>
      {criterion?.explanation ? (
        <p className="mt-2.5 text-xs leading-relaxed text-muted">
          {criterion.explanation}
        </p>
      ) : null}
      {criterion?.lever_action ? (
        <p className="mt-2 text-[11px] leading-snug">
          {criterion.lever === "evidence" ? (
            <span className="text-warn">→ test it, don&apos;t reword it: </span>
          ) : (
            <span className="text-muted/70">→ </span>
          )}
          <span className="text-muted">{criterion.lever_action}</span>
        </p>
      ) : null}
      {criterion?.forecast ? <ForecastRow forecast={criterion.forecast} /> : null}
    </div>
  );
}

// VERBALIZED PROBABILITY — on the two forecast criteria, the score above is DERIVED
// from a stated probability of a concrete, checkable event (lib/scoring.ts
// forecastToBand). Surface both so the founder sees the forecast behind the number.
function ForecastRow({ forecast }: { forecast: { event: string; probability: number } }) {
  const pct = Math.round(Math.max(0, Math.min(1, forecast.probability)) * 100);
  return (
    <div
      className="mt-2.5 rounded-lg border border-accent2/25 bg-accent2/[0.05] px-2.5 py-2"
      title="The band and score above were DERIVED from this stated probability via a fixed monotonic map — so the number is auditable against the forecast, not just a vibe."
    >
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[9px] uppercase tracking-wide text-accent2">Forecast</span>
        <span className="font-mono text-sm font-bold tabular-nums text-accent2">P = {pct}%</span>
        <span className="font-mono text-[10px] text-muted">→ band derived from this</span>
      </div>
      <p className="mt-1 text-[11px] leading-snug text-fg/80">{forecast.event}</p>
    </div>
  );
}

export function ValidationScorecard({
  validations,
  criteria,
}: {
  validations: {
    problem: { score: number; rationale: string };
    solution: { score: number; rationale: string };
    market: { score: number; rationale: string };
  };
  criteria: Criterion[];
}) {
  const t = useT();
  const v = validations ?? ({} as typeof validations);
  const list = Array.isArray(criteria) ? criteria : [];

  return (
    <Section title={t("report.validationScorecard")}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PillarCard title={t("report.problemValidation")} pillar={v?.problem} />
        <PillarCard title={t("report.solutionValidation")} pillar={v?.solution} />
        <PillarCard title={t("report.marketValidation")} pillar={v?.market} />
      </div>

      <div className="mt-5">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          {t("report.detailedScores")}
        </h4>
        {list.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {list.map((c, i) => (
              <CriterionCard key={`${c?.name ?? "criterion"}-${i}`} criterion={c} />
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-muted">No criterion explanations available.</p>
          </Card>
        )}
      </div>
    </Section>
  );
}
