/**
 * @deprecated Prefer lib/i18n message catalogs (lib/i18n/messages/en.ts).
 * Kept as thin re-exports so older imports keep working.
 */
import { createTranslator, checklistItems } from "./i18n/t";

const t = createTranslator("en");

/** @deprecated Use checklistItems(t) with getTranslator(). */
export const WHAT_YOU_GET = checklistItems(t);

/** @deprecated Use landing.how* keys via t(). */
export const HOW_IT_WORKS_STEPS = [
  { n: "01", title: t("landing.how1Title"), body: t("landing.how1Body") },
  { n: "02", title: t("landing.how2Title"), body: t("landing.how2Body") },
  { n: "03", title: t("landing.how3Title"), body: t("landing.how3Body") },
] as const;
