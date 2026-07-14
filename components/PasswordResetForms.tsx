"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "./LocaleProvider";

// Forgot-password + reset forms — same visual vocabulary as AuthForm.

export function ForgotForm() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? t("common.error"));
      setSent(true); // shown whether or not the account exists
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
      setBusy(false);
    }
  }

  return (
    <div className="folio-enter mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <div className="folio p-6 sm:p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent2">
          {t("auth.forgotEyebrow")}
        </p>
        {sent ? (
          <>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
              {t("auth.forgotSentTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted">{t("auth.forgotSentBlurb")}</p>
            <p className="mt-5 text-center text-sm text-muted">
              <Link href="/login" className="font-medium text-accent2 hover:underline">
                {t("auth.backToLogin")}
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
              {t("auth.forgotTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted">{t("auth.forgotBlurb")}</p>

            <form onSubmit={submit} className="mt-6 space-y-3">
              <div>
                <label htmlFor="forgot-email" className="sr-only">
                  {t("a11y.email")}
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                  autoComplete="email"
                  required
                  className="iv-field w-full rounded-xl border bg-bg/40 px-3.5 py-2.5 text-sm outline-none"
                />
              </div>
              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-xl border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad"
                >
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={busy}
                aria-busy={busy}
                className="w-full rounded-full bg-accent py-2.5 font-display text-sm font-bold text-on-accent transition hover:bg-accent2 disabled:opacity-50"
              >
                {busy ? t("common.loading") : t("auth.sendResetLink")}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-muted">
              <Link href="/login" className="font-medium text-accent2 hover:underline">
                {t("auth.backToLogin")}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function ResetForm({ token }: { token: string | null }) {
  const router = useRouter();
  const t = useT();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? t("common.error"));
      router.push("/studio");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
      setBusy(false);
    }
  }

  return (
    <div className="folio-enter mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
      <div className="folio p-6 sm:p-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent2">
          {t("auth.resetEyebrow")}
        </p>
        {token ? (
          <>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
              {t("auth.resetTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted">{t("auth.resetBlurb")}</p>

            <form onSubmit={submit} className="mt-6 space-y-3">
              <div>
                <label htmlFor="reset-password" className="sr-only">
                  {t("a11y.password")}
                </label>
                <input
                  id="reset-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.newPassword")}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="iv-field w-full rounded-xl border bg-bg/40 px-3.5 py-2.5 text-sm outline-none"
                />
              </div>
              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="rounded-xl border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad"
                >
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={busy}
                aria-busy={busy}
                className="w-full rounded-full bg-accent py-2.5 font-display text-sm font-bold text-on-accent transition hover:bg-accent2 disabled:opacity-50"
              >
                {busy ? t("common.loading") : t("auth.resetSubmit")}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
              {t("auth.resetInvalidTitle")}
            </h1>
            <p className="mt-2 text-sm text-muted">{t("auth.resetInvalidBlurb")}</p>
            <p className="mt-5 text-center text-sm text-muted">
              <Link href="/forgot" className="font-medium text-accent2 hover:underline">
                {t("auth.requestNewLink")}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
