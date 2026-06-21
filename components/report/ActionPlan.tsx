import { Card, Section } from "@/components/ui";

type Step = {
  title: string;
  rationale: string;
  type: "VALIDATE" | "BUILD" | "DISTRIBUTE" | "DE-RISK";
  effort: "Low" | "Medium" | "High";
  horizon: "This week" | "This month" | "This quarter";
  success_metric: string;
  first_step: string;
};

const TYPE_PILL: Record<Step["type"], string> = {
  VALIDATE: "bg-good/15 text-good",
  BUILD: "bg-accent/15 text-accent",
  DISTRIBUTE: "bg-accent2/15 text-accent2",
  "DE-RISK": "bg-bad/15 text-bad",
};

const EFFORT_DOT: Record<Step["effort"], string> = {
  Low: "bg-good",
  Medium: "bg-warn",
  High: "bg-bad",
};

export function ActionPlan({ steps }: { steps: Step[] }) {
  const list = Array.isArray(steps) ? steps : [];

  return (
    <Section
      title="What to do next"
      right={
        <span className="text-xs text-muted">
          Ordered by impact x ease. Start at the top.
        </span>
      }
    >
      {list.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">No action items yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((step, i) => (
            <Card key={i} className="flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
                  {i + 1}
                </span>
                <h4 className="mt-0.5 text-sm font-semibold leading-snug text-fg">
                  {step.title}
                </h4>
              </div>

              <p className="text-sm leading-relaxed text-muted">
                {step.rationale}
              </p>

              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span
                  className={`rounded-full px-2 py-0.5 font-medium ${
                    TYPE_PILL[step.type] ?? "bg-accent/15 text-accent"
                  }`}
                >
                  {step.type}
                </span>

                <span className="inline-flex items-center gap-1.5 text-muted">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      EFFORT_DOT[step.effort] ?? "bg-muted"
                    }`}
                  />
                  {step.effort}
                </span>

                <span className="inline-flex items-center gap-1 text-muted">
                  <span aria-hidden="true">⏱</span>
                  {step.horizon}
                </span>
              </div>

              <div className="flex items-center gap-2 border-t border-border pt-2 font-mono text-xs text-muted">
                <span className="text-good" aria-hidden="true">
                  ✓
                </span>
                <span className="leading-relaxed">{step.success_metric}</span>
              </div>

              <div className="mt-auto rounded-lg bg-panel2 px-3 py-2 text-sm leading-relaxed">
                <span className="font-medium text-accent">→ Start: </span>
                <span className="text-fg/90">{step.first_step}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}
