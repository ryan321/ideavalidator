"use client";

import { useState } from "react";
import type { Kit } from "@/lib/generators/kit";

// The kill-test execution kit — the "run it this week" layer under NextTest. Everything
// here operationalizes the PRE-REGISTERED thresholds: questions probe past behavior,
// green/red signals are the tally units, outreach asks about the problem (never pitches).

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-panel2 p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</span>
        <button
          onClick={() => {
            navigator.clipboard?.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            });
          }}
          className="no-print rounded-md border border-border px-2 py-0.5 text-[11px] text-muted transition hover:bg-panel hover:text-fg"
        >
          {copied ? "✓ copied" : "copy"}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-fg/90">{text}</p>
    </div>
  );
}

export function KillTestKit({
  kit,
  onGenerate,
  generating,
  hasKit,
  print = false,
}: {
  kit: Kit | null;
  onGenerate?: () => void;
  generating?: boolean;
  /** True when a kit artifact exists (kit may still be null if it failed schema). */
  hasKit: boolean;
  print?: boolean;
}) {
  // No kit yet: a single quiet affordance under the kill-test (hidden in print).
  if (!kit) {
    if (print || hasKit) return null;
    return (
      <div className="no-print mt-3 flex items-center gap-3 rounded-xl border border-dashed border-accent2/40 bg-accent2/[0.03] px-4 py-3">
        <span className="text-sm text-muted">
          Ready to talk to buyers? This writes the interview script, signals to tally, and outreach copy — all tied to
          the pass/kill bars above.
        </span>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="ml-auto shrink-0 rounded-lg border border-accent2/40 px-3 py-1.5 text-sm font-medium text-accent2 transition hover:bg-accent2/10 disabled:opacity-50"
        >
          {generating ? "Writing kit…" : "🧰 Prep this week's interviews"}
        </button>
      </div>
    );
  }

  return (
    <details
      className="group mt-3 rounded-xl border border-accent2/30 bg-accent2/[0.03]"
      open={print || undefined}
    >
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 font-mono text-[12px] uppercase tracking-[0.14em] text-accent2">
        <span className="transition group-open:rotate-90">▸</span>
        🧰 The run kit — script, signals & outreach for this test
      </summary>
      <div className="space-y-5 border-t border-border/60 p-5">
        {/* who + where */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Talk to</div>
            <p className="mt-1 text-sm leading-relaxed text-fg/90">{kit.who}</p>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Where (channels we found real evidence in)
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {kit.where.map((w, i) => (
                <span key={i} className="rounded-full border border-border bg-panel2 px-2.5 py-0.5 text-xs text-fg/80">
                  {w}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* the script */}
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Ask these — past behavior only, never pitch
          </div>
          <ol className="mt-2 space-y-1.5">
            {kit.questions.map((q, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-fg/90">
                <span className="shrink-0 font-mono text-xs text-accent2">{i + 1}.</span>
                {q}
              </li>
            ))}
          </ol>
        </div>

        {/* tally signals — the units of the pre-registered thresholds */}
        <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          <div className="bg-panel px-3.5 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-good">
              Green — counts toward PASS
            </div>
            <ul className="mt-1.5 space-y-1">
              {kit.green_signals.map((s, i) => (
                <li key={i} className="text-sm leading-snug text-fg/90">• {s}</li>
              ))}
            </ul>
          </div>
          <div className="bg-panel px-3.5 py-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-bad">
              Red — counts toward KILL
            </div>
            <ul className="mt-1.5 space-y-1">
              {kit.red_signals.map((s, i) => (
                <li key={i} className="text-sm leading-snug text-fg/90">• {s}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* anti-bias checklist */}
        <div className="rounded-r-lg border-l-2 border-warn/50 bg-warn/5 px-3.5 py-2.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-warn">Keep the data honest</div>
          <ul className="mt-1.5 space-y-1">
            {kit.anti_bias.map((r, i) => (
              <li key={i} className="text-sm leading-snug text-fg/85">⚠ {r}</li>
            ))}
          </ul>
        </div>

        {/* outreach copy */}
        <div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Outreach — asks about the problem, never pitches
          </div>
          <div className="space-y-2">
            <CopyBlock label="DM / comment" text={kit.outreach.dm} />
            <CopyBlock label="Cold email" text={kit.outreach.email} />
            <CopyBlock label="Forum post" text={kit.outreach.forum_post} />
          </div>
        </div>

        {/* the tally — pre-registered thresholds restated */}
        <div className="rounded-lg border border-accent2/30 bg-accent2/[0.05] px-3.5 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-accent2">How to score the run</div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-fg/90">{kit.tally}</p>
        </div>
      </div>
    </details>
  );
}
