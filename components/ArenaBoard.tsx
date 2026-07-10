"use client";

import type { Artifact, Version } from "@/lib/db";

// The Arena: every variant of the idea on ONE score axis, with the run-to-run noise
// band drawn as a first-class object — differences inside the band are coin flips,
// and the board says so visually instead of letting a +2 masquerade as progress.
// Persistent (derived from versions + stored artifacts), unlike the tournament panel,
// which lives only for the session that ran it.

type ArtifactsByVersion = Record<string, Partial<Record<string, Artifact>>>;

type Row = {
  v: Version;
  score: number | null;
  verdict: string;
  revenue: string;
  moat: string;
  wedge: string;
};

const ORIGIN_LABEL: Record<string, string> = {
  original: "original",
  manual: "manual edit",
  ai: "AI variant",
  context: "with founder context",
};

export function ArenaBoard({
  versions,
  artifacts,
  activeId,
  margin,
  scoreColor,
  onView,
  onArchive,
  onRestore,
}: {
  versions: Version[]; // visible + archived — the arena shows the whole field
  artifacts: ArtifactsByVersion;
  activeId: string;
  /** acceptanceMargin() — the ± band that separates signal from re-roll luck. */
  margin: number;
  scoreColor: (n: number) => string;
  onView: (id: string) => void;
  onArchive: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  const rows: Row[] = versions
    .map((v) => {
      const d = artifacts[v.id]?.validation?.data as
        | {
            score?: number;
            verdict?: string;
            demand?: { obtainable_revenue?: string };
            moat?: { today?: string };
          }
        | undefined;
      return {
        v,
        score: v.score ?? (typeof d?.score === "number" ? Math.round(d.score) : null),
        verdict: d?.verdict ?? "",
        revenue: d?.demand?.obtainable_revenue ?? "",
        moat: d?.moat?.today ?? "",
        wedge: v.label ?? ORIGIN_LABEL[v.origin] ?? v.origin,
      };
    })
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));

  const active = rows.find((r) => r.v.id === activeId);
  const ref = active?.score ?? null;
  const best = rows.find((r) => r.score != null)?.score ?? null;

  return (
    <div className="mb-4 rounded-xl border border-accent2/30 bg-panel/40 p-4">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-mono text-[12px] uppercase tracking-[0.14em] text-accent2">
          Score axis — every angle on one line
        </div>
        {ref != null && (
          <div className="text-[11px] text-muted">
            shaded band = ±{margin} scoring noise around the current version — scores inside it are
            coin flips, not progress
          </div>
        )}
      </div>
      <div className="mt-3 space-y-1.5">
        {rows.map((r) => {
          const isActive = r.v.id === activeId;
          const isBest = r.score != null && r.score === best;
          const clears = r.score != null && ref != null && !isActive && r.score >= ref + margin;
          const archived = !!r.v.archived;
          return (
            <div
              key={r.v.id}
              className={`rounded-lg border px-3.5 py-2.5 transition ${
                isActive
                  ? "border-accent/60 bg-panel2"
                  : archived
                    ? "border-border/40 bg-panel/30 opacity-55"
                    : "border-border/70 bg-panel/60"
              }`}
            >
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="w-8 shrink-0 font-mono text-sm font-bold">v{r.v.n}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg/90" title={r.v.statement}>
                  {r.wedge}
                </span>
                {isBest && <span className="shrink-0" title="best score">★</span>}
                {clears && (
                  <span className="shrink-0 rounded-full border border-good/40 bg-good/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-good">
                    clears the band
                  </span>
                )}
                {archived && <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted">archived</span>}
                {r.score != null ? (
                  <span className="shrink-0 font-mono text-sm font-bold tabular-nums" style={{ color: scoreColor(r.score) }}>
                    {r.score}
                    {ref != null && !isActive && (
                      <span className="ml-1 font-normal text-muted">
                        ({r.score - ref >= 0 ? "+" : ""}
                        {r.score - ref})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="shrink-0 font-mono text-xs text-muted">not scored</span>
                )}
                <span className="flex shrink-0 items-center gap-1.5">
                  {!isActive && (
                    <button
                      onClick={() => onView(r.v.id)}
                      className="rounded border border-border px-2 py-0.5 text-[11px] text-muted transition hover:bg-panel2 hover:text-fg"
                    >
                      view
                    </button>
                  )}
                  {!archived && !isActive && r.v.n !== 1 && (
                    <button
                      onClick={() => onArchive(r.v.id)}
                      className="rounded border border-border px-2 py-0.5 text-[11px] text-muted transition hover:bg-panel2 hover:text-fg"
                      title="Hide from the switcher (kept as research)"
                    >
                      archive
                    </button>
                  )}
                  {archived && (
                    <button
                      onClick={() => onRestore(r.v.id)}
                      className="rounded border border-border px-2 py-0.5 text-[11px] text-muted transition hover:bg-panel2 hover:text-fg"
                    >
                      restore
                    </button>
                  )}
                </span>
              </div>

              {/* the shared axis: score fill + the noise band around the current version */}
              {r.score != null && (
                <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-panel2">
                  {ref != null && (
                    <div
                      className="absolute inset-y-0 bg-fg/10"
                      style={{
                        left: `${Math.max(0, ref - margin)}%`,
                        width: `${Math.min(100, ref + margin) - Math.max(0, ref - margin)}%`,
                      }}
                      aria-hidden
                    />
                  )}
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ width: `${r.score}%`, background: scoreColor(r.score), opacity: archived ? 0.4 : 0.85 }}
                  />
                  {ref != null && (
                    <div className="absolute inset-y-0 w-px bg-fg/50" style={{ left: `${ref}%` }} aria-hidden />
                  )}
                </div>
              )}

              {(r.verdict || r.revenue || r.moat) && (
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
                  {r.verdict && <span>{r.verdict}</span>}
                  {r.revenue && <span className="text-accent2/90">{r.revenue}</span>}
                  {r.moat && <span className="min-w-0 flex-1 truncate" title={r.moat}>moat: {r.moat}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
