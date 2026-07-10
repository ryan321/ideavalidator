"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  articleMatchesQuery,
  getHelpCatalog,
  type HelpArticle,
} from "@/lib/help/docs";
import { useLocale, useT } from "@/components/LocaleProvider";

export function HelpSearch({
  placeholder,
  emptyLabel,
}: {
  placeholder: string;
  emptyLabel: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const catalog = useMemo(() => getHelpCatalog(locale), [locale]);
  const [q, setQ] = useState("");
  const hits = useMemo(
    () =>
      catalog.articles.filter((a) =>
        articleMatchesQuery(a, q, catalog.sections)
      ),
    [q, catalog]
  );
  const searching = q.trim().length > 0;

  return (
    <div className="w-full max-w-xl">
      <label className="sr-only" htmlFor="help-search">
        {placeholder}
      </label>
      <input
        id="help-search"
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-xl border border-border bg-panel px-4 py-3 text-sm text-fg shadow-sm outline-none placeholder:text-muted focus:border-accent/50"
      />
      {searching && (
        <ul className="mt-2 max-h-72 overflow-auto rounded-xl border border-border bg-panel py-1 shadow-lg">
          {hits.length === 0 ? (
            <li className="px-4 py-3 text-sm text-muted">{emptyLabel}</li>
          ) : (
            hits.map((a) => (
              <Hit key={a.slug} article={a} sectionTitle={
                catalog.sections.find((s) => s.id === a.section)?.title ?? ""
              } />
            ))
          )}
        </ul>
      )}
      {!searching && (
        <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-muted">
          {t("help.searchHint")}
        </p>
      )}
    </div>
  );
}

function Hit({
  article,
  sectionTitle,
}: {
  article: HelpArticle;
  sectionTitle: string;
}) {
  return (
    <li>
      <Link
        href={`/help/${article.slug}`}
        className="block px-4 py-2.5 transition hover:bg-panel2"
      >
        <span className="text-sm font-medium text-fg">{article.title}</span>
        <span className="mt-0.5 block text-xs text-muted">
          {sectionTitle}
          {" · "}
          {article.summary}
        </span>
      </Link>
    </li>
  );
}
