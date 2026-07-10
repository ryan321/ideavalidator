import { getTranslator } from "@/lib/i18n/server";

/** First focusable control — jumps past chrome for keyboard and screen-reader users. */
export async function SkipToContent() {
  const { t } = await getTranslator();
  return (
    <a href="#main-content" className="skip-to-content">
      {t("a11y.skipToContent")}
    </a>
  );
}
