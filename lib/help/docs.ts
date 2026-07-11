/**
 * Product help docs — locale-aware catalogs ordered by founder jobs
 * (spend, verdict, use studio), not by internal product curriculum.
 */

import type { Locale } from "@/lib/i18n/config";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { helpEn } from "./content/en";
import { helpEs } from "./content/es";
import { helpPt } from "./content/pt";
import { helpFr } from "./content/fr";
import { helpDe } from "./content/de";
import { helpIt } from "./content/it";
import { helpNl } from "./content/nl";
import { helpPl } from "./content/pl";
import { helpJa } from "./content/ja";
import { helpKo } from "./content/ko";
import { helpZh } from "./content/zh";
import { helpZht } from "./content/zht";
import { helpHi } from "./content/hi";
import { helpId } from "./content/id";
import { helpVi } from "./content/vi";
import { helpTh } from "./content/th";
import { helpTr } from "./content/tr";
import { helpAr } from "./content/ar";
import { helpHe } from "./content/he";
import { helpUk } from "./content/uk";
import type {
  HelpArticle,
  HelpBlock,
  HelpCatalog,
  HelpFaqItem,
  HelpSection,
  HelpSectionId,
} from "./types";

export type {
  HelpArticle,
  HelpBlock,
  HelpCatalog,
  HelpFaqItem,
  HelpSection,
  HelpSectionId,
} from "./types";

const CATALOGS: Record<Locale, HelpCatalog> = {
  en: helpEn,
  es: helpEs,
  pt: helpPt,
  fr: helpFr,
  de: helpDe,
  it: helpIt,
  nl: helpNl,
  pl: helpPl,
  ja: helpJa,
  ko: helpKo,
  zh: helpZh,
  zht: helpZht,
  hi: helpHi,
  id: helpId,
  vi: helpVi,
  th: helpTh,
  tr: helpTr,
  ar: helpAr,
  he: helpHe,
  uk: helpUk,
};

/** Hub "popular" row (slugs, order) — locale-independent. */
export const HELP_POPULAR_SLUGS = [
  "getting-started",
  "campaigns-and-pricing",
  "verdicts",
  "iterate",
  "cant-run-analysis",
] as const;

/** Stable article order / static params (from English source of truth). */
export const HELP_ARTICLE_SLUGS = helpEn.articles.map((a) => a.slug);

export function getHelpCatalog(locale: Locale = DEFAULT_LOCALE): HelpCatalog {
  return CATALOGS[locale] ?? helpEn;
}

/** @deprecated Prefer getHelpCatalog(locale).articles — English fallback for tooling. */
export const HELP_ARTICLES = helpEn.articles;
/** @deprecated Prefer getHelpCatalog(locale).sections */
export const HELP_SECTIONS = helpEn.sections;
/** @deprecated Prefer getHelpCatalog(locale).faq */
export const HELP_FAQ = helpEn.faq;

export function getArticle(
  slug: string,
  locale: Locale = DEFAULT_LOCALE
): HelpArticle | undefined {
  return getHelpCatalog(locale).articles.find((a) => a.slug === slug);
}

export function articlesInSection(
  section: HelpSectionId,
  locale: Locale = DEFAULT_LOCALE
): HelpArticle[] {
  return getHelpCatalog(locale).articles.filter((a) => a.section === section);
}

export function adjacentArticles(
  slug: string,
  locale: Locale = DEFAULT_LOCALE
): {
  prev: HelpArticle | null;
  next: HelpArticle | null;
} {
  const articles = getHelpCatalog(locale).articles;
  const i = articles.findIndex((a) => a.slug === slug);
  if (i < 0) return { prev: null, next: null };
  return {
    prev: i > 0 ? articles[i - 1]! : null,
    next: i < articles.length - 1 ? articles[i + 1]! : null,
  };
}

export function popularArticles(locale: Locale = DEFAULT_LOCALE): HelpArticle[] {
  return HELP_POPULAR_SLUGS.map((s) => getArticle(s, locale)).filter(
    (a): a is HelpArticle => !!a
  );
}

function blockSearchText(blocks: HelpBlock[]): string {
  return blocks
    .map((b) => {
      if (b.type === "p" || b.type === "h2" || b.type === "callout") return b.text;
      if (b.type === "ul" || b.type === "ol") return b.items.join(" ");
      if (b.type === "table") return [...b.headers, ...b.rows.flat()].join(" ");
      return "";
    })
    .join(" ");
}

/** Client-side filter over title, summary, tags, section, and body. */
export function articleMatchesQuery(
  article: HelpArticle,
  query: string,
  sections?: HelpSection[]
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const sec =
    (sections ?? helpEn.sections).find((s) => s.id === article.section)?.title ?? "";
  const tokens = q.split(/\s+/).filter(Boolean);
  const hay = [
    article.title,
    article.summary,
    article.eyebrow,
    sec,
    ...(article.tags ?? []),
    article.slug.replace(/-/g, " "),
    blockSearchText(article.blocks),
  ]
    .join(" ")
    .toLowerCase();
  return tokens.every((tok) => hay.includes(tok));
}
