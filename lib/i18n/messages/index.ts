import type { Locale } from "../config";
import { en, type MessageTree } from "./en";
import { es } from "./es";
import { pt } from "./pt";
import { fr } from "./fr";
import { de } from "./de";
import { ja } from "./ja";
import { ko } from "./ko";
import { zh } from "./zh";
import { hi } from "./hi";
import { ar } from "./ar";

/**
 * Locale catalogs. Missing keys fall back to English via deepMerge in getMessages.
 */
const catalogs: Record<Locale, MessageTree | Partial<MessageTree>> = {
  en,
  es,
  pt,
  fr,
  de,
  ja,
  ko,
  zh,
  hi,
  ar,
};

export function getMessages(locale: Locale): MessageTree {
  if (locale === "en") return en;
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
