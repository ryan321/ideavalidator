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
  // Where the idea came from — "" (unasked/neutral) | "organic" | "whiteboard".
  const [provenance, setProvenance] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <form onSubmit={submit}>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your idea in a sentence or two — e.g. 'A meal-planning app that builds grocery lists from your dietary goals and local store prices.'"
        rows={4}
        className="w-full resize-none rounded-xl border border-border bg-panel p-4 text-sm outline-none placeholder:text-muted focus:border-accent"
      />

      <div className="mt-3">
        <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
          What are you going for?
        </div>
        <div className="flex flex-wrap gap-1.5">
          {GOAL_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setGoal(o.key)}
              className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                goal === o.key
                  ? "border-accent bg-accent/15 text-accent"
                  : "border-border text-muted hover:text-fg"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <input
          value={goalDetail}
          onChange={(e) => setGoalDetail(e.target.value)}
          placeholder="Optional: time, effort & budget — e.g. “~$200k/yr, solo, nights & weekends, bootstrap only”"
          className="mt-2 w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm outline-none placeholder:text-muted focus:border-accent"
        />
      </div>

      <div className="mt-3">
        <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
          About you <span className="font-normal normal-case text-muted/70">— optional, sharpens the scoring</span>
        </div>
        <div className="space-y-2">
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
                    className={`rounded-md border px-2.5 py-1 text-xs transition ${
                      row.value === o ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:text-fg"
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
                  className={`rounded-md border px-2.5 py-1 text-xs transition ${
                    provenance === o.key ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:text-fg"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && <div className="mt-2 text-sm text-bad">{error}</div>}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted">
          Scored against your goal · grounded in live web search · stays on your machine
        </span>
        <button
          type="submit"
          disabled={busy || prompt.trim().length < 8}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Creating…" : "Validate idea →"}
        </button>
      </div>
    </form>
  );
}
