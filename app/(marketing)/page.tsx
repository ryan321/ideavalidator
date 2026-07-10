import Link from "next/link";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    n: "01",
    title: "Describe the idea",
    body: "What you're offering, who it's for, and why now — plus your goal, so GO means the right thing.",
  },
  {
    n: "02",
    title: "Get a grounded score",
    body: "Evidence-backed GO / MAYBE / NO-GO: demand, willingness to pay, competition, risks, and a clear next test.",
  },
  {
    n: "03",
    title: "Iterate in the studio",
    body: "Rewrite, add context, compare angles head-to-head, re-score — until the answer is clear.",
  },
];

const PILLARS = [
  {
    title: "Goal-relative",
    body: "Side hustle and venture-scale aren't judged the same. Verdict bands match what you're actually going for.",
  },
  {
    title: "Evidence, not vibes",
    body: "Live web grounding and fetched demand signals — so claims have sources, not just confidence theater.",
  },
  {
    title: "Built to iterate",
    body: "Versions, wedges, and re-validation are first-class. One report is the start, not the product.",
  },
];

export default async function LandingPage() {
  const user = await getSessionUser();
  const ctaHref = user ? "/studio" : "/signup";
  const ctaLabel = user ? "Open studio →" : "Start free →";

  return (
    <div className="folio-enter">
      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-20">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
          Business validation studio
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-fg sm:text-6xl">
          Put the idea on the table.
          <span className="mt-2 block text-muted">Validate it before you begin.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
          Premier GO / MAYBE / NO-GO reads against <em className="text-fg/80 not-italic">your</em> goal —
          grounded in evidence, designed so you can iterate until the answer is obvious.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href={ctaHref}
            className="rounded-pill-pack bg-accent px-6 py-3 font-display text-base font-bold text-on-accent transition hover:bg-accent2"
          >
            {ctaLabel}
          </Link>
          {!user && (
            <Link
              href="/login"
              className="rounded-pill-pack border border-border px-5 py-3 text-sm font-medium text-muted transition hover:border-accent/40 hover:text-fg"
            >
              Sign in
            </Link>
          )}
        </div>
        <p className="mt-4 font-mono text-[11px] text-muted">
          Private by default · goal-relative scoring · real kill-tests
        </p>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-panel/40 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
          <p className="mt-2 max-w-xl text-muted">
            Not a one-shot score. A studio loop from first read to a decision you can act on.
          </p>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="folio p-5">
                <div className="font-mono text-[11px] font-semibold text-accent [letter-spacing:var(--tracking-eyebrow)]">
                  {s.n}
                </div>
                <h3 className="mt-2 font-display text-lg font-bold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pillars */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">Why Validorian</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.title} className="border-t-2 border-accent/40 pt-4">
              <h3 className="font-display text-lg font-bold tracking-tight">{p.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Verdict preview strip */}
      <section className="border-y border-border bg-panel/50 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="folio flex flex-col items-start gap-8 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
            <div>
              <p className="font-mono text-[10px] uppercase text-muted [letter-spacing:var(--tracking-eyebrow)]">
                The deliverable
              </p>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                A decision you can stand behind
              </h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-muted">
                Scored criteria, obtainable revenue, competitive landscape, risks, and a pre-registered
                kill-test — then tools to rewrite the angle and re-score.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="verdict-stamp text-sm text-good">GO</span>
              <span className="verdict-stamp text-sm text-warn">MAYBE</span>
              <span className="verdict-stamp text-sm text-bad">NO-GO</span>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Ready for a hard read?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted">
          Open the studio, describe the idea, and get a grounded first pass — then keep working it.
        </p>
        <Link
          href={ctaHref}
          className="mt-8 inline-flex rounded-pill-pack bg-accent px-8 py-3.5 font-display text-base font-bold text-on-accent transition hover:bg-accent2"
        >
          {ctaLabel}
        </Link>
      </section>
    </div>
  );
}
