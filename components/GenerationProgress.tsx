"use client";

import { useEffect, useState } from "react";

// Honest phases of what a grounded generation actually does. Timings are estimates
// (we don't stream real events), but each label reflects a real step, so the wait
// reads as rigor — the opposite of a "60-second" black box.
const GROUNDED_STEPS = [
  "Fetching real posts, reviews & issues from public sources",
  "Searching the web for market & competitor evidence",
  "Reading & citing sources",
  "Scoring the idea against your goal",
  "Sizing the market, the money & the plan",
  "Writing the report",
];
const PLAIN_STEPS = ["Gathering your research", "Writing it up"];

export default function GenerationProgress({
  label,
  grounded,
}: {
  label: string;
  grounded: boolean;
}) {
  const steps = grounded ? GROUNDED_STEPS : PLAIN_STEPS;
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    // seconds at which each later step becomes the active one (the comprehensive
    // grounded pass takes ~1-2 min, so the steps are spread out accordingly)
    const at = grounded ? [12, 24, 40, 60, 85] : [6];
    const timers = at.map((sec, i) => setTimeout(() => setIdx(i + 1), sec * 1000));
    return () => timers.forEach(clearTimeout);
  }, [grounded]);

  return (
    <div className="rounded-xl border border-border bg-panel p-6">
      <div className="text-sm font-medium">Generating {label.toLowerCase()}…</div>
      <ul className="mt-4 space-y-2.5">
        {steps.map((s, i) => {
          const state = i < idx ? "done" : i === idx ? "active" : "todo";
          return (
            <li key={i} className="flex items-center gap-3 text-sm">
              {state === "done" ? (
                <span className="grid h-4 w-4 place-items-center rounded-full bg-good/20 text-[10px] text-good">
                  ✓
                </span>
              ) : state === "active" ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent2/30 border-t-accent2" />
              ) : (
                <span className="h-4 w-4 rounded-full border border-border" />
              )}
              <span
                className={
                  state === "todo" ? "text-muted/50" : state === "active" ? "text-fg" : "text-muted"
                }
              >
                {s}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-muted/70">
        Real validation takes a minute — it&apos;s actually searching the web and citing sources, not
        guessing.
      </p>
    </div>
  );
}
