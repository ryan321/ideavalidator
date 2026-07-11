"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "./LocaleProvider";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
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
                className="w-full rounded-xl border border-border bg-bg/40 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
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
              className="w-full rounded-xl border border-border bg-bg/40 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
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
              className="w-full rounded-xl border border-border bg-bg/40 px-3.5 py-2.5 text-sm outline-none focus:border-accent"
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
