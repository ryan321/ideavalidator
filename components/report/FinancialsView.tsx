import { Card, Section, Badge, Field, Prose } from "@/components/ui";

type StreamType = "Subscription" | "Services" | "Usage" | "One-time";

type Stream = {
  name: string;
  type: StreamType;
  segment: string;
  price: string;
  revenue_share: number;
  why: string;
  first_step: string;
};

type Projection = {
  year: string;
  revenue: string;
  customers: string;
  note: string;
};

type Financials = {
  summary: string;
  startup_cost: string;
  break_even: string;
  unit_economics: {
    cac: string;
    ltv: string;
    ltv_cac_ratio: string;
    payback_period: string;
  };
  revenue_model: {
    type: string;
    description: string;
    streams: Stream[];
  };
  projections: Projection[];
};

const STREAM_TONE: Record<StreamType, { cls: string; label: string }> = {
  Subscription: {
    cls: "bg-accent/15 text-accent border-accent/30",
    label: "Subscription",
  },
  Services: {
    cls: "bg-panel2 text-muted border-border",
    label: "Services",
  },
  Usage: {
    cls: "bg-accent2/15 text-accent2 border-accent2/30",
    label: "Usage",
  },
  "One-time": {
    cls: "bg-warn/15 text-warn border-warn/30",
    label: "One-time",
  },
};

// Loosely parse "$360K", "1.2M", "3,000" → a number, so we can show the implied
// per-customer revenue (revenue ÷ customers) and make the projection math legible.
function parseLoose(s: string | undefined): number | null {
  if (!s) return null;
  const m = s.replace(/[,$\s]/g, "").match(/([0-9.]+)\s*([kKmMbB]?)/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  const u = m[2].toLowerCase();
  if (u === "k") n *= 1e3;
  else if (u === "m") n *= 1e6;
  else if (u === "b") n *= 1e9;
  return Number.isFinite(n) ? n : null;
}
function impliedArpu(revenue?: string, customers?: string): string | null {
  const r = parseLoose(revenue);
  const c = parseLoose(customers);
  if (!r || !c || c < 1) return null;
  const per = r / c;
  const fmt = per >= 1000 ? `$${(per / 1000).toFixed(1)}k` : `$${Math.round(per)}`;
  return `≈ ${fmt}/customer/yr`;
}

export function FinancialsView({ d }: { d: Financials }) {
  const ue = d?.unit_economics ?? {
    cac: "—",
    ltv: "—",
    ltv_cac_ratio: "—",
    payback_period: "—",
  };
  const revenueModel = d?.revenue_model ?? {
    type: "",
    description: "",
    streams: [],
  };
  const streams = Array.isArray(revenueModel.streams)
    ? revenueModel.streams
    : [];
  const projections = Array.isArray(d?.projections) ? d.projections : [];

  const clampShare = (n: number) =>
    Math.max(0, Math.min(100, Number.isFinite(n) ? n : 0));

  return (
    <div className="space-y-6">
      {/* Summary */}
      {d?.summary ? <Prose>{d.summary}</Prose> : null}

      {/* Top stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted">
            Startup
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-fg">
            {d?.startup_cost ?? "—"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted">
            Break-even
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-fg">
            {d?.break_even ?? "—"}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wide text-muted">
            LTV/CAC
          </div>
          <div className="mt-1 font-mono text-xl font-bold text-accent2">
            {ue.ltv_cac_ratio ?? "—"}
          </div>
        </Card>
      </div>

      {/* Unit Economics */}
      <Section title="Unit Economics">
        <Card>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="CAC" value={<span className="font-mono">{ue.cac ?? "—"}</span>} />
            <Field label="LTV" value={<span className="font-mono">{ue.ltv ?? "—"}</span>} />
            <Field
              label="LTV:CAC"
              value={
                <span className="font-mono text-accent2">
                  {ue.ltv_cac_ratio ?? "—"}
                </span>
              }
            />
            <Field
              label="Payback period"
              value={<span className="font-mono">{ue.payback_period ?? "—"}</span>}
            />
          </div>
        </Card>
      </Section>

      {/* Revenue Model */}
      <Section title="Revenue Model">
        <div className="space-y-4">
          {revenueModel.type || revenueModel.description ? (
            <div className="flex flex-wrap items-center gap-3">
              {revenueModel.type ? (
                <span className="inline-block rounded-full border border-accent/30 bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent">
                  {revenueModel.type}
                </span>
              ) : null}
              {revenueModel.description ? (
                <span className="text-sm text-muted">
                  {revenueModel.description}
                </span>
              ) : null}
            </div>
          ) : null}

          {streams.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {streams.map((s, i) => {
                const tone =
                  STREAM_TONE[s?.type as StreamType] ?? STREAM_TONE.Services;
                const share = clampShare(s?.revenue_share);
                return (
                  <Card key={i} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <span className="font-mono text-lg font-bold text-muted">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted">
                          {share}% OF REVENUE
                        </span>
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${tone.cls}`}
                        >
                          {tone.label}
                        </span>
                      </div>
                    </div>

                    <div className="mt-2 text-sm font-bold text-fg">
                      {s?.name ?? "—"}
                    </div>
                    {s?.segment ? (
                      <div className="mt-0.5 text-xs text-muted">
                        <span aria-hidden="true">👥</span> {s.segment}
                      </div>
                    ) : null}

                    <div className="mt-3 flex items-baseline justify-between gap-2">
                      <span className="font-mono text-sm font-bold text-fg">
                        {s?.price ?? "—"}
                      </span>
                    </div>
                    <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-panel2">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${share}%` }}
                      />
                    </div>

                    {s?.why ? (
                      <p className="mt-3 text-xs leading-relaxed text-muted">
                        <span className="font-medium text-fg">Why:</span> {s.why}
                      </p>
                    ) : null}
                    {s?.first_step ? (
                      <div className="mt-2 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-xs text-accent">
                        → First step: {s.first_step}
                      </div>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="p-4">
              <p className="text-sm text-muted">No revenue streams defined.</p>
            </Card>
          )}
        </div>
      </Section>

      {/* Projections */}
      <Section title="Projections">
        <Card className="p-0">
          {projections.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="min-w-[480px]">
                {/* Header */}
                <div className="grid grid-cols-[72px_1fr_1fr_1.5fr] gap-3 border-b border-border px-4 py-2.5">
                  <div className="text-xs uppercase tracking-wide text-muted">
                    Year
                  </div>
                  <div className="text-xs uppercase tracking-wide text-muted">
                    Revenue
                  </div>
                  <div className="text-xs uppercase tracking-wide text-muted">
                    Customers
                  </div>
                  <div className="text-xs uppercase tracking-wide text-muted">
                    Notes
                  </div>
                </div>
                {/* Rows */}
                {projections.map((p, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[72px_1fr_1fr_1.5fr] gap-3 border-b border-border px-4 py-3 last:border-b-0"
                  >
                    <div className="font-mono text-sm font-semibold text-accent2">
                      {p?.year ?? "—"}
                    </div>
                    <div className="font-mono text-sm font-bold text-fg">
                      {p?.revenue ?? "—"}
                    </div>
                    <div className="text-sm text-muted">
                      {p?.customers ?? "—"}
                      {impliedArpu(p?.revenue, p?.customers) && (
                        <span className="ml-1 font-mono text-[11px] text-accent2/80">
                          {impliedArpu(p?.revenue, p?.customers)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted">{p?.note ?? ""}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="px-4 py-6">
              <p className="text-sm text-muted">No projections available.</p>
            </div>
          )}
        </Card>
      </Section>
    </div>
  );
}
