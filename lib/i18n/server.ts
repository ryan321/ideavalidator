import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  parseAcceptLanguage,
  type Locale,
} from "./config";
import { createTranslator, type TranslateFn } from "./t";

/** Resolve locale for this request: cookie → Accept-Language → default. */
export async function getRequestLocale(): Promise<Locale> {
  const jar = await cookies();
  const fromCookie = jar.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;
  const h = await headers();
  return parseAcceptLanguage(h.get("accept-language"));
}

export async function getTranslator(): Promise<{ locale: Locale; t: TranslateFn }> {
  const locale = await getRequestLocale();
  return { locale, t: createTranslator(locale) };
}

/**
 * Locale for AI calls: explicit override → request cookie → default.
 * Safe outside a request (scripts/tests fall back to DEFAULT_LOCALE).
 */
export async function resolveLocale(explicit?: string | null): Promise<Locale> {
  if (isLocale(explicit)) return explicit;
  try {
    return await getRequestLocale();
  } catch {
    return DEFAULT_LOCALE;
  }
}
