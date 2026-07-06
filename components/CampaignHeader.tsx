"use client";

// The decision state, above everything: where this campaign stands and the ONE next
// move. The full report is the receipt below; this is the loop made visible —
// verdict → best angle → open question → test status → next move.

type NextMove = { label: string; onClick?: () => void; href?: string };

export function CampaignHeader({
  activeN,
  versionCount,
  bestN,
  bestScore,
  bestLabel,
  onViewBest,
  openQuestion,
  testStatus,
  nextMove,
}: {
  activeN: number;
  /** How many angles have been tried (visible versions). */
  versionCount: number;
  /** The best-scoring OTHER version, when one exists. */
  bestN?: number | null;
  bestScore?: number | null;
  bestLabel?: string | null;
  onViewBest?: () => void;
  /** The riskiest assumption / pivotal criterion — the campaign's open question. */
  openQuestion?: string | null;
  /** "not run" | "kit ready" | "PASS" | "KILL" | "INCONCLUSIVE" */
  testStatus: string;
  nextMove: NextMove;
}) {
  const statusColor =
    testStatus === "PASS" ? "var(--color-good)" : testStatus === "KILL" ? "var(--color-bad)" : testStatus === "INCONCLUSIVE" ? "var(--color-warn)" : "var(--color-muted)";
  const MoveTag = nextMove.href ? "a" : "button";

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-border bg-panel/60">
      <div className="grid divide-y divide-border lg:grid-cols-[auto_1fr_auto] lg:divide-x lg:divide-y-0">
        {/* the campaign — where you are; the score lives in the readout below, once */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">The campaign · v{activeN}</div>
            <div className="mt-0.5 text-sm font-medium text-fg/90">
              {versionCount} angle{versionCount === 1 ? "" : "s"} tried
            </div>
            {bestN != null && bestScore != null && (
              <button
                onClick={onViewBest}
                className="mt-1 flex items-center gap-1 text-[11px] text-muted transition hover:text-fg"
                title={bestLabel ?? undefined}
              >
                best: <b className="font-mono">v{bestN}</b> ({bestScore}) ★ →
              </button>
            )}
          </div>
        </div>

        {/* the open question + test status */}
        <div className="min-w-0 px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Open question</div>
          <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-fg/90">
            {openQuestion ?? "None recorded — re-run the analysis."}
          </p>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor }} />
            <span style={{ color: statusColor }}>kill-test · {testStatus}</span>
          </div>
        </div>

        {/* the one next move */}
        <div className="flex items-center px-4 py-3">
          <MoveTag
            {...(nextMove.href ? { href: nextMove.href } : { onClick: nextMove.onClick })}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition hover:opacity-90"
          >
            {nextMove.label} →
          </MoveTag>
        </div>
      </div>
    </div>
  );
}
