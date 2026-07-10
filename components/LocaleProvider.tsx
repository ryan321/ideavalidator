"use client";

import React, { createContext, useCallback, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import { createTranslator, type MessageKey, type TranslateFn } from "@/lib/i18n/t";

type Ctx = {
  locale: Locale;
  t: TranslateFn;
  setLocale: (locale: Locale) => Promise<void>;
};

const LocaleContext = createContext<Ctx | null>(null);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const t = useMemo(() => createTranslator(locale), [locale]);

  const setLocale = useCallback(
    async (next: Locale) => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      router.refresh();
    },
    [router]
  );

  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Ctx {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    // SSR-safe fallback when outside provider (shouldn't happen in app shell).
    return {
      locale: "en",
      t: createTranslator("en"),
      setLocale: async () => {},
    };
  }
  return ctx;
}

export function useT(): TranslateFn {
  return useLocale().t;
}

export type { MessageKey };
