"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "./LocaleProvider";

type Key = {
  id: string;
  prefix: string;
  label: string | null;
  credits: number;
  revoked: boolean;
  last_used_at: string | null;
};

export function AccountClient({
  email,
  name,
  initialKeys,
  trialCredits,
}: {
  email: string;
  name: string | null;
  initialKeys: Key[];
  trialCredits: number;
}) {
  const t = useT();
  const router = useRouter();
  const [keys, setKeys] = useState<Key[]>(initialKeys);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  async function mintKey() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/account/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? t("account.couldNotCreateKey"));
      setNewKey(j.key);
      setLabel("");
      const list = await (await fetch("/api/account/keys")).json();
      setKeys(list.keys);
    } catch (e) {
      setMsg({ tone: "err", text: e instanceof Error ? e.message : t("account.failed") });
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm(t("account.revokeConfirm"))) return;
    const res = await fetch(`/api/account/keys/${id}`, { method: "DELETE" });
    if (res.ok) setKeys((ks) => ks.map((k) => (k.id === id ? { ...k, revoked: true } : k)));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{t("account.title")}</h1>
          <p className="mt-1 text-sm text-muted">
            {name ? `${name} · ` : ""}
            {email}
          </p>
        </div>
        <button
          onClick={logout}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:text-fg"
        >
          {t("account.signOut")}
        </button>
      </div>

      {msg && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            msg.tone === "ok"
              ? "border-good/30 bg-good/10 text-good"
              : "border-bad/30 bg-bad/10 text-bad"
          }`}
        >
          {msg.text}
        </div>
      )}

      <section>
        <h2 className="font-display text-lg font-semibold">{t("account.apiKeys")}</h2>
        <p className="mt-1 text-sm text-muted">
          {t("account.apiKeysBlurb", {
            credits: trialCredits,
            creditsPlural: trialCredits === 1 ? "" : "s",
          })}{" "}
          <a href="/api/v1/openapi.json" className="text-accent hover:underline">
            {t("account.apiSpec")}
          </a>
          .
        </p>

        {newKey && (
          <div className="mt-3 rounded-lg border border-accent/40 bg-accent/5 p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
              {t("account.copyOnce")}
            </div>
            <code className="mt-1 block break-all rounded bg-panel2 px-2 py-1.5 font-mono text-sm">
              {newKey}
            </code>
            <button
              onClick={() => setNewKey(null)}
              className="mt-2 text-xs text-muted hover:text-fg"
            >
              {t("common.done")}
            </button>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t("account.keyLabelPlaceholder")}
            className="flex-1 rounded-lg border border-border bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={mintKey}
            disabled={busy}
            className="shrink-0 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "…" : t("account.createKey")}
          </button>
        </div>

        {keys.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {keys.map((k) => (
              <li
                key={k.id}
                className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-panel/50 px-3 py-2 text-sm ${
                  k.revoked ? "opacity-50" : ""
                }`}
              >
                <code className="font-mono text-xs">{k.prefix}…</code>
                <span className="text-muted">{k.label ?? t("account.noLabel")}</span>
                <span className="font-mono text-xs text-muted">
                  {k.credits < 0 ? "∞" : k.credits} {t("account.credits")}
                </span>
                {k.revoked ? (
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-wide text-bad">
                    {t("account.revoked")}
                  </span>
                ) : (
                  <button
                    onClick={() => revokeKey(k.id)}
                    className="ml-auto text-xs text-muted hover:text-bad"
                  >
                    {t("account.revoke")}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ChangePassword onDone={(m) => setMsg(m)} />
      <DangerZone email={email} />
    </div>
  );
}

function ChangePassword({ onDone }: { onDone: (m: { tone: "ok" | "err"; text: string }) => void }) {
  const t = useT();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current, next }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? t("account.failed"));
      onDone({ tone: "ok", text: t("account.passwordUpdated") });
      setCurrent("");
      setNext("");
    } catch (err) {
      onDone({ tone: "err", text: err instanceof Error ? err.message : t("account.failed") });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h2 className="font-display text-lg font-semibold">{t("account.changePassword")}</h2>
      <form onSubmit={submit} className="mt-2 flex flex-wrap gap-2">
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder={t("account.currentPassword")}
          autoComplete="current-password"
          required
          className="min-w-40 flex-1 rounded-lg border border-border bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder={t("account.newPassword")}
          autoComplete="new-password"
          required
          minLength={8}
          className="min-w-40 flex-1 rounded-lg border border-border bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium transition hover:bg-panel2 disabled:opacity-50"
        >
          {t("account.update")}
        </button>
      </form>
    </section>
  );
}

function DangerZone({ email }: { email: string }) {
  const t = useT();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  async function del() {
    setErr(null);
    const res = await fetch("/api/account", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      router.push("/signup");
      router.refresh();
    } else {
      const j = await res.json().catch(() => ({}));
      setErr(j.error ?? t("account.failed"));
    }
  }
  return (
    <section className="rounded-lg border border-bad/30 bg-bad/[0.04] p-4">
      <h2 className="font-display text-lg font-semibold text-bad">{t("account.deleteAccount")}</h2>
      <p className="mt-1 text-sm text-muted">{t("account.deleteBlurb", { email })}</p>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-2 rounded-lg border border-bad/40 px-3 py-1.5 text-sm text-bad transition hover:bg-bad/10"
        >
          {t("account.deleteMyAccount")}
        </button>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("account.confirmPassword")}
            className="min-w-48 flex-1 rounded-lg border border-border bg-panel px-3 py-2 text-sm outline-none focus:border-bad"
          />
          <button
            onClick={del}
            className="rounded-lg bg-bad px-3.5 py-2 text-sm font-semibold text-white"
          >
            {t("account.deleteForever")}
          </button>
          <button onClick={() => setOpen(false)} className="text-sm text-muted hover:text-fg">
            {t("common.cancel")}
          </button>
        </div>
      )}
      {err && <div className="mt-2 text-sm text-bad">{err}</div>}
    </section>
  );
}
