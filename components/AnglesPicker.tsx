"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Version } from "@/lib/db";

/**
 * Compact history control — one chip that opens the angle list.
 * Replaces the full version tab bar that competed with the decision.
 */
export function AnglesPicker({
  versions,
  activeId,
  bestScore,
  scoreColor,
  busyIds,
  onSelect,
  onCompareVariants,
  comparingVariants,
  archivedCount,
  showArchived,
  onToggleArchived,
}: {
  versions: Version[];
  activeId: string;
  bestScore: number;
  scoreColor: (n: number) => string;
  busyIds: Set<string>;
  onSelect: (id: string) => void;
  /** Opens the unified axis + criterion compare panel. */
  onCompareVariants?: () => void;
  comparingVariants?: boolean;
  archivedCount?: number;
  showArchived?: boolean;
  onToggleArchived?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = versions.find((v) => v.id === activeId) ?? versions[0];

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!active) return null;

  return (
    <div ref={ref} className="relative flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-border bg-panel/60 px-2.5 py-1.5 text-sm transition hover:bg-panel2"
        title="Switch angle / version"
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          Angle
        </span>
        <span className="font-mono font-semibold">v{active.n}</span>
        {active.score != null && (
          <span className="font-mono font-bold tabular-nums" style={{ color: scoreColor(active.score) }}>
            {active.score}
          </span>
        )}
        {versions.length > 1 && (
          <span className="text-xs text-muted">· {versions.length}</span>
        )}
        <span className={`text-[10px] text-muted transition ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {versions.length > 1 && onCompareVariants && (
        <button
          type="button"
          onClick={onCompareVariants}
          className={`rounded-lg px-3.5 py-1.5 text-sm font-semibold transition ${
            comparingVariants
              ? "bg-accent2 text-bg hover:opacity-90"
              : "bg-accent text-white hover:opacity-90"
          }`}
          title="Score axis, statements, and per-criterion deltas across angles"
          aria-pressed={comparingVariants}
        >
          {comparingVariants ? "Hide comparison" : "Compare variants"}
        </button>
      )}
      {!!archivedCount && archivedCount > 0 && onToggleArchived && (
        <button
          type="button"
          onClick={onToggleArchived}
          className="rounded-md border border-border/50 px-2 py-1 text-[11px] text-muted hover:text-fg"
        >
          {showArchived ? "hide archived" : `archived (${archivedCount})`}
        </button>
      )}

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-72 w-80 overflow-auto rounded-lg border border-border bg-panel shadow-xl shadow-black/40">
          {versions.map((v) => {
            const isActive = v.id === activeId;
            const isBest = v.score != null && v.score === bestScore && versions.length > 1;
            const busy = [...busyIds].some((k) => k.startsWith(v.id + ":"));
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  onSelect(v.id);
                  setOpen(false);
                }}
                className={`flex w-full items-start gap-2 border-b border-border/50 px-3 py-2.5 text-left last:border-0 hover:bg-panel2 ${
                  isActive ? "bg-panel2/80" : ""
                }`}
              >
                <span className="font-mono text-sm font-semibold">v{v.n}</span>
                {v.score != null ? (
                  <span className="font-mono text-sm font-bold tabular-nums" style={{ color: scoreColor(v.score) }}>
                    {v.score}
                  </span>
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
                {isBest && <span className="text-xs">★</span>}
                {busy && <span className="mt-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-accent2" />}
                <span className="min-w-0 flex-1 truncate text-xs text-muted">
                  {v.label || v.statement}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
