import Link from "next/link";
import type { Metadata } from "next";
import { HelpSearch } from "@/components/help/HelpSearch";
import {
  getHelpCatalog,
  popularArticles,
} from "@/lib/help/docs";
import { SUPPORT_EMAIL } from "@/lib/support";
import { getTranslator } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslator();
  return {
    title: `${t("help.nav")} · ${t("brand.name")}`,
    description: t("help.hubSub"),
  };
}

export default async function HelpHubPage() {
  const { t, locale } = await getTranslator();
  const catalog = getHelpCatalog(locale);
  const popular = popularArticles(locale);

  return (
    <div className="folio-enter">
      <section className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 10% -10%, color-mix(in srgb, var(--color-accent) 14%, transparent), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 20%, color-mix(in srgb, var(--color-accent2) 8%, transparent), transparent 50%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pb-16 sm:pt-16">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
            {t("help.eyebrow")}
          </p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-extrabold tracking-tight text-fg sm:text-5xl">
            {t("help.hubTitle")}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            {t("help.hubSub")}
          </p>
          <div className="mt-8">
            <HelpSearch
              placeholder={t("help.searchPlaceholder")}
              emptyLabel={t("help.searchEmpty")}
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/help/getting-started"
              className="inline-flex items-center rounded-pill-pack bg-accent px-5 py-2.5 font-display text-sm font-bold text-on-accent transition hover:bg-accent2"
            >
              {t("help.startCta")}
            </Link>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center rounded-pill-pack border border-border px-5 py-2.5 text-sm font-medium text-fg transition hover:border-accent/40 hover:bg-panel2"
            >
              {t("help.emailCta", { email: SUPPORT_EMAIL })}
            </a>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-panel/40 py-10 sm:py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            {t("help.faq")}
          </p>
          <h2 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
            {t("help.faqTitle")}
          </h2>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {catalog.faq.map((item) => (
              <li key={item.slug + item.q}>
                <Link
                  href={`/help/${item.slug}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border bg-panel px-4 py-3 text-sm transition hover:border-accent/40 hover:bg-panel2"
                >
                  <span className="font-medium text-fg">{item.q}</span>
                  <span className="shrink-0 text-accent" aria-hidden>
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
          {t("help.popular")}
        </p>
        <h2 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
          {t("help.popularTitle")}
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {popular.map((a) => (
            <Link
              key={a.slug}
              href={`/help/${a.slug}`}
              className="folio group p-4 transition hover:border-accent/40"
            >
              <span className="font-mono text-[10px] uppercase tracking-wide text-muted">
                {catalog.sections.find((s) => s.id === a.section)?.title}
              </span>
              <span className="mt-1 block font-display text-base font-bold text-fg group-hover:text-accent2">
                {a.title}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-muted">
                {a.summary}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-panel/30 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            {t("help.topics")}
          </p>
          <h2 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
            {t("help.topicsTitle")}
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.sections.map((sec, i) => {
              const articles = catalog.articles.filter((a) => a.section === sec.id);
              return (
                <Link
                  key={sec.id}
                  href={`/help/${sec.entrySlug}`}
                  className="group folio flex flex-col p-5 transition hover:border-accent/40"
                >
                  <span className="font-mono text-[10px] font-semibold tabular-nums text-accent2">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 font-display text-lg font-bold tracking-tight text-fg group-hover:text-accent2">
                    {sec.title}
                  </h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">
                    {sec.blurb}
                  </p>
                  <span className="mt-4 font-mono text-[11px] text-accent">
                    {articles.length} {t("help.articles")} →
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-border py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
            {t("help.allDocs")}
          </p>
          <h2 className="mt-1 font-display text-xl font-bold tracking-tight sm:text-2xl">
            {t("help.allDocsTitle")}
          </h2>
          <ul className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-panel">
            {catalog.articles.map((a) => {
              const sec = catalog.sections.find((s) => s.id === a.section);
              return (
                <li key={a.slug}>
                  <Link
                    href={`/help/${a.slug}`}
                    className="flex flex-col gap-1 px-5 py-4 transition hover:bg-panel2 sm:flex-row sm:items-baseline sm:gap-6"
                  >
                    <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted sm:w-36">
                      {sec?.title}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="font-medium text-fg">{a.title}</span>
                      <span className="mt-0.5 block text-sm text-muted">
                        {a.summary}
                      </span>
                    </span>
                    <span className="hidden text-accent sm:inline" aria-hidden>
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
    </div>
  );
}
