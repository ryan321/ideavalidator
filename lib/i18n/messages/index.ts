import type { Locale } from "../config";
import { en, type MessageTree } from "./en";

/**
 * Locale catalogs. Start empty `{}` and fill keys over time — missing keys
 * fall back to English via `t()`.
 */
const catalogs: Record<Locale, DeepPartial<MessageTree>> = {
  en,
  es: {},
  fr: {},
  de: {},
  pt: {},
  ja: {},
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

export function getMessages(locale: Locale): MessageTree {
  if (locale === "en") return en;
  // Merge: English base, overlay partial translations when present.
  return deepMerge(en, catalogs[locale] ?? {}) as MessageTree;
}

function deepMerge(base: unknown, over: unknown): unknown {
  if (!over || typeof over !== "object" || Array.isArray(over)) return over ?? base;
  if (!base || typeof base !== "object" || Array.isArray(base)) return over;
  const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    if (v === undefined) continue;
    out[k] =
      typeof v === "object" && v && !Array.isArray(v)
        ? deepMerge((base as Record<string, unknown>)[k], v)
        : v;
  }
  return out;
}

export type { MessageTree };
