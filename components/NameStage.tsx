"use client";

import { useEffect, useState } from "react";
import type { NameCandidate, NameFeedback } from "@/lib/generators/names";
import { ALL_TLDS, DEFAULT_TLDS } from "@/lib/tlds";

const fmtCost = (n: number) => (n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`);
const slugify = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");

const SOCIALS: { key: string; label: string; aliases: string[] }[] = [
  { key: "x", label: "X", aliases: ["x", "twitter"] },
  { key: "instagram", label: "IG", aliases: ["instagram", "ig"] },
  { key: "tiktok", label: "TikTok", aliases: ["tiktok"] },
  { key: "youtube", label: "YT", aliases: ["youtube", "yt"] },
  { key: "github", label: "GH", aliases: ["github", "gh"] },
];

type TriState = "available" | "taken" | "unknown";

function handleState(c: NameCandidate, s: { key: string; aliases: string[] }): { status: TriState; note?: string } {
  const http = c.handles?.[s.key];
  if (http && http !== "unknown") return { status: http };
  const fromIntel = c.intel?.handles?.find((h) => {
    const p = h.platform.toLowerCase().trim();
    return s.aliases.some((a) => p === a || p.startsWith(a));
  });
  if (fromIntel) {
    const lt = fromIntel.likely_taken;
    return { status: lt === undefined ? "unknown" : lt ? "taken" : "available", note: fromIntel.note };
  }
  return { status: "unknown" };
}

const RISK_COLOR: Record<string, string> = {
  low: "var(--color-good)",
  medium: "var(--color-warn)",
  high: "var(--color-bad)",
};

export default function NameStage({
  ideaId,
  onCost,
}: {
  ideaId: string;
  onCost: (delta: number) => void;
}) {
  const [data, setData] = useState<NameCandidate[] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState("");
  const [tlds, setTlds] = useState<string[]>([...DEFAULT_TLDS]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Reload whenever the idea changes (this component can be reused across ideas
  // without remounting, so a one-shot guard would show the previous idea's names).
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setChosen(null);
    fetch(`/api/ideas/${ideaId}/names`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        setData(Array.isArray(j.candidates) ? j.candidates : null);
        setChosen(j.chosen_name ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ideaId]);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ideas/${ideaId}/names`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: instructions.trim() || null, tlds }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not generate names");
      setData(j.candidates);
      onCost(j.cost ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not generate names");
    } finally {
      setLoading(false);
    }
  }

  function choose(name: string) {
    const prevChosen = chosen;
    setChosen(name);
    fetch(`/api/ideas/${ideaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chosenName: name }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
      })
      .catch(() => {
        setChosen(prevChosen);
        setError("Couldn't save the chosen name — try again.");
      });
  }

  function vote(name: string, current: NameFeedback, dir: "up" | "down") {
    const next: NameFeedback = current === dir ? null : dir;
    setData((prev) => prev?.map((c) => (c.name === name ? { ...c, feedback: next } : c)) ?? prev);
    fetch(`/api/ideas/${ideaId}/names`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, feedback: next }),
    })
      .then((r) => {
        if (!r.ok) throw new Error();
      })
      .catch(() => {
        // revert the optimistic vote if it didn't persist
        setData((prev) => prev?.map((c) => (c.name === name ? { ...c, feedback: current } : c)) ?? prev);
      });
  }

  function toggleTld(tld: string) {
    setTlds((prev) => (prev.includes(tld) ? prev.filter((t) => t !== tld) : [...prev, tld]));
  }

  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold">Name it</h3>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Brand-name ideas with live domain, social-handle, and trademark/company checks. 👍/👎 to teach
            the next round; pick one to lock the name.
          </p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="shrink-0 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Researching…" : data ? "Regenerate" : "Generate names"}
        </button>
      </div>

      {/* generation controls */}
      <div className="mt-3 space-y-2">
        <input
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) generate();
          }}
          placeholder="Naming instructions (optional) — e.g. “lesser-known TLDs”, “one word, no suffixes”, “evoke speed”"
          className="w-full rounded-lg border border-border bg-panel2 px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted">Check TLDs:</span>
          {ALL_TLDS.map((tld) => {
            const on = tlds.includes(tld);
            return (
              <button
                key={tld}
                onClick={() => toggleTld(tld)}
                className={`rounded-md border px-2 py-0.5 font-mono text-[11px] transition ${
                  on ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:text-fg"
                }`}
              >
                {tld}
              </button>
            );
          })}
        </div>
      </div>

      {chosen && (
        <div className="mt-3 rounded-lg border border-good/30 bg-good/5 px-3 py-2 text-sm">
          <span className="text-muted">Chosen name: </span>
          <span className="font-semibold text-good">{chosen}</span>
        </div>
      )}
      {error && <div className="mt-3 text-sm text-bad">{error}</div>}
      {loading && (
        <div className="mt-4 animate-pulse text-sm text-muted">
          Generating names &amp; running live domain / social / trademark checks…
        </div>
      )}

      {data && (
        <div className="mt-4 space-y-3">
          {data.map((c, i) => {
            const isChosen = c.name === chosen;
            const slug = slugify(c.name);
            const risk = c.intel?.overall_risk;
            const comTaken = c.domains?.[".com"] === "taken";
            const open = expanded[c.name];
            return (
              <div
                key={i}
                className={`rounded-lg border p-3 ${isChosen ? "border-good bg-good/5" : "border-border"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{c.name}</span>
                      {risk && (
                        <span
                          className="rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                          style={{ color: RISK_COLOR[risk], borderColor: `color-mix(in srgb, ${RISK_COLOR[risk]} 40%, transparent)` }}
                          title="Overall name-adoption risk"
                        >
                          {risk} risk
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted">{c.rationale}</p>

                    {/* domains */}
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {Object.entries(c.domains || {}).map(([tld, status]) => (
                        <span
                          key={tld}
                          title={status}
                          className="rounded-md border px-1.5 py-0.5 font-mono text-[11px]"
                          style={{
                            color: status === "available" ? "var(--color-good)" : "var(--color-muted)",
                            borderColor:
                              status === "available"
                                ? "color-mix(in srgb, var(--color-good) 40%, transparent)"
                                : "var(--color-border)",
                            textDecoration: status === "taken" ? "line-through" : "none",
                          }}
                        >
                          {slug}
                          {tld}
                          {status === "available" ? " ✓" : status === "unknown" ? " ?" : ""}
                        </span>
                      ))}
                    </div>

                    {/* .com live-site read (only meaningful when registered) */}
                    {comTaken && c.site && (
                      <div className="mt-1.5 text-[11px]">
                        {!c.site.reachable ? (
                          <span className="text-good">● registered, but no live site (possibly acquirable)</span>
                        ) : c.site.placeholder ? (
                          <span className="text-warn">● parked / placeholder page</span>
                        ) : (
                          <span className="text-muted">
                            ● live site{c.site.title ? `: “${c.site.title}”` : ""}
                          </span>
                        )}
                      </div>
                    )}

                    {/* social handles — only meaningful once a candidate has been checked */}
                    {!c.handles && !c.intel ? (
                      <div className="mt-1.5 text-[11px] text-muted/70">
                        Social &amp; trademark checks not run for this name — regenerate to populate.
                      </div>
                    ) : (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {SOCIALS.map((s) => {
                        const { status, note } = handleState(c, s);
                        const color =
                          status === "available"
                            ? "var(--color-good)"
                            : status === "taken"
                              ? "var(--color-muted)"
                              : "var(--color-muted)";
                        return (
                          <span
                            key={s.key}
                            title={note ? `${s.label}: ${note}` : `${s.label} @${slug}: ${status}`}
                            className="rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px]"
                            style={{
                              color,
                              textDecoration: status === "taken" ? "line-through" : "none",
                              opacity: status === "unknown" ? 0.6 : 1,
                            }}
                          >
                            {s.label}
                            {status === "available" ? " ✓" : status === "unknown" ? " ?" : ""}
                          </span>
                        );
                      })}
                    </div>
                    )}
                  </div>

                  {/* actions */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => vote(c.name, c.feedback ?? null, "up")}
                      title="More like this next time"
                      className={`rounded-md border px-2 py-1 text-sm ${
                        c.feedback === "up" ? "border-good bg-good/15 text-good" : "border-border text-muted hover:text-fg"
                      }`}
                    >
                      👍
                    </button>
                    <button
                      onClick={() => vote(c.name, c.feedback ?? null, "down")}
                      title="Avoid this style next time"
                      className={`rounded-md border px-2 py-1 text-sm ${
                        c.feedback === "down" ? "border-bad bg-bad/15 text-bad" : "border-border text-muted hover:text-fg"
                      }`}
                    >
                      👎
                    </button>
                    <button
                      onClick={() => choose(c.name)}
                      disabled={isChosen}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                        isChosen ? "bg-good/15 text-good" : "bg-accent text-white hover:opacity-90"
                      }`}
                    >
                      {isChosen ? "✓ Chosen" : "Choose"}
                    </button>
                  </div>
                </div>

                {/* due-diligence detail */}
                {(c.intel || c.intelError) && (
                  <div className="mt-2 border-t border-border pt-2">
                    {c.intelError ? (
                      <div className="text-[11px] text-muted">Due-diligence check unavailable ({c.intelError}).</div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-fg/85">{c.intel!.summary}</p>
                          <button
                            onClick={() => setExpanded((p) => ({ ...p, [c.name]: !p[c.name] }))}
                            className="shrink-0 font-mono text-[11px] text-accent hover:underline"
                          >
                            {open ? "− less" : "+ details"}
                          </button>
                        </div>
                        {open && (
                          <dl className="mt-2 grid gap-1.5 text-[11px] sm:grid-cols-2">
                            <Detail
                              label="Existing company"
                              tone={c.intel!.company_exists ? (c.intel!.same_industry ? "bad" : "warn") : "good"}
                              value={
                                c.intel!.company_exists
                                  ? `${c.intel!.same_industry ? "Same/adjacent industry — collision risk. " : ""}${c.intel!.company_note}`
                                  : "None found"
                              }
                            />
                            <Detail
                              label="Trademark"
                              tone={c.intel!.trademark_risk === "likely" ? "bad" : c.intel!.trademark_risk === "possible" ? "warn" : "good"}
                              value={`${c.intel!.trademark_risk}${c.intel!.trademark_note?.trim() ? ` — ${c.intel!.trademark_note.trim()}` : ""}`}
                            />
                            <Detail
                              label="Doing business as"
                              tone={c.intel!.existing_business && !/^(none|no\b|n\/a)/i.test(c.intel!.existing_business) ? "warn" : "good"}
                              value={c.intel!.existing_business || "None found"}
                            />
                          </dl>
                        )}
                      </>
                    )}
                    {c.cost != null && c.cost > 0 && (
                      <div className="mt-1 font-mono text-[10px] text-muted">research {fmtCost(c.cost)}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {!data && !loading && <p className="mt-4 text-sm text-muted">No names yet — generate some.</p>}
    </div>
  );
}

function Detail({ label, value, tone }: { label: string; value: string; tone: "good" | "warn" | "bad" }) {
  const color = tone === "good" ? "var(--color-good)" : tone === "warn" ? "var(--color-warn)" : "var(--color-bad)";
  return (
    <div className="rounded-md border border-border bg-panel2 px-2 py-1.5">
      <dt className="font-semibold" style={{ color }}>
        {label}
      </dt>
      <dd className="mt-0.5 text-muted">{value}</dd>
    </div>
  );
}
