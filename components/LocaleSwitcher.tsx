"use client";

import { LOCALES, LOCALE_LABELS } from "@/lib/i18n/config";
import { useLocale, useT } from "./LocaleProvider";

/** Compact language control for marketing + app headers. */
export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const t = useT();

  return (
    <label className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="sr-only">{t("nav.language")}</span>
      <select
        value={locale}
        onChange={(e) => void setLocale(e.target.value as typeof locale)}
        className="rounded-pill-pack border border-border bg-transparent px-2 py-1.5 font-mono text-[11px] uppercase text-muted outline-none transition hover:border-accent/40 hover:text-fg [letter-spacing:var(--tracking-eyebrow)]"
        aria-label={t("nav.language")}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code]}
          </option>
        ))}
      </select>
    </label>
  );
}
