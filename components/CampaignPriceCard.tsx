import Link from "next/link";
import { CAMPAIGN_RUN_CAP, priceCents } from "@/lib/billing";
import { getTranslator } from "@/lib/i18n/server";

/**
 * Primary pricing offer — shared by landing and /pricing so the promise stays identical.
 * Copy comes from the English site catalog (lib/i18n/messages/en.ts).
 */
export async function CampaignPriceCard({
  ctaHref,
  ctaLabel,
  detailsHref,
  className = "",
}: {
  ctaHref: string;
  ctaLabel: string;
  detailsHref?: string;
  className?: string;
}) {
  const price = (priceCents() / 100).toFixed(0);
  const { t } = await getTranslator();
  const reports = String(CAMPAIGN_RUN_CAP);

  return (
    <div className={`folio border-accent/35 p-6 sm:p-8 ${className}`} id="pricing">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
        {t("priceCard.perIdea")}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-display text-5xl font-extrabold tracking-tight text-fg">
          ${price}
        </span>
        <span className="text-sm text-muted">{t("priceCard.oneTime")}</span>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        <span className="font-medium text-fg/85">
          {t("priceCard.includedLead", { reports })}
        </span>
        {t("priceCard.includedRest")}
      </p>
      <ul className="mt-5 space-y-2 text-sm text-fg/85">
        <li className="flex gap-2">
          <span className="text-accent" aria-hidden>
            ✓
          </span>
          {t("priceCard.bullet1")}
        </li>
        <li className="flex gap-2">
          <span className="text-accent" aria-hidden>
            ✓
          </span>
          {t("priceCard.bullet2")}
        </li>
        <li className="flex gap-2">
          <span className="text-accent" aria-hidden>
            ✓
          </span>
          {t("priceCard.bullet3")}
        </li>
      </ul>
      <Link
        href={ctaHref}
        className="mt-7 inline-flex w-full items-center justify-center rounded-pill-pack bg-accent px-6 py-3 font-display text-base font-bold text-on-accent transition hover:bg-accent2"
      >
        {ctaLabel}
      </Link>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        {t("priceCard.unlockNote", { price: `$${price}` })}
        {detailsHref ? (
          <>
            {" "}
            <Link href={detailsHref} className="text-accent hover:underline">
              {t("priceCard.details")}
            </Link>
          </>
        ) : null}
      </p>
    </div>
  );
}
