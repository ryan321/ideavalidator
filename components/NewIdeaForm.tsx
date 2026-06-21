"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewIdeaForm() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
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
        body: JSON.stringify({ prompt }),
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
      {error && <div className="mt-2 text-sm text-bad">{error}</div>}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted">
          Grounded in live web search · stays on your machine
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
