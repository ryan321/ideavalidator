import type { Locale } from "./config";
import { DEFAULT_LOCALE } from "./config";
import { en } from "./messages/en";
import { getMessages, type MessageTree } from "./messages";

type Leaves<T, P extends string = ""> = T extends string
  ? P
  : T extends object
    ? {
        [K in keyof T & string]: Leaves<T[K], P extends "" ? K : `${P}.${K}`>;
      }[keyof T & string]
    : P;

/** Dot-path keys into the English message tree (type-safe structure). */
export type MessageKey = Leaves<typeof en>;

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

/**
 * Localized stamp/label for a stored machine verdict code.
 * Codes stay English in JSON/API; only the UI string is translated.
 */
export function verdictLabel(
  verdict: string | null | undefined,
  t: TranslateFn
): string {
  switch (verdict) {
    case "GO":
      return t("verdict.go");
    case "MAYBE":
      return t("verdict.maybe");
    case "NO-GO":
      return t("verdict.noGo");
    case "INSUFFICIENT EVIDENCE":
      return t("verdict.insufficient");
    default:
      return (verdict ?? "").trim() || t("verdict.maybe");
  }
}

/** Map stored English criterion names → localized UI labels. */
const CRITERION_KEYS: Record<string, MessageKey> = {
  "Demand Strength": "criteria.demandStrength",
  "Willingness to Pay": "criteria.willingnessToPay",
  "Problem-Solution Fit": "criteria.problemSolutionFit",
  "Retention & Recurrence": "criteria.retentionRecurrence",
  "Market Timing": "criteria.marketTiming",
  "Competitive Position": "criteria.competitivePosition",
  "Differentiation / Moat": "criteria.differentiationMoat",
  "Acquisition Ease": "criteria.acquisitionEase",
  "Founder Fit": "criteria.founderFit",
  "Goal Fit": "criteria.goalFit",
};

/**
 * Localized display label for a criterion machine name.
 * Unknown names pass through unchanged.
 */
export function criterionLabel(
  name: string | null | undefined,
  t: TranslateFn
): string {
  const n = (name ?? "").trim();
  if (!n) return "";
  const key = CRITERION_KEYS[n];
  return key ? t(key) : n;
}
