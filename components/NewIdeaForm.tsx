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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, goal, goalDetail }),
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
