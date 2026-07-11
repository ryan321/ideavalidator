/** Supported UI + report locales (top markets for founder tools). */

export const LOCALES = [
  "en",
  "es",
  "pt",
  "fr",
  "de",
  "it",
  "nl",
  "pl",
  "ja",
  "ko",
  "zh",
  "zht",
  "hi",
  "id",
  "vi",
  "th",
  "tr",
  "ar",
  "he",
  "uk",
] as const;
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
  it: "Italiano",
  nl: "Nederlands",
  pl: "Polski",
  ja: "日本語",
  ko: "한국어",
  zh: "简体中文",
  zht: "繁體中文",
  hi: "हिन्दी",
  id: "Bahasa Indonesia",
  vi: "Tiếng Việt",
  th: "ไทย",
  tr: "Türkçe",
  ar: "العربية",
  he: "עברית",
  uk: "Українська",
};

/** Native name for AI prompt instructions. */
export const LOCALE_NATIVE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Spanish",
  pt: "Portuguese",
  fr: "French",
  de: "German",
  it: "Italian",
  nl: "Dutch",
  pl: "Polish",
  ja: "Japanese",
  ko: "Korean",
  zh: "Simplified Chinese",
  zht: "Traditional Chinese",
  hi: "Hindi",
  id: "Indonesian",
  vi: "Vietnamese",
  th: "Thai",
  tr: "Turkish",
  ar: "Arabic",
  he: "Hebrew",
  uk: "Ukrainian",
};

/**
 * Extra search tokens for the language picker (English names, endonyms, aliases).
 * Matching is case-insensitive and substring-based.
 */
export const LOCALE_SEARCH_ALIASES: Record<Locale, string[]> = {
  en: ["english", "en", "inglés", "anglais"],
  es: ["spanish", "español", "espanol", "castellano", "es"],
  pt: ["portuguese", "português", "portugues", "brasil", "brazil", "pt", "pt-br"],
  fr: ["french", "français", "francais", "fr"],
  de: ["german", "deutsch", "de", "allemand"],
  it: ["italian", "italiano", "it", "italie"],
  nl: ["dutch", "nederlands", "nl", "holland", "flemish", "vlaams"],
  pl: ["polish", "polski", "pl", "poland", "polska"],
  ja: ["japanese", "日本語", "nihongo", "ja", "jp"],
  ko: ["korean", "한국어", "hangul", "hangugeo", "ko", "kr"],
  zh: [
    "chinese",
    "中文",
    "简体中文",
    "simplified chinese",
    "mandarin",
    "zh",
    "zh-cn",
    "zh-hans",
    "cn",
    "simplified",
  ],
  zht: [
    "traditional chinese",
    "繁體中文",
    "繁体中文",
    "台灣",
    "台湾",
    "台灣中文",
    "zh-tw",
    "zh-hk",
    "zh-hant",
    "zht",
    "traditional",
    "taiwan",
    "hong kong",
  ],
  hi: ["hindi", "हिन्दी", "हिंदी", "hi", "india"],
  id: ["indonesian", "bahasa indonesia", "bahasa", "id", "indonesia"],
  vi: ["vietnamese", "tiếng việt", "tieng viet", "vi", "vietnam"],
  th: ["thai", "ไทย", "th", "thailand", "siamese"],
  tr: ["turkish", "türkçe", "turkce", "tr", "turkey", "türkiye"],
  ar: ["arabic", "العربية", "عربي", "ar", "العربيه"],
  he: ["hebrew", "עברית", "he", "iw", "israel"],
  uk: ["ukrainian", "українська", "ukrainska", "uk", "ukraine", "ua"],
};

/** True if query matches label, code, English name, or aliases for this locale. */
export function localeMatchesSearch(code: Locale, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    code,
    LOCALE_LABELS[code],
    LOCALE_NATIVE_NAMES[code],
    ...(LOCALE_SEARCH_ALIASES[code] ?? []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

export function isLocale(v: string | null | undefined): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

/** Right-to-left UI locales. */
export function isRtlLocale(locale: Locale): boolean {
  return locale === "ar" || locale === "he";
}

/**
 * BCP-47 language tag for the html lang attribute. Internal catalog keys happen
 * to be valid ISO 639-1 codes except "zht", which browsers can't resolve — map it
 * to zh-Hant so Han-unification fonts, screen readers, and translate behave.
 */
export function localeLangTag(locale: Locale): string {
  return locale === "zht" ? "zh-Hant" : locale;
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
    // Chinese: traditional vs simplified — the script subtag outranks region
    // (zh-Hans-TW is Simplified despite the TW region).
    if (primary === "zh") {
      if (tag.includes("hans")) return "zh";
      if (
        tag.includes("hant") ||
        tag.includes("tw") ||
        tag.includes("hk") ||
        tag.includes("mo")
      ) {
        return "zht";
      }
      return "zh";
    }
    // Hebrew legacy tag
    if (primary === "iw") return "he";
    if (isLocale(primary)) return primary;
    // Full tag match (e.g. future region codes)
    if (isLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
}
