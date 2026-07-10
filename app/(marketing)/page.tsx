import Link from "next/link";
import { CampaignPriceCard } from "@/components/CampaignPriceCard";
import { getSessionUser } from "@/lib/auth";
import { priceCents } from "@/lib/billing";

export const dynamic = "force-dynamic";

/** Concrete deliverables in a validation pass — checklist, not prose cards. */
const WHAT_YOU_GET = [
  "GO / MAYBE / NO-GO scored against your goal",
  "Demand analysis (how badly people want this)",
  "Willingness-to-pay read",
  "Competition review",
  "Obtainable revenue estimate",
  "Risk map (what can kill it)",
  "Buyer profile — who to sell to and where",
  "Real-world test plan (who to talk to, pass/fail)",
  "Social media search (Reddit, forums, and live web signals)",
  "Evidence-backed claims with sources",
  "Iterate: rewrite the pitch and re-score",
  "Variations: try different angles side by side",
  "Multiple full reports as the idea evolves",
  "Chat with the review — dig into scores, risks, and next steps",
];

const STEPS = [
  {
    n: "01",
    title: "Describe the idea",
    body: "What you're offering, who it's for, and why now — plus your goal, so GO means the right thing for you.",
  },
  {
    n: "02",
    title: "Get a grounded score",
    body: "Evidence-backed GO / MAYBE / NO-GO: demand, willingness to pay, competition, risks, and a clear next test.",
  },
  {
    n: "03",
    title: "Keep working it",
    body: "Rewrite the pitch, try a different angle, ask questions, re-score — until the answer is clear.",
  },
];

const PILLARS = [
  {
    title: "Scored for your goal",
    body: "A side hustle and a venture raise aren't judged the same. The bar matches what you're actually going for.",
  },
  {
    title: "Evidence, not vibes",
    body: "Claims are checked against real sources and demand signals — not confidence theater.",
  },
  {
    title: "Built to iterate",
    body: "One report is the start, not the product. Rewrite the angle, re-score, and keep going until it's clear.",
  },
];

export default async function LandingPage() {
  const user = await getSessionUser();
  const ctaHref = user ? "/studio" : "/signup";
  const ctaLabel = user ? "Open studio →" : "Start free →";

  return (
    <div className="folio-enter">
      {/* Hero + price card */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_minmax(0,22rem)] lg:gap-12 xl:grid-cols-[1fr_minmax(0,24rem)]">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
              Business validation studio
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-fg sm:text-6xl">
              Put your business idea on the table.
              <span className="mt-2 block text-muted">Validate it before you begin.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Premier GO / MAYBE / NO-GO reads against{" "}
              <em className="text-fg/80 not-italic">your</em> goal — grounded in evidence,
              designed so you can iterate until the answer is obvious.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={ctaHref}
                className="rounded-pill-pack bg-accent px-6 py-3 font-display text-base font-bold text-on-accent transition hover:bg-accent2"
              >
                {ctaLabel}
              </Link>
              <Link
                href="/pricing"
                className="rounded-pill-pack border border-border px-5 py-3 text-sm font-medium text-muted transition hover:border-accent/40 hover:text-fg"
              >
                Pricing details
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
              Private by default · scored for your goal · a real next test
            </p>
          </div>

          <div className="w-full max-w-md justify-self-center lg:max-w-none lg:justify-self-end">
            <CampaignPriceCard
              ctaHref={ctaHref}
              ctaLabel={ctaLabel}
              detailsHref="/pricing"
            />
          </div>
        </div>
      </section>

      {/* What this service does — deliverable checklist */}
      <section className="border-t border-border bg-panel/30 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
            What you get
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Everything in a full validation
          </h2>
          <p className="mt-2 max-w-xl text-muted">
            One pass covers the decision surface — not a single vague score. From $
            {(priceCents() / 100).toFixed(0)} per idea.
          </p>
          <ul className="mt-10 grid gap-x-10 gap-y-3 sm:grid-cols-2">
            {WHAT_YOU_GET.map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm leading-snug text-fg/90 sm:text-[15px]">
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent"
                  aria-hidden
                >
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
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
                Demand, revenue potential, competition, and risks — plus a simple test you can run
                with real people before you build. Then rewrite the angle and re-score if you need to.
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
          Open the studio, describe the idea, and get a hard first read — then keep working it.
          One clear price per idea: depth on full reports, not a charge for every question.
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
