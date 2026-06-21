import React from "react";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-panel p-5 ${className}`}
    >
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
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 text-sm leading-relaxed">{value}</div>
    </div>
  );
}

export function Prose({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-fg/90">{children}</p>;
}
