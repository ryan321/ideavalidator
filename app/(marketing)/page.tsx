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
  "Buyer profile: who to sell to and where",
  "Real-world test plan (who to talk to, pass/fail)",
  "Social media search (Reddit, forums, and live web signals)",
  "Evidence-backed claims with sources",
  "Iterate: rewrite the pitch and re-score",
  "Variations: try different angles side by side",
  "Multiple full reports as the idea evolves",
  "Chat with the review: dig into scores, risks, and next steps",
];

const STEPS = [
  {
    n: "01",
    title: "Describe the idea",
    body: "What you're offering, who it's for, and why now, plus your goal so GO means the right thing for you.",
  },
  {
    n: "02",
    title: "Unlock & get a hard score",
    body: "One payment opens a full pass on that idea. You get an evidence-backed GO / MAYBE / NO-GO, not a pep talk.",
  },
  {
    n: "03",
    title: "Keep working it",
    body: "Rewrite the pitch, try a different angle, chat with the review, and re-score until the answer is clear.",
  },
];

export default async function LandingPage() {
  const user = await getSessionUser();
  const price = (priceCents() / 100).toFixed(0);
  const ctaHref = user ? "/studio" : "/signup";
  const ctaLabel = user ? "Open studio →" : "Validate my idea →";

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
              Don&apos;t pour time and money into an idea that was never going to work. Validate
              your business idea with a clear{" "}
              <em className="text-fg/85 not-italic">GO, MAYBE, or NO-GO</em> against{" "}
              <em className="text-fg/85 not-italic">your</em> goal, grounded in evidence, before
              you commit.
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
            <p className="mt-4 text-sm text-muted">
              {user ? (
                <>
                  Open the studio and describe an idea. Full validation is{" "}
                  <span className="font-medium text-fg/80">${price} per idea</span>.
                </>
              ) : (
                <>
                  <span className="font-medium text-fg/80">Account is free.</span> Unlock a full
                  pass for <span className="font-medium text-fg/80">${price}</span> when you&apos;re
                  ready to score that idea.
                </>
              )}
            </p>
            <p className="mt-2 font-mono text-[11px] text-muted">
              For solo founders, side projects, and first-time builders · private by default
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
            Not a single vague score. A full decision package from ${price} per idea.
          </p>
          <ul className="mt-10 grid gap-x-10 gap-y-3 sm:grid-cols-2">
            {WHAT_YOU_GET.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm leading-snug text-fg/90 sm:text-[15px]"
              >
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
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <p className="mt-2 max-w-xl text-muted">
            From first description to a decision you can act on, without going all-in first.
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

      {/* Why + verdict — one combined trust strip */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="folio flex flex-col gap-10 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 max-w-xl">
            <p className="font-mono text-[10px] uppercase text-muted [letter-spacing:var(--tracking-eyebrow)]">
              Why Validorian
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              A decision you can stand behind
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted">
              <li className="flex gap-2">
                <span className="font-medium text-accent" aria-hidden>
                  ·
                </span>
                <span>
                  <b className="font-medium text-fg/85">Scored for your goal.</b> Side hustle and
                  venture raise aren&apos;t graded the same.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-accent" aria-hidden>
                  ·
                </span>
                <span>
                  <b className="font-medium text-fg/85">Evidence, not vibes.</b> Demand and
                  competition checked against real sources.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-accent" aria-hidden>
                  ·
                </span>
                <span>
                  <b className="font-medium text-fg/85">Built to iterate.</b> One report is the
                  start; rewrite, compare angles, re-score until it&apos;s clear.
                </span>
              </li>
            </ul>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
            <p className="font-mono text-[10px] uppercase text-muted [letter-spacing:var(--tracking-eyebrow)]">
              The call
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="verdict-stamp text-sm text-good">GO</span>
              <span className="verdict-stamp text-sm text-warn">MAYBE</span>
              <span className="verdict-stamp text-sm text-bad">NO-GO</span>
            </div>
            <p className="max-w-xs text-left text-xs leading-relaxed text-muted sm:text-right">
              Walk away knowing whether to go ahead, pivot the angle, or stop, with a next test if
              you continue.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-border bg-panel/40 py-16 text-center sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            Ready for a hard read?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            {user ? (
              <>
                Open the studio, describe the idea, and run a full pass. ${price} unlocks that idea
                end-to-end.
              </>
            ) : (
              <>
                Create a free account, describe the idea, then unlock a full pass for ${price} when
                you&apos;re ready to score.
              </>
            )}
          </p>
          <Link
            href={ctaHref}
            className="mt-8 inline-flex rounded-pill-pack bg-accent px-8 py-3.5 font-display text-base font-bold text-on-accent transition hover:bg-accent2"
          >
            {ctaLabel}
          </Link>
          {!user && (
            <p className="mt-3 text-xs text-muted">
              No subscription. Pay once per idea.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
