import {
  DEFAULT_LOCALE,
  LOCALE_NATIVE_NAMES,
  isLocale,
  type Locale,
} from "./config";

/**
 * Appended to every LLM system prompt so reports/chat land in the UI locale.
 * Machine keys (JSON field names, GO/MAYBE/NO-GO enums used as codes) stay English.
 */
export function languageInstruction(locale: string | null | undefined): string {
  const loc: Locale = isLocale(locale) ? locale : DEFAULT_LOCALE;
  const name = LOCALE_NATIVE_NAMES[loc];
  if (loc === "en") {
    return (
      "\n\nOUTPUT LANGUAGE: Write all user-facing prose in English. " +
      "JSON object keys and closed enums required by the schema " +
      '(e.g. verdict values "GO" / "MAYBE" / "NO-GO", band letters, criterion name strings when they are fixed machine identifiers) must remain exactly as specified.'
    );
  }
  return (
    `\n\nOUTPUT LANGUAGE: Write ALL user-facing text (summaries, rationales, questions, kit copy, chat answers, narratives) in ${name}. ` +
    "Do not mix English prose unless quoting an English source. " +
    "JSON object keys and closed enums required by the schema " +
    '(e.g. verdict values "GO" / "MAYBE" / "NO-GO", band letters, fixed criterion name strings used as machine identifiers) must remain exactly as specified in English. ' +
    `Natural-language values (explanations, free text fields) must be in ${name}.`
  );
}

/** Merge locale instruction into a system prompt. */
export function withOutputLocale(system: string, locale?: string | null): string {
  return system + languageInstruction(locale);
}
