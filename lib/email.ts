// Transactional email via Resend's REST API — no SDK dependency (same spirit as scrypt
// over bcrypt). Without RESEND_API_KEY the send is skipped and the link is printed to the
// server console instead, so local dev works with no email setup at all.

import { DEFAULT_LOCALE, isRtlLocale, localeLangTag, type Locale } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/t";

const RESEND_URL = "https://api.resend.com/emails";

// Resend's shared test sender — fine for dev; set EMAIL_FROM to a verified domain
// sender in production.
const FROM = process.env.EMAIL_FROM || "Validorian <onboarding@resend.dev>";

/** Send the password-reset email, localized to the requester's UI locale. Never throws:
 * a send failure is logged, not surfaced, so the forgot route's response can't leak
 * whether (or how) an email went out. */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
  locale: Locale = DEFAULT_LOCALE
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn(`[email] RESEND_API_KEY not set — DEV MODE, password reset link for ${to}: ${resetUrl}`);
    return;
  }
  const t = createTranslator(locale);
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";
  const subject = t("email.resetSubject");
  const text = [
    t("brand.name"),
    "",
    t("email.resetIntro"),
    "",
    t("email.resetAction", { url: resetUrl }),
    "",
    t("email.resetExpires"),
    t("email.resetIgnore"),
  ].join("\n");
  const html = `
    <div lang="${localeLangTag(locale)}" dir="${dir}" style="max-width:480px;margin:0 auto;padding:32px 24px;font-family:system-ui,-apple-system,sans-serif;color:#1a1a1a;background:#ffffff">
      <p style="margin:0 0 16px;font-size:13px;letter-spacing:0.2em;text-transform:uppercase;color:#666">${t("brand.name")}</p>
      <p style="margin:0 0 24px;font-size:15px;line-height:1.5">${t("email.resetIntro")}</p>
      <p style="margin:0 0 24px">
        <a href="${resetUrl}" style="display:inline-block;padding:10px 24px;border-radius:9999px;background:#1a1a1a;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">${t("email.resetButton")}</a>
      </p>
      <p style="margin:0 0 16px;font-size:12px;line-height:1.5;color:#666;word-break:break-all">${t("email.resetPasteLink")}<br>${resetUrl}</p>
      <p style="margin:0;font-size:12px;line-height:1.5;color:#666">${t("email.resetExpires")}<br>${t("email.resetIgnore")}</p>
    </div>`;
  try {
    const res = await fetch(RESEND_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to, subject, html, text }),
    });
    if (!res.ok) {
      console.error(`[email] Resend send failed (${res.status}): ${await res.text()}`);
    }
  } catch (e) {
    console.error("[email] Resend send failed:", e);
  }
}
