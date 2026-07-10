import type { Locale } from "./config";
import { DEFAULT_LOCALE } from "./config";
import { getMessages, type MessageTree } from "./messages";

type Leaves<T, P extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: Leaves<T[K], P extends "" ? K : `${P}.${K}`>;
    }[keyof T & string]
  : P;

/** Dot-path keys into the English message tree (type-safe). */
export type MessageKey = Leaves<MessageTree>;

export type TranslateFn = (key: MessageKey, vars?: Record<string, string | number>) => string;

function lookup(obj: unknown, path: string): string | undefined {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (cur == null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
}

function interpolate(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k: string) =>
    vars[k] !== undefined ? String(vars[k]) : `{${k}}`
  );
}

/** Build a translator for a locale (missing keys → English). */
export function createTranslator(locale: Locale = DEFAULT_LOCALE): TranslateFn {
  const messages = getMessages(locale);
  const fallback = getMessages(DEFAULT_LOCALE);
  return (key, vars) => {
    const raw = lookup(messages, key) ?? lookup(fallback, key) ?? key;
    return interpolate(raw, vars);
  };
}

/** All checklist items in order (for landing/pricing). */
export function checklistItems(t: TranslateFn): string[] {
  return [
    t("checklist.item1"),
    t("checklist.item2"),
    t("checklist.item3"),
    t("checklist.item4"),
    t("checklist.item5"),
    t("checklist.item6"),
    t("checklist.item7"),
    t("checklist.item8"),
    t("checklist.item9"),
    t("checklist.item10"),
    t("checklist.item11"),
    t("checklist.item12"),
    t("checklist.item13"),
    t("checklist.item14"),
  ];
}
