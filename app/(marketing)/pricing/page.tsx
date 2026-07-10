import Link from "next/link";
import type { Metadata } from "next";
import { CampaignPriceCard } from "@/components/CampaignPriceCard";
import { getSessionUser } from "@/lib/auth";
import { CAMPAIGN_RUN_CAP, priceCents } from "@/lib/billing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing — Validorian",
  description:
    "One clear price per idea: a full validation pass with full scored reports included and chat with the review while you iterate.",
};

/** Plain-language benefits — no internal feature names in titles. */
const INCLUDED = [
  {
    title: "A scored decision against your goal",
    body: "GO, MAYBE, or NO-GO based on demand, willingness to pay, competition, and risk — judged for a side hustle differently than a venture raise.",
  },
  {
    title: `${CAMPAIGN_RUN_CAP} full scored reports included`,
    body: "Each full analysis is a complete re-score of the idea (not a chat reply). Use them when you change the framing or learn something new. Most people need fewer than the full set.",
  },
  {
    title: "Unlimited questions on that idea",
    body: "Ask about the report, push on risks, clarify what to do next. Talking through the analysis never uses a full report.",
  },
  {
    title: "Try different angles side by side",
    body: "If the first framing is weak, compare a few alternative ways to position the same idea — scored on the same evidence so you can pick the stronger one.",
  },
  {
    title: "A practical test you can run this week",
    body: "Not just a score: who to talk to, what to ask, and what “pass” vs “stop” looks like before you build.",
  },
  {
    title: "Competitor context you can cite",
    body: "Pricing, funding, and positioning notes with sources — so you’re not guessing who else is in the market.",
  },
];

const FAQ = [
  {
    q: "What counts as a full analysis?",
    a: "A complete scored report — the main GO / MAYBE / NO-GO pass (or a re-score after you change the idea). Questions about the report, the buyer test plan, competitor notes, and browsing past versions do not count.",
  },
  {
    q: "Is this a subscription?",
    a: "No. You pay once per idea. A different idea is a new campaign when you’re ready.",
  },
  {
    q: "What if I use all the full reports?",
    a: "Your report, questions, and tools stay available. When you’re testing a different idea, start a new one — that opens a fresh campaign.",
  },
  {
    q: "Do I need to use every tool?",
    a: "No. Many people stop after one solid score and a clear next test. The extras are there if the first framing isn’t good enough.",
  },
  {
    q: "Can I try before I pay?",
    a: "Create an account and describe an idea in the studio. When billing is on, you unlock that idea’s campaign before the deep analysis runs.",
  },
];

export default async function PricingPage() {
  const user = await getSessionUser();
  const price = (priceCents() / 100).toFixed(0);
  const ctaHref = user ? "/studio" : "/signup";
  const ctaLabel = user ? "Open studio →" : "Validate my idea →";

  return (
    <div className="folio-enter">
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-16">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
          Pricing
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-fg sm:text-5xl">
          One idea. One price. A real decision.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
          Not credits. Not a charge for every question. One payment to pressure-test{" "}
          <em className="text-fg/80 not-italic">this</em> idea until GO, MAYBE, or NO-GO is
          clear.
        </p>
      </section>

      {/* Primary offer — same card as landing */}
      <section className="border-y border-border bg-panel/40 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <CampaignPriceCard
            ctaHref={ctaHref}
            ctaLabel={ctaLabel}
            className="mx-auto max-w-xl"
          />
        </div>
      </section>

      {/* What’s included */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          What you get
        </h2>
        <p className="mt-2 max-w-xl text-muted">
          Depth where it matters (full scored reports), freedom where it doesn’t (questions and
          tools). You don’t need to use everything.
        </p>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {INCLUDED.map((item) => (
            <li key={item.title} className="border-t-2 border-accent/35 pt-4">
              <h3 className="font-display text-lg font-bold tracking-tight">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* How pay works */}
      <section className="border-y border-border bg-panel/40 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            How it works
          </h2>
          <ol className="mt-8 grid gap-6 sm:grid-cols-3">
            {[
              {
                n: "01",
                t: "Describe the idea",
                b: "Open the studio and write what you’re offering, who it’s for, and what “success” means for you.",
              },
              {
                n: "02",
                t: "Unlock that idea",
                b: `One payment — $${price} — covers a full pass on that idea, including ${CAMPAIGN_RUN_CAP} scored reports.`,
              },
              {
                n: "03",
                t: "Decide with confidence",
                b: "Read the score, ask questions, try a sharper angle, or run a simple buyer test — until the answer is clear.",
              },
            ].map((s) => (
              <li key={s.n} className="folio p-5">
                <div className="font-mono text-[11px] font-semibold text-accent [letter-spacing:var(--tracking-eyebrow)]">
                  {s.n}
                </div>
                <h3 className="mt-2 font-display text-lg font-bold tracking-tight">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.b}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ — purchase friction only */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Common questions
        </h2>
        <p className="mt-2 max-w-xl text-sm text-muted">
          About price and what you’re buying — not a glossary of product terms.
        </p>
        <dl className="mt-8 max-w-2xl space-y-6">
          {FAQ.map((item) => (
            <div key={item.q}>
              <dt className="font-display text-base font-bold tracking-tight">{item.q}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-muted">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 text-center sm:px-6 sm:pb-24">
        <h2 className="font-display text-3xl font-extrabold tracking-tight">
          Ready for a hard read?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-muted">
          ${price} per idea · {CAMPAIGN_RUN_CAP} full scored reports · chat with the review on that
          idea
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
