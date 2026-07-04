import { Card } from "@/components/ui";
import { criterionTone as scoreColor } from "@/lib/scoring";

type Criterion = {
  name: string;
  score: number;
  band?: string; // the elicited letter band the score derives from
  group: "demand" | "build";
  category: string;
  explanation: string;
};

function FactorColumn({
  label,
  title,
  items,
}: {
  label: string;
  title: string;
  items: Criterion[];
}) {
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
      <h3 className="mt-0.5 text-base font-bold text-fg">{title}</h3>

      {items.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No factors available.</p>
      ) : (
        <div className="mt-4 space-y-5">
          {items.map((c, i) => {
            const score = Math.max(0, Math.min(100, Number(c.score) || 0));
            const color = scoreColor(score);
            return (
              <div key={`${c.name}-${i}`}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-fg/90">{c.name}</span>
                  <span
                    className="shrink-0 font-mono text-sm font-bold tabular-nums"
                    style={{ color }}
                    title={c.band ? `Banded ${c.band} by the model; the number is the code-side mapping.` : undefined}
                  >
                    {c.band ? `${c.band} · ` : ""}
                    {score}/100
                  </span>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${score}%`, background: color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

export function FactorBars({ criteria }: { criteria: Criterion[] }) {
  const list = Array.isArray(criteria) ? criteria : [];
  const demand = list.filter((c) => c?.group === "demand");
  const build = list.filter((c) => c?.group === "build");

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FactorColumn label="Demand & Market" title="Will people buy?" items={demand} />
      <FactorColumn label="Execution & Fit" title="Can you win & keep it?" items={build} />
    </div>
  );
}
