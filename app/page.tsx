import Link from "next/link";
import NewIdeaForm from "@/components/NewIdeaForm";
import { SectionHead } from "@/components/ui";
import { listIdeas } from "@/lib/db";
import { verdictBands } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default function Home() {
  const ideas = listIdeas();
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Validate an idea</h1>
        <p className="mt-1 text-sm text-muted">
          A grounded, scored GO/NO-GO report — then refine, re-validate, and pick the winning
          version.
        </p>
      </div>

      <div className="mb-10">
        <NewIdeaForm />
      </div>

      <SectionHead title={`Your ideas (${ideas.length})`} />
      {ideas.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-panel/40 py-12 text-center text-sm text-muted">
          No ideas yet. Describe one above to get started.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {ideas.map((idea) => (
            <li key={idea.id}>
              <Link
                href={`/idea/${idea.id}`}
                className="block rounded-xl border border-border bg-panel p-4 transition hover:border-accent/50 hover:bg-panel2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="line-clamp-2 font-medium">
                    {idea.title.replace(/^#+\s*/, "").replace(/^Business Idea:\s*/i, "")}
                  </div>
                  {idea.best_score != null && (
                    <span
                      className="shrink-0 rounded-md px-2 py-0.5 font-mono text-sm font-bold"
                      style={{
                        // judged against the idea's OWN goal bands (lib/scoring.ts)
                        color:
                          idea.best_score >= verdictBands(idea.goal).go
                            ? "var(--color-good)"
                            : idea.best_score >= verdictBands(idea.goal).maybe
                              ? "var(--color-warn)"
                              : "var(--color-bad)",
                        background: "color-mix(in srgb, currentColor 14%, transparent)",
                      }}
                    >
                      {idea.best_score}
                    </span>
                  )}
                </div>
                {idea.revenue && (
                  <div
                    className="mt-1 truncate font-mono text-xs text-accent2"
                    title={idea.revenue}
                  >
                    ~{idea.revenue}
                  </div>
                )}
                <div className="mt-1 text-xs text-muted">
                  {new Date(idea.created_at).toLocaleString()}
                  {idea.version_count > 1 ? ` · ${idea.version_count} versions` : ""}
                  {idea.cost && idea.cost > 0
                    ? ` · spent $${idea.cost < 1 ? idea.cost.toFixed(3) : idea.cost.toFixed(2)}`
                    : ""}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
