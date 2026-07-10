import React from "react";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`folio p-5 ${className}`}>
      {children}
    </div>
  );
}

export function Section({
  title,
  children,
  right,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {title}
        </h3>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((t, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

const SEVERITY: Record<string, string> = {
  high: "bg-bad/15 text-bad border-bad/30",
  medium: "bg-warn/15 text-warn border-warn/30",
  low: "bg-good/15 text-good border-good/30",
};

export function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone?: "high" | "medium" | "low" | "accent";
}) {
  const cls =
    tone && tone !== "accent"
      ? SEVERITY[tone]
      : "bg-accent/15 text-accent border-accent/30";
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">{label}</div>
      <div className="mt-1 text-sm leading-relaxed">{value}</div>
    </div>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-fg/90">{children}</p>;
}

// ---- Shared report vocabulary -------------------------------------------------
// One set of primitives so every report surface (verdict, market, money, evidence)
// reads like the same product: an editorial section spine, mono eyebrows, light panels.

// Top-level section header: optional index, a 20px display title, a hairline rule.
// This is THE heading used across every report surface.
export function SectionHead({
  n,
  title,
  id,
  hint,
  right,
}: {
  n?: string;
  title: string;
  id?: string;
  hint?: string;
  right?: React.ReactNode;
}) {
  return (
    <div id={id} className="mb-5 flex scroll-mt-20 items-center gap-3">
      {n && (
        <span className="font-mono text-xs font-semibold tabular-nums text-accent2">
          {n}
        </span>
      )}
      <h2 className="font-display text-xl font-bold tracking-tight text-fg sm:text-2xl">{title}</h2>
      <div className="rule-brass hidden flex-1 sm:block" />
      {hint && (
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-muted sm:block">
          {hint}
        </span>
      )}
      {right}
    </div>
  );
}

// Small mono label — the consistent sub-head / eyebrow inside a section.
const EYEBROW_TONE: Record<string, string> = {
  muted: "text-muted",
  accent: "text-accent",
  accent2: "text-accent2",
  good: "text-good",
  warn: "text-warn",
};
export function Eyebrow({
  children,
  tone = "muted",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "muted" | "accent" | "accent2" | "good" | "warn";
  className?: string;
}) {
  return (
    <div className={`font-mono text-[13px] uppercase tracking-[0.12em] ${EYEBROW_TONE[tone]} ${className}`}>{children}</div>
  );
}

// A light item surface — the consistent "card" across reports (subtle, not heavy).
// Use this for list items / sub-blocks; reserve Card for emphasis callouts.
export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`folio-inset p-4 ${className}`}>{children}</div>
  );
}

// A borderless metric cell for hairline (gap-px) grids — the instrument-panel look.
export function Metric({
  label,
  value,
  color,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
  hint?: string;
}) {
  return (
    <div className="bg-panel px-3.5 py-3" title={hint}>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{label}</div>
      <div
        className="mt-1 text-sm font-semibold leading-snug [overflow-wrap:anywhere]"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

// A small pill/tag — one consistent chip instead of ad-hoc accent spans.
export function Tag({
  children,
  tone = "accent",
}: {
  children: React.ReactNode;
  tone?: "accent" | "accent2" | "muted";
}) {
  const cls =
    tone === "accent2"
      ? "border-accent2/30 bg-accent2/10 text-accent2"
      : tone === "muted"
        ? "border-border bg-panel2 text-muted"
        : "border-accent/30 bg-accent/10 text-accent";
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {children}
    </span>
  );
}
