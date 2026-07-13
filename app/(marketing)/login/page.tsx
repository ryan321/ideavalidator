import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getSessionUser } from "@/lib/auth";
import { googleConfigured } from "@/lib/google";
import { getTranslator } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getSessionUser()) redirect("/studio");
  const { error } = await searchParams;
  const { t } = await getTranslator();
  const notice =
    error === "google_unverified"
      ? t("oauth.errorUnverified")
      : error === "google_unavailable"
        ? t("oauth.errorUnavailable")
        : error === "google_failed"
          ? t("oauth.errorFailed")
          : undefined;
  return <AuthForm mode="login" googleEnabled={googleConfigured()} notice={notice} />;
}
