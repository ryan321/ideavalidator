import { Card, Section, Badge } from "@/components/ui";

const scoreColor = (n: number) =>
  n >= 70 ? "var(--color-good)" : n >= 45 ? "var(--color-warn)" : "var(--color-bad)";

type Pillar = { score: number; rationale: string };

type Criterion = {
  name: string;
  score: number;
  group: "demand" | "build";
  category: string;
  explanation: string;
};

function clampScore(n: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

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
  const score = clampScore(criterion?.score ?? 0);
  const color = scoreColor(score);
  const tone = criterion?.group === "demand" ? "accent" : undefined;
  return (
    <div className="rounded-xl border border-border bg-panel2 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-bold text-fg">
            {criterion?.name || "Untitled criterion"}
          </div>
          {criterion?.category ? (
            <div className="mt-1.5">
              <Badge tone={tone}>{criterion.category}</Badge>
            </div>
          ) : null}
        </div>
        <span
          className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-xs font-semibold"
          style={{ color, borderColor: color }}
        >
          {score}/100
        </span>
      </div>
      {criterion?.explanation ? (
        <p className="mt-2.5 text-xs leading-relaxed text-muted">
          {criterion.explanation}
        </p>
      ) : null}
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
  criteria: {
    name: string;
    score: number;
    group: "demand" | "build";
    category: string;
    explanation: string;
  }[];
}) {
  const v = validations ?? ({} as typeof validations);
  const list = Array.isArray(criteria) ? criteria : [];

  return (
    <Section title="Validation Scorecard">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <PillarCard title="Problem Validation" pillar={v?.problem} />
        <PillarCard title="Solution Validation" pillar={v?.solution} />
        <PillarCard title="Market Validation" pillar={v?.market} />
      </div>

      <div className="mt-5">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
          Detailed score explanations
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
