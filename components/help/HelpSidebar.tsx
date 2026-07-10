"use client";

import Link from "next/link";
import { getHelpCatalog } from "@/lib/help/docs";
import { useLocale } from "@/components/LocaleProvider";

export function HelpSidebar({
  activeSlug,
  hubLabel,
}: {
  activeSlug?: string;
  hubLabel: string;
}) {
  const { locale } = useLocale();
  const catalog = getHelpCatalog(locale);

  return (
    <nav className="space-y-6" aria-label={hubLabel}>
      <Link
        href="/help"
        className={`block font-mono text-[11px] uppercase tracking-[0.14em] transition ${
          !activeSlug ? "font-semibold text-accent" : "text-muted hover:text-fg"
        }`}
      >
        {hubLabel}
      </Link>
      {catalog.sections.map((sec) => (
        <div key={sec.id}>
          <Link
            href={`/help/${sec.entrySlug}`}
            className="mb-2 block font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-muted transition hover:text-fg"
          >
            {sec.title}
          </Link>
          <ul className="space-y-0.5 border-l border-border pl-3">
            {catalog.articles
              .filter((a) => a.section === sec.id)
              .map((a) => {
                const active = a.slug === activeSlug;
                return (
                  <li key={a.slug}>
                    <Link
                      href={`/help/${a.slug}`}
                      className={`block rounded-md px-2 py-1.5 text-sm leading-snug transition ${
                        active
                          ? "bg-accent/10 font-medium text-accent2"
                          : "text-fg/80 hover:bg-panel2 hover:text-fg"
                      }`}
                    >
                      {a.title}
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
