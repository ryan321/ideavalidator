import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  isLocale,
  parseAcceptLanguage,
} from "@/lib/i18n/config";

/**
 * Ensure a locale cookie exists (from Accept-Language on first visit).
 * Does not rewrite URLs — locale is cookie-based until/unless we add /[locale] routes.
 */
export function proxy(request: NextRequest) {
  const existing = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(existing)) {
    return NextResponse.next();
  }
  const locale = parseAcceptLanguage(request.headers.get("accept-language")) || DEFAULT_LOCALE;
  const res = NextResponse.next();
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return res;
}

export const config = {
  matcher: [
    /*
     * Skip static assets and Next internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
