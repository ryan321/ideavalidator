/** Supported UI + report locales (top markets for founder tools). */

export const LOCALES = ["en", "es", "pt", "fr", "de", "ja", "ko", "zh", "hi", "ar"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie stores the active locale (set by LocaleSwitcher / proxy). */
export const LOCALE_COOKIE = "iv_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
  ja: "日本語",
  ko: "한국어",
  zh: "中文",
  hi: "हिन्दी",
  ar: "العربية",
};

/** Native name for AI prompt instructions. */
export const LOCALE_NATIVE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  ja: "Japanese",
  ko: "Korean",
  zh: "Simplified Chinese",
  hi: "Hindi",
  ar: "Arabic",
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
    // zh-CN / zh-Hans / zh-TW → zh (simplified catalog; TW can refine later)
    if (primary === "zh") return "zh";
    if (isLocale(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}
