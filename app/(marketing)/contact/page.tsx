import type { Metadata } from "next";
import { SUPPORT_EMAIL } from "@/lib/support";
import { getTranslator } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: `${t("contact.title")} · ${t("brand.name")}`,
    description: t("contact.body"),
  };
}

export default async function ContactPage() {
  const { t } = await getTranslator();
  return (
    <div className="folio-enter">
      <section className="mx-auto max-w-xl px-4 pb-20 pt-14 sm:px-6 sm:pt-20">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
          {t("contact.nav")}
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
          {t("contact.title")}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">{t("contact.body")}</p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-8 inline-flex items-center rounded-pill-pack bg-accent px-5 py-2.5 font-display text-sm font-bold text-on-accent transition hover:bg-accent2"
        >
          {t("contact.emailCta", { email: SUPPORT_EMAIL })}
        </a>
        <p className="mt-4 font-mono text-sm text-muted">
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-accent2 hover:underline">
            {SUPPORT_EMAIL}
          </a>
        </p>
      </section>
    </div>
  );
}
