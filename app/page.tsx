import Link from "next/link";
import NewIdeaForm from "@/components/NewIdeaForm";
import { listIdeas } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function Home() {
  const ideas = listIdeas();
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Validate an idea</h1>
        <p className="mt-1 text-sm text-muted">
          A grounded, scored GO/NO-GO report plus a full launch kit — brand, market, plan, marketing
          and pitch — generated on demand.
        </p>
      </div>

      <div className="mb-10">
        <NewIdeaForm />
      </div>

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        Your ideas ({ideas.length})
      </h2>
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
                  <div className="font-medium">{idea.title}</div>
                  {idea.best_score != null && (
                    <span
                      className="shrink-0 rounded-md px-2 py-0.5 font-mono text-sm font-bold"
                      style={{
                        color:
                          idea.best_score >= 70
                            ? "var(--color-good)"
                            : idea.best_score >= 45
                              ? "var(--color-warn)"
                              : "var(--color-bad)",
                        background: "color-mix(in srgb, currentColor 14%, transparent)",
                      }}
                    >
                      {idea.best_score}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-muted">
                  {new Date(idea.created_at).toLocaleString()}
                  {idea.version_count > 1 ? ` · ${idea.version_count} versions` : ""}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
