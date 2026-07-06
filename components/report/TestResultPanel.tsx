"use client";

import { useState } from "react";
import type { TestResultData } from "@/lib/generators/testresult";

// The loop's keystone: record what ACTUALLY happened when the kill-test ran. The
// system — not the founder — scores the report against the pre-registered bars, so
// the goalposts can't move after the data came in. A recorded outcome then feeds
// re-validation as founder context (tiered by the claims audit like any self-report).

const OUTCOME_STYLE: Record<string, { label: string; cls: string; bar: string }> = {
  pass: { label: "PASS", cls: "text-good", bar: "border-good/50 bg-good/10" },
  kill: { label: "KILL", cls: "text-bad", bar: "border-bad/50 bg-bad/10" },
  inconclusive: { label: "INCONCLUSIVE", cls: "text-warn", bar: "border-warn/50 bg-warn/10" },
};

export function TestResultPanel({
  result,
  onRecord,
  recording,
  onRevalidate,
  disabled,
  print = false,
}: {
  result: TestResultData | null;
  onRecord?: (report: string) => void;
  recording?: boolean;
  /** Creates the next version with this outcome as context and re-validates. */
  onRevalidate?: () => void;
  disabled?: boolean;
  print?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");

  // Outcome recorded: the banner + the path back into the loop.
  if (result) {
    const s = OUTCOME_STYLE[result.outcome] ?? OUTCOME_STYLE.inconclusive;
    return (
      <div className={`rounded-xl border p-4 ${s.bar}`}>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted">Test result ·</span>
          <span className={`font-display text-xl font-bold ${s.cls}`}>{s.label}</span>
          <span className="text-[11px] text-muted">
            judged against the pre-registered bars — not the founder&apos;s call
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-fg/90">{result.reasoning}</p>
        <p className="mt-2 border-l-2 border-border pl-3 text-xs leading-relaxed text-muted">
          Reported: “{result.report}”
        </p>
        {!print && onRevalidate && (
          <button
            onClick={onRevalidate}
            disabled={disabled}
            className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {result.outcome === "kill"
              ? "Re-validate with this result — expect the verdict to drop honestly →"
              : "Re-validate with this result →"}
          </button>
        )}
      </div>
    );
  }

  if (print) return null;

  // No result yet: the quiet recording affordance, expanding to the form.
  return (
    <div className="no-print rounded-xl border border-dashed border-border bg-panel/30 px-4 py-3">
      {!open ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">
            Ran the test? Report what happened — the system scores it against the pass/kill bars above.
          </span>
          <button
            onClick={() => setOpen(true)}
            className="ml-auto shrink-0 rounded-lg border border-accent/40 px-3 py-1.5 text-sm font-medium text-accent transition hover:bg-accent/10"
          >
            ✍ Record the result
          </button>
        </div>
      ) : (
        <div>
          <div className="mb-1.5 text-sm font-medium text-fg/90">What happened? Numbers first.</div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder='e.g. "DMed 22 platform leads over 6 days. 7 replied, 4 said they&apos;d pay, 2 booked a paid eval. 3 said they built it in-house."'
            className="w-full rounded-lg border border-border bg-panel px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => onRecord?.(draft)}
              disabled={recording || draft.trim().length < 10}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {recording ? "Scoring against the bars…" : "Score it against the bars"}
            </button>
            <button onClick={() => setOpen(false)} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-panel2">
              Cancel
            </button>
            <span className="text-[11px] text-muted">The outcome is computed from the pre-registered thresholds.</span>
          </div>
        </div>
      )}
    </div>
  );
}
