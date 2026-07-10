import Link from "next/link";
import type { Metadata } from "next";
import { CampaignPriceCard } from "@/components/CampaignPriceCard";
import { getSessionUser } from "@/lib/auth";
import { CAMPAIGN_RUN_CAP, priceCents } from "@/lib/billing";
import { WHAT_YOU_GET } from "@/lib/marketing-copy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pricing · Validorian",
  description:
    "One clear price per idea: full scored reports, chat with the review, and tools to iterate until GO, MAYBE, or NO-GO is clear.",
};

const FAQ = [
  {
    q: "What counts as a full scored report?",
    a: "A complete GO / MAYBE / NO-GO analysis (or a re-score after you change the idea). Chat with the review, the buyer test plan, competitor notes, and browsing past versions do not count.",
  },
  {
    q: "Is this a subscription?",
    a: "No. You pay once per idea. A different idea is a new pass when you are ready.",
  },
  {
    q: "What if I use all the full reports?",
    a: "Your report, chat, and tools stay available. When you are testing a different idea, start a new one for a fresh pass.",
  },
  {
    q: "Do I need to use every tool?",
    a: "No. Many people stop after one solid score and a clear next test. The extras are there if the first framing is not good enough.",
  },
  {
    q: "Can I try before I pay?",
    a: "Yes. Create a free account and describe an idea in the studio. Unlock that idea for a full score when you are ready.",
  },
];

export default async function PricingPage() {
  const user = await getSessionUser();
  const price = (priceCents() / 100).toFixed(0);
  const ctaHref = user ? "/studio" : "/signup";
  const ctaLabel = user ? "Open studio →" : "Validate my idea →";

  return (
    <div className="folio-enter">
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-16">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
          Pricing
        </p>
        <h1 className="mt-3 max-w-xl font-display text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
          Simple: one price per idea
        </h1>
        <p className="mt-3 max-w-lg text-muted">
          Account is free. ${price} unlocks a full validation pass on that idea
          ({CAMPAIGN_RUN_CAP} full scored reports + chat with the review). No subscription.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14 sm:px-6 sm:pb-16">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,22rem)_1fr] lg:gap-14">
          <CampaignPriceCard
            ctaHref={ctaHref}
            ctaLabel={ctaLabel}
            className="w-full max-w-md lg:max-w-none"
          />

          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold tracking-tight">
              What&apos;s included
            </h2>
            <p className="mt-1 text-sm text-muted">
              Everything in a full validation. You don&apos;t need to use every item.
            </p>
            <ul className="mt-6 space-y-2.5">
              {WHAT_YOU_GET.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm leading-snug text-fg/90"
                >
                  <span className="mt-0.5 text-accent" aria-hidden>
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-panel/30 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-bold tracking-tight">Common questions</h2>
          <dl className="mt-8 grid max-w-3xl gap-6 sm:grid-cols-1">
            {FAQ.map((item) => (
              <div key={item.q}>
                <dt className="font-display text-base font-bold tracking-tight">{item.q}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted">{item.a}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-10 text-sm text-muted">
            Want the full product story?{" "}
            <Link href="/" className="text-accent hover:underline">
              Back to home →
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
