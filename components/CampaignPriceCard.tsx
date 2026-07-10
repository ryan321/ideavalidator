import Link from "next/link";
import { CAMPAIGN_RUN_CAP, priceCents } from "@/lib/billing";

/**
 * Primary pricing offer — shared by landing and /pricing so the promise stays identical.
 */
export function CampaignPriceCard({
  ctaHref,
  ctaLabel,
  detailsHref,
  className = "",
}: {
  ctaHref: string;
  ctaLabel: string;
  /** Optional “see full pricing” link under the CTA (landing). */
  detailsHref?: string;
  className?: string;
}) {
  const price = (priceCents() / 100).toFixed(0);

  return (
    <div
      className={`folio border-accent/35 p-6 sm:p-8 ${className}`}
      id="pricing"
    >
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
        Per idea
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-5xl font-extrabold tracking-tight text-fg">
          ${price}
        </span>
        <span className="text-sm text-muted">one-time · that idea</span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        <span className="font-medium text-fg/85">
          {CAMPAIGN_RUN_CAP} full scored reports included
        </span>
        , plus chat with the review and tools while you work that idea.
      </p>
      <ul className="mt-5 space-y-2 text-sm text-fg/85">
        <li className="flex gap-2">
          <span className="text-accent" aria-hidden>
            ✓
          </span>
          GO / MAYBE / NO-GO scored against your goal
        </li>
        <li className="flex gap-2">
          <span className="text-accent" aria-hidden>
            ✓
          </span>
          Re-score, variations, and iterate as the idea changes
        </li>
        <li className="flex gap-2">
          <span className="text-accent" aria-hidden>
            ✓
          </span>
          Chat with the review — not metered like credits
        </li>
      </ul>
      <Link
        href={ctaHref}
        className="mt-7 inline-flex w-full items-center justify-center rounded-pill-pack bg-accent px-6 py-3 font-display text-base font-bold text-on-accent transition hover:bg-accent2"
      >
        {ctaLabel}
      </Link>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        Account is free. Unlock this idea for ${price} when you run a full score.
        {detailsHref ? (
          <>
            {" "}
            <Link href={detailsHref} className="text-accent hover:underline">
              Full pricing details →
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
