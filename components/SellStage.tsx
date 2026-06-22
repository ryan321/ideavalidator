"use client";

import { useEffect, useState } from "react";
import type { PriceTest, Prospect, ProspectStatus } from "@/lib/db";
import type { Outreach } from "@/lib/generators/outreach";
import { OutreachView } from "./artifacts";

const STATUSES: { key: ProspectStatus; label: string }[] = [
  { key: "lead", label: "Lead" },
  { key: "contacted", label: "Contacted" },
  { key: "meeting", label: "Meeting" },
  { key: "demo", label: "Demo" },
  { key: "trial", label: "Trial" },
  { key: "paying", label: "Paying" },
  { key: "lost", label: "Lost" },
];

const statusColor = (s: ProspectStatus) =>
  s === "paying" ? "var(--color-good)" : s === "lost" ? "var(--color-bad)" : "var(--color-accent2)";

export default function SellStage({
  ideaId,
  chosenVersionId,
  outreach,
  outreachBusy,
  onGenerateOutreach,
  onCost,
  onApplyLearnings,
}: {
  ideaId: string;
  chosenVersionId: string | null;
  outreach?: unknown;
  outreachBusy: boolean;
  onGenerateOutreach: () => void;
  onCost: (delta: number) => void;
  onApplyLearnings: (context: string) => void;
}) {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [newName, setNewName] = useState("");
  const [tests, setTests] = useState<PriceTest[]>([]);
  const [newOffer, setNewOffer] = useState("");
  const [learnings, setLearnings] = useState<Learnings | null>(null);
  const [synthLoading, setSynthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/ideas/${ideaId}/prospects`)
      .then((r) => r.json())
      .then((j) => Array.isArray(j.prospects) && setProspects(j.prospects))
      .catch(() => {});
    fetch(`/api/ideas/${ideaId}/pricing`)
      .then((r) => r.json())
      .then((j) => Array.isArray(j.tests) && setTests(j.tests))
      .catch(() => {});
  }, [ideaId]);

  const paying = prospects.filter((p) => p.status === "paying").length;
  const active = prospects.filter((p) => p.status !== "lost").length;

  async function addProspect() {
    const name = newName.trim() || "New prospect";
    setNewName("");
    const res = await fetch(`/api/ideas/${ideaId}/prospects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const p = await res.json();
    if (p?.id) setProspects((prev) => [...prev, p]);
  }

  function patch(pid: string, fields: Partial<Prospect>) {
    setProspects((prev) => prev.map((p) => (p.id === pid ? { ...p, ...fields } : p)));
    fetch(`/api/ideas/${ideaId}/prospects/${pid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    }).catch(() => {});
  }

  function remove(pid: string) {
    setProspects((prev) => prev.filter((p) => p.id !== pid));
    fetch(`/api/ideas/${ideaId}/prospects/${pid}`, { method: "DELETE" }).catch(() => {});
  }

  async function addTest() {
    const offer = newOffer.trim() || "$/mo";
    setNewOffer("");
    const res = await fetch(`/api/ideas/${ideaId}/pricing`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offer }),
    });
    const t = await res.json();
    if (t?.id) setTests((prev) => [...prev, t]);
  }

  function patchTest(tid: string, fields: Partial<PriceTest>) {
    setTests((prev) => prev.map((t) => (t.id === tid ? { ...t, ...fields } : t)));
    fetch(`/api/ideas/${ideaId}/pricing/${tid}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    }).catch(() => {});
  }

  function removeTest(tid: string) {
    setTests((prev) => prev.filter((t) => t.id !== tid));
    fetch(`/api/ideas/${ideaId}/pricing/${tid}`, { method: "DELETE" }).catch(() => {});
  }

  async function synthesize() {
    setSynthLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/learnings`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not synthesize");
      setLearnings(j.learnings);
      onCost(j.cost ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not synthesize");
    } finally {
      setSynthLoading(false);
    }
  }

  const outreachData = outreach as Outreach | undefined;

  return (
    <div className="space-y-6">
      {/* progress to 5 paying customers */}
      <div className="rounded-xl border border-border bg-panel p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-base font-bold">First 5 paying customers</h3>
            <p className="mt-1 text-sm text-muted">
              Track real prospects from first touch to paying. This is the whole point — everything before
              was preparation.
            </p>
          </div>
          <div className="text-right">
            <div className="font-mono text-3xl font-bold" style={{ color: paying >= 5 ? "var(--color-good)" : "var(--color-fg)" }}>
              {paying}
              <span className="text-lg text-muted">/5</span>
            </div>
            <div className="text-xs text-muted">paying · {active} active</div>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel2">
          <div
            className="h-full rounded-full bg-good transition-all"
            style={{ width: `${Math.min(100, (paying / 5) * 100)}%` }}
          />
        </div>
      </div>

      {/* pipeline */}
      <div className="rounded-xl border border-border bg-panel p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">Pipeline</h3>
        </div>

        <div className="mb-3 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addProspect()}
            placeholder="Add a prospect (name or company)…"
            className="min-w-0 flex-1 rounded-lg border border-border bg-panel2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button onClick={addProspect} className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white">
            + Add
          </button>
        </div>

        {prospects.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            No prospects yet. Add the real people/companies you&apos;ll reach out to — generate openers below to
            get started.
          </p>
        ) : (
          <div className="space-y-2">
            {prospects.map((p) => (
              <div key={p.id} className="rounded-lg border border-border bg-panel2/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: statusColor(p.status) }}
                    aria-hidden
                  />
                  <input
                    defaultValue={p.name}
                    onBlur={(e) => e.target.value !== p.name && patch(p.id, { name: e.target.value })}
                    className="min-w-[8rem] flex-1 rounded-md bg-transparent px-1 py-0.5 text-sm font-medium outline-none focus:bg-panel"
                  />
                  <select
                    value={p.status}
                    onChange={(e) => patch(p.id, { status: e.target.value as ProspectStatus })}
                    className="rounded-md border border-border bg-panel px-2 py-1 text-xs outline-none"
                    style={{ color: statusColor(p.status) }}
                  >
                    {STATUSES.map((s) => (
                      <option key={s.key} value={s.key} style={{ color: "var(--color-fg)" }}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={p.pain ?? ""}
                    onChange={(e) => patch(p.id, { pain: e.target.value ? Number(e.target.value) : null })}
                    title="How acutely they feel the problem (1–5)"
                    className="rounded-md border border-border bg-panel px-2 py-1 text-xs text-muted outline-none"
                  >
                    <option value="">pain —</option>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        pain {n}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => remove(p.id)}
                    className="ml-auto rounded-md px-1.5 text-sm text-muted hover:text-bad"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <input
                    defaultValue={p.channel ?? ""}
                    onBlur={(e) => (e.target.value || null) !== p.channel && patch(p.id, { channel: e.target.value || null })}
                    placeholder="channel (e.g. LinkedIn)"
                    className="rounded-md border border-border bg-panel px-2 py-1 text-xs outline-none focus:border-accent"
                  />
                  <input
                    defaultValue={p.objection ?? ""}
                    onBlur={(e) => (e.target.value || null) !== p.objection && patch(p.id, { objection: e.target.value || null })}
                    placeholder="their objection / blocker"
                    className="rounded-md border border-border bg-panel px-2 py-1 text-xs outline-none focus:border-accent"
                  />
                  <input
                    defaultValue={p.next_step ?? ""}
                    onBlur={(e) => (e.target.value || null) !== p.next_step && patch(p.id, { next_step: e.target.value || null })}
                    placeholder="next step"
                    className="rounded-md border border-border bg-panel px-2 py-1 text-xs outline-none focus:border-accent"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* synthesize learnings -> re-validate */}
        {prospects.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <button
              onClick={synthesize}
              disabled={synthLoading}
              className="rounded-lg border border-accent2/40 px-3 py-1.5 text-sm text-accent2 hover:bg-accent2/10 disabled:opacity-50"
            >
              {synthLoading ? "Reading your notes…" : "🧠 What am I hearing? → re-validate"}
            </button>
            {error && <div className="mt-2 text-sm text-bad">{error}</div>}
            {learnings && (
              <div className="mt-3 rounded-xl border border-accent2/30 bg-accent2/5 p-4">
                <div className="text-sm font-semibold text-accent2">What the market is telling you</div>
                <ul className="mt-2 space-y-1.5">
                  {learnings.themes.map((t, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium">{t.theme}</span>
                      <span className="text-muted"> — {t.evidence}</span>
                    </li>
                  ))}
                </ul>
                {learnings.biggest_objection && (
                  <p className="mt-2 text-sm">
                    <span className="text-muted">Biggest blocker: </span>
                    {learnings.biggest_objection}
                  </p>
                )}
                <p className="mt-2 text-sm">
                  <span className="text-muted">Recommended change: </span>
                  {learnings.recommended_change}
                </p>
                <button
                  onClick={() => onApplyLearnings(learnings.suggested_context)}
                  className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white"
                >
                  Re-validate the idea with these learnings →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* pricing experiments */}
      <div className="rounded-xl border border-border bg-panel p-5">
        <div className="mb-1">
          <h3 className="text-base font-bold">Pricing experiments</h3>
          <p className="mt-1 text-sm text-muted">
            Stop guessing the price — put real offers to real prospects and log who&apos;d actually pay.
          </p>
        </div>
        <div className="my-3 flex gap-2">
          <input
            value={newOffer}
            onChange={(e) => setNewOffer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTest()}
            placeholder="Test an offer — e.g. “$199/mo”, “one-time $2k”…"
            className="min-w-0 flex-1 rounded-lg border border-border bg-panel2 px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button onClick={addTest} className="shrink-0 rounded-lg bg-accent px-3 py-2 text-sm font-medium text-white">
            + Test
          </button>
        </div>
        {tests.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No pricing tests yet.</p>
        ) : (
          <div className="space-y-2">
            {tests.map((t) => {
              const conv = t.asked && t.asked > 0 ? Math.round(((t.willing ?? 0) / t.asked) * 100) : null;
              return (
                <div key={t.id} className="rounded-lg border border-border bg-panel2/60 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      defaultValue={t.offer ?? ""}
                      onBlur={(e) => (e.target.value || null) !== t.offer && patchTest(t.id, { offer: e.target.value || null })}
                      className="min-w-[6rem] flex-1 rounded-md bg-transparent px-1 py-0.5 text-sm font-semibold outline-none focus:bg-panel"
                    />
                    {conv != null && (
                      <span
                        className="rounded-full border px-2 py-0.5 font-mono text-xs"
                        style={{
                          color: conv >= 30 ? "var(--color-good)" : conv >= 10 ? "var(--color-warn)" : "var(--color-bad)",
                        }}
                        title="willing ÷ asked"
                      >
                        {conv}% would pay
                      </span>
                    )}
                    <button onClick={() => removeTest(t.id)} className="rounded-md px-1.5 text-sm text-muted hover:text-bad" title="Remove">
                      ✕
                    </button>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-4">
                    <input
                      defaultValue={t.audience ?? ""}
                      onBlur={(e) => (e.target.value || null) !== t.audience && patchTest(t.id, { audience: e.target.value || null })}
                      placeholder="audience"
                      className="rounded-md border border-border bg-panel px-2 py-1 text-xs outline-none focus:border-accent"
                    />
                    <input
                      type="number"
                      min={0}
                      defaultValue={t.asked ?? ""}
                      onBlur={(e) => patchTest(t.id, { asked: e.target.value ? Number(e.target.value) : null })}
                      placeholder="# asked"
                      className="rounded-md border border-border bg-panel px-2 py-1 text-xs outline-none focus:border-accent"
                    />
                    <input
                      type="number"
                      min={0}
                      defaultValue={t.willing ?? ""}
                      onBlur={(e) => patchTest(t.id, { willing: e.target.value ? Number(e.target.value) : null })}
                      placeholder="# would pay"
                      className="rounded-md border border-border bg-panel px-2 py-1 text-xs outline-none focus:border-accent"
                    />
                    <input
                      defaultValue={t.notes ?? ""}
                      onBlur={(e) => (e.target.value || null) !== t.notes && patchTest(t.id, { notes: e.target.value || null })}
                      placeholder="notes"
                      className="rounded-md border border-border bg-panel px-2 py-1 text-xs outline-none focus:border-accent"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* outreach openers */}
      <div className="rounded-xl border border-border bg-panel p-5">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold">Outreach</h3>
            <p className="mt-1 text-sm text-muted">Cold openers + a plan to land the first 5 — built from your validation &amp; customer pitch.</p>
          </div>
          {chosenVersionId && (
            <button
              onClick={onGenerateOutreach}
              disabled={outreachBusy}
              className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {outreachBusy ? "Writing…" : outreachData ? "Regenerate" : "Generate outreach"}
            </button>
          )}
        </div>
        {!chosenVersionId ? (
          <p className="mt-3 text-sm text-muted">Choose a version in Decide first.</p>
        ) : outreachBusy ? (
          <div className="mt-3 animate-pulse text-sm text-muted">Writing your openers…</div>
        ) : outreachData ? (
          <div className="mt-3">
            <OutreachView d={outreachData} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">No openers yet — generate them to start reaching out.</p>
        )}
      </div>
    </div>
  );
}

type Learnings = {
  themes: { theme: string; evidence: string }[];
  biggest_objection: string;
  recommended_change: string;
  suggested_context: string;
};
