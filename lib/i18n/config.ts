/** Supported UI + report locales. English is complete; others fall back to en until filled. */

export const LOCALES = ["en", "es", "fr", "de", "pt", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie stores the active locale (set by LocaleSwitcher / proxy). */
export const LOCALE_COOKIE = "iv_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  de: "Deutsch",
  pt: "Português",
  ja: "日本語",
};

/** Native name for AI prompt instructions. */
export const LOCALE_NATIVE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  ja: "Japanese",
};

export function isLocale(v: string | null | undefined): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

export function parseAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  const parts = header.split(",").map((p) => {
    const [tag, ...params] = p.trim().split(";");
    const q = params.find((x) => x.trim().startsWith("q="));
    const quality = q ? Number(q.split("=")[1]) || 0 : 1;
    return { tag: tag.trim().toLowerCase(), quality };
  });
  parts.sort((a, b) => b.quality - a.quality);
  for (const { tag } of parts) {
    const primary = tag.split("-")[0];
    if (isLocale(primary)) return primary;
    // e.g. pt-BR → pt
    if (primary === "pt" && isLocale("pt")) return "pt";
  }
  return DEFAULT_LOCALE;
}
