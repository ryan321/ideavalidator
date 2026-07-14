"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "./LocaleProvider";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

export function AuthForm({
  mode,
  googleEnabled = false,
  notice,
}: {
  mode: "login" | "signup";
  googleEnabled?: boolean;
  /** A server-side message to surface (e.g. an OAuth error redirected back to /login). */
  notice?: string;
}) {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";
  const formId = isSignup ? "signup" : "login";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isSignup ? { email, password, name } : { email, password }),
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
          {isSignup ? t("auth.getStarted") : t("auth.welcomeBack")}
        </p>
        <h1 className="mt-2 font-display text-3xl font-extrabold tracking-tight">
          {isSignup ? t("auth.createAccount") : t("auth.signIn")}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {isSignup ? t("auth.signupBlurb") : t("auth.loginBlurb")}
        </p>

        {notice && (
          <div
            role="status"
            className="mt-4 rounded-xl border border-warn/35 bg-warn/10 px-3 py-2 text-sm text-warn"
          >
            {notice}
          </div>
        )}

        {googleEnabled && (
          <div className="mt-6">
            {/* Full-page navigation (not fetch): the OAuth flow is server redirects, and any
                idea draft stashed by the hero survives in localStorage across the round-trip. */}
            <a
              href="/api/auth/google"
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-bg/40 px-4 py-2.5 text-sm font-medium text-fg transition hover:border-accent/40 hover:bg-panel2"
            >
              <GoogleIcon />
              {t("oauth.continueWithGoogle")}
            </a>
            <div className="my-5 flex items-center gap-3 font-mono text-[11px] uppercase tracking-wide text-muted">
              <span className="h-px flex-1 bg-border" />
              {t("oauth.or")}
              <span className="h-px flex-1 bg-border" />
            </div>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-3" noValidate={false}>
          {isSignup && (
            <div>
              <label htmlFor={`${formId}-name`} className="sr-only">
                {t("a11y.name")}
              </label>
              <input
                id={`${formId}-name`}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("auth.nameOptional")}
                autoComplete="name"
                className="iv-field w-full rounded-xl border bg-bg/40 px-3.5 py-2.5 text-sm outline-none"
              />
            </div>
          )}
          <div>
            <label htmlFor={`${formId}-email`} className="sr-only">
              {t("a11y.email")}
            </label>
            <input
              id={`${formId}-email`}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              autoComplete="email"
              required
              className="iv-field w-full rounded-xl border bg-bg/40 px-3.5 py-2.5 text-sm outline-none"
            />
          </div>
          <div>
            <label htmlFor={`${formId}-password`} className="sr-only">
              {t("a11y.password")}
            </label>
            <input
              id={`${formId}-password`}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isSignup ? t("auth.passwordSignup") : t("auth.password")}
              autoComplete={isSignup ? "new-password" : "current-password"}
              required
              minLength={isSignup ? 8 : undefined}
              className="iv-field w-full rounded-xl border bg-bg/40 px-3.5 py-2.5 text-sm outline-none"
            />
          </div>
          {!isSignup && (
            <p className="text-end text-xs">
              <Link href="/forgot" className="font-medium text-accent2 hover:underline">
                {t("auth.forgotPassword")}
              </Link>
            </p>
          )}
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
            {busy
              ? t("common.loading")
              : isSignup
                ? t("auth.submitSignup")
                : t("auth.submitLogin")}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-muted">
          {isSignup ? (
            <>
              {t("auth.hasAccount")}{" "}
              <Link href="/login" className="font-medium text-accent2 hover:underline">
                {t("auth.signIn")}
              </Link>
            </>
          ) : (
            <>
              {t("auth.noAccount")}{" "}
              <Link href="/signup" className="font-medium text-accent2 hover:underline">
                {t("auth.createAnAccount")}
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
