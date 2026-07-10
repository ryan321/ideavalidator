"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GOAL_OPTIONS = [
  { key: "lifestyle", label: "Lifestyle / replace my job" },
  { key: "side_hustle", label: "Side hustle" },
  { key: "venture", label: "Venture-scale / raise" },
  { key: "unsure", label: "Not sure yet" },
];

export default function NewIdeaForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [goal, setGoal] = useState("unsure");
  const [goalDetail, setGoalDetail] = useState("");
  const [insider, setInsider] = useState("");
  const [builder, setBuilder] = useState("");
  const [network, setNetwork] = useState("");
  const [provenance, setProvenance] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const founderFit = [
      insider && `market knowledge: ${insider}`,
      builder && `built software before: ${builder}`,
      network && `warm intros to buyers: ${network}`,
    ]
      .filter(Boolean)
      .join("; ");
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, goal, goalDetail, founderFit, provenance: provenance || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create idea");
      router.push(`/idea/${json.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create idea");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g. A weekly meal kit for shift workers that delivers pre-portioned dinners to hospitals and warehouses — cheaper than DoorDash, ready in 10 minutes."
        rows={4}
        className="w-full resize-none rounded-xl border border-border bg-bg/40 px-4 py-3.5 text-base leading-relaxed outline-none placeholder:text-muted/70 focus:border-accent"
      />

      <div>
        <div className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
          Goal — how we judge GO
        </div>
        <div className="flex flex-wrap gap-2">
          {GOAL_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setGoal(o.key)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                goal === o.key
                  ? "border-accent bg-accent/20 font-medium text-accent2"
                  : "border-border text-muted hover:border-accent/30 hover:text-fg"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <input
          value={goalDetail}
          onChange={(e) => setGoalDetail(e.target.value)}
          placeholder="Optional: time, effort & budget — e.g. nights & weekends, bootstrap only"
          className="mt-2.5 w-full rounded-xl border border-border bg-bg/40 px-3.5 py-2.5 text-sm outline-none placeholder:text-muted/70 focus:border-accent"
        />
      </div>

      <div>
        <button
          type="button"
          onClick={() => setShowMore((s) => !s)}
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition hover:text-accent2"
        >
          {showMore ? "− Hide" : "+"} founder context{" "}
          <span className="normal-case tracking-normal text-muted/60">(optional, sharpens scoring)</span>
        </button>
        {showMore && (
          <div className="mt-3 space-y-2.5 rounded-xl border border-border/80 bg-bg/30 p-3.5">
            {(
              [
                { label: "Know this market?", value: insider, set: setInsider, opts: ["Insider", "Some", "Outsider"] },
                { label: "Built software before?", value: builder, set: setBuilder, opts: ["Yes", "No"] },
                { label: "Warm intros to buyers?", value: network, set: setNetwork, opts: ["Yes", "Some", "None"] },
              ] as const
            ).map((row) => (
              <div key={row.label} className="flex flex-wrap items-center gap-2">
                <span className="w-44 shrink-0 text-sm text-muted">{row.label}</span>
                <div className="flex flex-wrap gap-1.5">
                  {row.opts.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => row.set(row.value === o ? "" : o)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${
                        row.value === o
                          ? "border-accent bg-accent/20 text-accent2"
                          : "border-border text-muted hover:text-fg"
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-44 shrink-0 text-sm text-muted">Where did this come from?</span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { key: "organic", label: "A problem I hit" },
                    { key: "whiteboard", label: "Brainstorming" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setProvenance(provenance === o.key ? "" : o.key)}
                    className={`rounded-full border px-2.5 py-1 text-xs transition ${
                      provenance === o.key
                        ? "border-accent bg-accent/20 text-accent2"
                        : "border-border text-muted hover:text-fg"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-bad/35 bg-bad/10 px-3 py-2 text-sm text-bad">
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
        <p className="max-w-sm text-xs leading-relaxed text-muted">
          Scored against your goal · live web + fetched evidence · stays on your machine
        </p>
        <button
          type="submit"
          disabled={busy || prompt.trim().length < 8}
          className="rounded-pill-pack bg-accent px-6 py-2.5 font-display text-sm font-bold tracking-tight text-on-accent transition hover:bg-accent2 disabled:opacity-45"
        >
          {busy ? "Starting…" : "Validate idea →"}
        </button>
      </div>
    </form>
  );
}
