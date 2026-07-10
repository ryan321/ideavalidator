"use client";

import React from "react";
import { useT } from "../LocaleProvider";

/**
 * Zone C chapter — collapsible evidence section. Must read as a button when closed:
 * left chevron, hover/active chrome, explicit Expand/Collapse label.
 * Print mode always expands (PDF needs the full body).
 */
export function ReportChapter({
  id,
  n,
  title,
  hint,
  preview,
  print = false,
  defaultOpen = false,
  children,
}: {
  id: string;
  n?: string;
  title: string;
  hint?: string;
  /** One-line teaser when collapsed — secondary to the control chrome. */
  preview?: string | null;
  print?: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const t = useT();
  if (print) {
    return (
      <section id={id} className="scroll-mt-20">
        <div className="mb-5 flex scroll-mt-20 items-center gap-3">
          {n && <span className="font-mono text-xs font-semibold tabular-nums text-accent2">{n}</span>}
          <h2 className="font-display text-xl font-bold tracking-tight text-fg sm:text-2xl">{title}</h2>
          <div className="rule-brass hidden flex-1 sm:block" />
          {hint && (
            <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-muted sm:block">
              {hint}
            </span>
          )}
        </div>
        {children}
      </section>
    );
  }

  return (
    <section
      id={id}
      className="folio scroll-mt-20 overflow-hidden transition hover:border-accent/40"
    >
      <details className="group" open={defaultOpen}>
        <summary
          className="flex cursor-pointer list-none items-start gap-3 px-3.5 py-3.5 transition select-none group-open:bg-panel2/30 hover:bg-panel2/55 sm:items-center sm:px-4"
          title={hint ? `${title} — ${hint}. Click to expand or collapse.` : `Click to expand or collapse ${title}`}
        >
          {/* chevron — primary affordance */}
          <span
            className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border bg-panel2 font-mono text-sm text-accent2 transition group-open:border-accent/40 group-open:bg-accent/10 group-open:text-accent sm:mt-0"
            aria-hidden
          >
            <span className="inline-block transition-transform duration-150 group-open:rotate-90">▸</span>
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              {n && (
                <span className="font-mono text-xs font-semibold tabular-nums text-accent2">{n}</span>
              )}
              <span className="font-display text-sm font-semibold uppercase tracking-[0.06em] text-fg">
                {title}
              </span>
            </div>
            {preview && (
              <p className="mt-0.5 line-clamp-1 text-xs leading-snug text-muted">{preview}</p>
            )}
            {hint && !preview && (
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted/70">
                {hint}
              </p>
            )}
          </div>

          <span className="mt-1 shrink-0 rounded-md border border-border/80 bg-panel2/80 px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wide text-muted transition group-open:border-accent/30 group-open:text-accent2 sm:mt-0">
            <span className="group-open:hidden">{t("common.expand")}</span>
            <span className="hidden group-open:inline">{t("common.collapse")}</span>
          </span>
        </summary>
        <div className="border-t border-border/70 px-4 py-5 sm:px-5">{children}</div>
      </details>
    </section>
  );
}
