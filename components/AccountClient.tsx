"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Key = { id: string; prefix: string; label: string | null; credits: number; revoked: boolean; last_used_at: string | null };

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
  const router = useRouter();
  const [keys, setKeys] = useState<Key[]>(initialKeys);
  const [newKey, setNewKey] = useState<string | null>(null); // the raw key, shown once
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
      if (!res.ok) throw new Error(j.error ?? "Could not create key");
      setNewKey(j.key);
      setLabel("");
      const list = await (await fetch("/api/account/keys")).json();
      setKeys(list.keys);
    } catch (e) {
      setMsg({ tone: "err", text: e instanceof Error ? e.message : "Failed" });
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey(id: string) {
    if (!confirm("Revoke this key? Anything using it will stop working.")) return;
    const res = await fetch(`/api/account/keys/${id}`, { method: "DELETE" });
    if (res.ok) setKeys((ks) => ks.map((k) => (k.id === id ? { ...k, revoked: true } : k)));
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Account</h1>
          <p className="mt-1 text-sm text-muted">
            {name ? `${name} · ` : ""}
            {email}
          </p>
        </div>
        <button onClick={logout} className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:text-fg">
          Sign out
        </button>
      </div>

      {msg && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${msg.tone === "ok" ? "border-good/30 bg-good/10 text-good" : "border-bad/30 bg-bad/10 text-bad"}`}>
          {msg.text}
        </div>
      )}

      {/* API keys */}
      <section>
        <h2 className="font-display text-lg font-semibold">API keys</h2>
        <p className="mt-1 text-sm text-muted">
          For agents and scripts calling the API. New keys include {trialCredits} trial credit{trialCredits === 1 ? "" : "s"} (1 per generative call).
          See <a href="/api/v1/openapi.json" className="text-accent hover:underline">the API spec</a>.
        </p>

        {newKey && (
          <div className="mt-3 rounded-lg border border-accent/40 bg-accent/5 p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent">Copy this now — it won&apos;t be shown again</div>
            <code className="mt-1 block break-all rounded bg-panel2 px-2 py-1.5 font-mono text-sm">{newKey}</code>
            <button onClick={() => setNewKey(null)} className="mt-2 text-xs text-muted hover:text-fg">Done</button>
          </div>
        )}

        <div className="mt-3 flex gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Key label (e.g. 'production agent')"
            className="flex-1 rounded-lg border border-border bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button onClick={mintKey} disabled={busy} className="shrink-0 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white disabled:opacity-50">
            {busy ? "…" : "Create key"}
          </button>
        </div>

        {keys.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {keys.map((k) => (
              <li key={k.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border bg-panel/50 px-3 py-2 text-sm ${k.revoked ? "opacity-50" : ""}`}>
                <code className="font-mono text-xs">{k.prefix}…</code>
                <span className="text-muted">{k.label ?? "(no label)"}</span>
                <span className="font-mono text-xs text-muted">{k.credits < 0 ? "∞" : k.credits} credits</span>
                {k.revoked ? (
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-wide text-bad">revoked</span>
                ) : (
                  <button onClick={() => revokeKey(k.id)} className="ml-auto text-xs text-muted hover:text-bad">revoke</button>
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
      if (!res.ok) throw new Error(j.error ?? "Failed");
      onDone({ tone: "ok", text: "Password updated." });
      setCurrent("");
      setNext("");
    } catch (err) {
      onDone({ tone: "err", text: err instanceof Error ? err.message : "Failed" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h2 className="font-display text-lg font-semibold">Change password</h2>
      <form onSubmit={submit} className="mt-2 flex flex-wrap gap-2">
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Current" autoComplete="current-password" required className="min-w-40 flex-1 rounded-lg border border-border bg-panel px-3 py-2 text-sm outline-none focus:border-accent" />
        <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="New (min 8)" autoComplete="new-password" required minLength={8} className="min-w-40 flex-1 rounded-lg border border-border bg-panel px-3 py-2 text-sm outline-none focus:border-accent" />
        <button type="submit" disabled={busy} className="rounded-lg border border-border px-3.5 py-2 text-sm font-medium transition hover:bg-panel2 disabled:opacity-50">Update</button>
      </form>
    </section>
  );
}

function DangerZone({ email }: { email: string }) {
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
      setErr(j.error ?? "Failed");
    }
  }
  return (
    <section className="rounded-lg border border-bad/30 bg-bad/[0.04] p-4">
      <h2 className="font-display text-lg font-semibold text-bad">Delete account</h2>
      <p className="mt-1 text-sm text-muted">Permanently removes {email}, every idea, and all API keys. This cannot be undone.</p>
      {!open ? (
        <button onClick={() => setOpen(true)} className="mt-2 rounded-lg border border-bad/40 px-3 py-1.5 text-sm text-bad transition hover:bg-bad/10">Delete my account</button>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Confirm password" className="min-w-48 flex-1 rounded-lg border border-border bg-panel px-3 py-2 text-sm outline-none focus:border-bad" />
          <button onClick={del} className="rounded-lg bg-bad px-3.5 py-2 text-sm font-semibold text-white">Delete forever</button>
          <button onClick={() => setOpen(false)} className="text-sm text-muted hover:text-fg">Cancel</button>
        </div>
      )}
      {err && <div className="mt-2 text-sm text-bad">{err}</div>}
    </section>
  );
}
