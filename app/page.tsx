import Link from "next/link";
import { redirect } from "next/navigation";
import NewIdeaForm from "@/components/NewIdeaForm";
import { listIdeasForUser } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { verdictBands } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const ideas = listIdeasForUser(user.id);

  return (
    <div className="folio-enter space-y-12">
      {/* Hero thesis */}
      <header className="relative overflow-hidden">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
          Private · grounded · goal-relative
        </p>
        <h1 className="mt-3 max-w-2xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-fg sm:text-5xl">
          Put the idea on the table.
          <span className="mt-2 block text-muted">Get a hard read before you begin.</span>
        </h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          A scored GO / MAYBE / NO-GO report against <em className="text-fg/80 not-italic">your</em> goal —
          live evidence, real kill-tests, no pitch-deck theater.
        </p>
        <div className="rule-brass mt-8 max-w-md" />
      </header>

      {/* Compose surface */}
      <section className="folio p-5 sm:p-7" aria-labelledby="new-idea">
        <div className="mb-5">
          <h2 id="new-idea" className="font-display text-xl font-bold tracking-tight">
            New idea
          </h2>
          <p className="mt-1 text-sm text-muted">
            What you&apos;re offering, who it&apos;s for, and why now — the clearer that is, the better the read.
          </p>
        </div>
        <NewIdeaForm />
      </section>

      {/* Idea list */}
      <section aria-labelledby="your-ideas">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <h2 id="your-ideas" className="font-display text-xl font-bold tracking-tight">
            Your ideas
            <span className="ml-2 font-mono text-sm font-medium text-muted">({ideas.length})</span>
          </h2>
        </div>

        {ideas.length === 0 ? (
          <div className="folio-inset border-dashed py-14 text-center">
            <p className="font-display text-lg font-semibold text-fg/80">No ideas yet</p>
            <p className="mt-1 text-sm text-muted">Describe one above — validation starts right away.</p>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {ideas.map((idea) => {
              const bands = verdictBands(idea.goal);
              const score = idea.best_score;
              const tone =
                score == null
                  ? "var(--color-muted)"
                  : score >= bands.go
                    ? "var(--color-good)"
                    : score >= bands.maybe
                      ? "var(--color-warn)"
                      : "var(--color-bad)";
              return (
                <li key={idea.id}>
                  <Link
                    href={`/idea/${idea.id}`}
                    className="folio group flex h-full flex-col p-4 transition hover:border-accent/40 hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent)_25%,transparent)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                        {idea.goal?.replace("_", " ") ?? "idea"}
                      </span>
                      {score != null && (
                        <span
                          className="font-display text-2xl font-extrabold tabular-nums leading-none"
                          style={{ color: tone }}
                        >
                          {score}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 line-clamp-2 font-display text-base font-semibold leading-snug tracking-tight group-hover:text-accent2">
                      {idea.title.replace(/^#+\s*/, "").replace(/^Business Idea:\s*/i, "")}
                    </div>
                    {idea.revenue && (
                      <div className="mt-2 truncate font-mono text-xs text-accent2" title={idea.revenue}>
                        ~{idea.revenue}
                      </div>
                    )}
                    <div className="mt-auto flex flex-wrap gap-x-2 pt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                      <span>{new Date(idea.created_at).toLocaleDateString()}</span>
                      {idea.version_count > 1 && <span>· {idea.version_count} versions</span>}
                      {idea.cost && idea.cost > 0 && (
                        <span>
                          · ${idea.cost < 1 ? idea.cost.toFixed(3) : idea.cost.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
