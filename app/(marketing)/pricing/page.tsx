import Link from "next/link";
import type { Metadata } from "next";
import { CampaignPriceCard } from "@/components/CampaignPriceCard";
import { getSessionUser } from "@/lib/auth";
import { CAMPAIGN_RUN_CAP, priceCents } from "@/lib/billing";
import { checklistItems } from "@/lib/i18n/t";
import { getTranslator } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: `${t("pricing.eyebrow")} · ${t("brand.name")}`,
    description: t("meta.description"),
  };
}

export default async function PricingPage() {
  const user = await getSessionUser();
  const { t } = await getTranslator();
  const price = `$${(priceCents() / 100).toFixed(0)}`;
  const ctaHref = user ? "/studio" : "/signup";
  const ctaLabel = user ? t("nav.openStudio") : t("nav.validateCta");
  const checklist = checklistItems(t);

  return (
    <div className="folio-enter">
      <section className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-6 sm:pb-12 sm:pt-16">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
          {t("pricing.eyebrow")}
        </p>
        <h1 className="mt-3 max-w-xl font-display text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
          {t("pricing.title")}
        </h1>
        <p className="mt-3 max-w-lg text-muted">
          {t("pricing.sub", { price, reports: String(CAMPAIGN_RUN_CAP) })}
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
              {t("pricing.includedTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted">{t("pricing.includedSub")}</p>
            <ul className="mt-6 space-y-2.5">
              {checklist.map((item) => (
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
          <h2 className="font-display text-2xl font-bold tracking-tight">
            {t("pricing.faqTitle")}
          </h2>
          <dl className="mt-8 grid max-w-3xl gap-6">
            {(
              [
                ["pricing.faq1q", "pricing.faq1a"],
                ["pricing.faq2q", "pricing.faq2a"],
                ["pricing.faq3q", "pricing.faq3a"],
                ["pricing.faq4q", "pricing.faq4a"],
                ["pricing.faq5q", "pricing.faq5a"],
              ] as const
            ).map(([q, a]) => (
              <div key={q}>
                <dt className="font-display text-base font-bold tracking-tight">{t(q)}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-muted">{t(a)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-10 text-sm text-muted">
            {t("pricing.backHome")}{" "}
            <Link href="/" className="text-accent hover:underline">
              {t("pricing.backHomeLink")}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
