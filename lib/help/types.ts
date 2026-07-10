/** Shared help-doc types (content is locale-specific). */

export type HelpSectionId =
  | "start"
  | "billing"
  | "scoring"
  | "studio"
  | "account";

export type HelpBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "callout"; text: string }
  | { type: "h2"; text: string }
  | { type: "table"; headers: string[]; rows: string[][] };

export type HelpArticle = {
  slug: string;
  section: HelpSectionId;
  title: string;
  summary: string;
  eyebrow: string;
  /** Extra tokens for hub search (include English + locale terms). */
  tags?: string[];
  blocks: HelpBlock[];
};

export type HelpSection = {
  id: HelpSectionId;
  title: string;
  blurb: string;
  /** First article to open from the topic card. */
  entrySlug: string;
};

export type HelpFaqItem = { q: string; slug: string };

export type HelpCatalog = {
  sections: HelpSection[];
  faq: HelpFaqItem[];
  articles: HelpArticle[];
};
