import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HelpDocBody } from "@/components/help/HelpDocBody";
import { HelpSidebar } from "@/components/help/HelpSidebar";
import {
  adjacentArticles,
  getArticle,
  getHelpCatalog,
  HELP_ARTICLE_SLUGS,
} from "@/lib/help/docs";
import { SUPPORT_EMAIL } from "@/lib/support";
import { getTranslator } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return HELP_ARTICLE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { t, locale } = await getTranslator();
  const article = getArticle(slug, locale);
  if (!article) return { title: t("help.nav") };
  return {
    title: `${article.title} · ${t("help.nav")} · ${t("brand.name")}`,
    description: article.summary,
  };
}

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { t, locale } = await getTranslator();
  const article = getArticle(slug, locale);
  if (!article) notFound();

  const catalog = getHelpCatalog(locale);
  const section = catalog.sections.find((s) => s.id === article.section);
  const { prev, next } = adjacentArticles(slug, locale);

  return (
    <div className="folio-enter">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-14">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <HelpSidebar activeSlug={slug} hubLabel={t("help.nav")} />
          </div>
        </aside>

        <article className="min-w-0">
          <nav className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[11px] text-muted">
            <Link href="/help" className="hover:text-fg">
              {t("help.nav")}
            </Link>
            <span aria-hidden>/</span>
            {section && <span>{section.title}</span>}
          </nav>

          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-accent">
            {article.eyebrow}
          </p>
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-fg sm:text-4xl">
            {article.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted">{article.summary}</p>

          <div className="mt-10 border-t border-border pt-10">
            <HelpDocBody blocks={article.blocks} />
          </div>

          <div className="mt-12 flex flex-wrap gap-3 border-t border-border pt-8">
            {prev ? (
              <Link
                href={`/help/${prev.slug}`}
                className="rounded-xl border border-border px-4 py-3 text-sm transition hover:border-accent/40 hover:bg-panel2"
              >
                <span className="block font-mono text-[10px] uppercase tracking-wide text-muted">
                  {t("help.prev")}
                </span>
                <span className="font-medium text-fg">{prev.title}</span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/help/${next.slug}`}
                className="ml-auto rounded-xl border border-border px-4 py-3 text-right text-sm transition hover:border-accent/40 hover:bg-panel2"
              >
                <span className="block font-mono text-[10px] uppercase tracking-wide text-muted">
                  {t("help.next")}
                </span>
                <span className="font-medium text-fg">{next.title}</span>
              </Link>
            )}
          </div>

          <div className="mt-10 rounded-2xl border border-border bg-panel/60 px-5 py-5 sm:px-6">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              {t("help.stillStuck")}
            </p>
            <p className="mt-1 text-sm text-fg/90">{t("help.stillStuckBody")}</p>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="mt-3 inline-flex text-sm font-medium text-accent2 hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>

          <div className="mt-10 lg:hidden">
            <p className="mb-3 font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              {t("help.moreInHelp")}
            </p>
            <HelpSidebar activeSlug={slug} hubLabel={t("help.nav")} />
          </div>
        </article>
      </div>
    </div>
  );
}
