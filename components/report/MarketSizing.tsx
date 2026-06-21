import { Card, Section, Badge } from "@/components/ui";

type Tier = { value: string; note: string };

export function MarketSizing({
  sizing,
  cagrPct,
}: {
  sizing: {
    tam: Tier;
    sam: Tier;
    som: Tier;
    methodology: string;
  };
  cagrPct: number;
}) {
  const tam = sizing?.tam ?? { value: "—", note: "" };
  const sam = sizing?.sam ?? { value: "—", note: "" };
  const som = sizing?.som ?? { value: "—", note: "" };
  const methodology = sizing?.methodology ?? "";
  const cagr = Number.isFinite(cagrPct) ? cagrPct : 0;

  const rows: { key: string; tier: Tier; pct: number; fill: string }[] = [
    { key: "TAM", tier: tam, pct: 100, fill: "var(--color-accent)" },
    { key: "SAM", tier: sam, pct: 50, fill: "var(--color-accent)" },
    { key: "SOM", tier: som, pct: 12, fill: "var(--color-accent)" },
  ];

  // Opacity ramp: TAM lightest -> SOM darkest (strongest).
  const opacity: Record<string, number> = { TAM: 0.35, SAM: 0.65, SOM: 1 };

  return (
    <Section title="Market Sizing & Stage">
      <Card>
        <div className="relative grid items-center gap-6 sm:grid-cols-[200px_1fr]">
          <Badge tone="accent">
            <span className="font-mono">CAGR {cagr}%</span>
          </Badge>

          {/* LEFT: concentric circles */}
          <div className="flex justify-center">
            <div className="relative aspect-square w-[180px]">
              {/* TAM outer */}
              <div className="absolute inset-0 flex items-start justify-center rounded-full border border-accent/30 bg-accent/10">
                <span className="mt-2 text-[10px] font-medium tracking-wide text-muted">
                  TAM
                </span>
              </div>
              {/* SAM middle */}
              <div className="absolute inset-[26%_18%_auto_18%] top-[20%] flex h-[60%] items-start justify-center rounded-full border border-accent/40 bg-accent/25">
                <span className="mt-2 text-[10px] font-medium tracking-wide text-fg">
                  SAM
                </span>
              </div>
              {/* SOM inner */}
              <div className="absolute inset-[42%] flex items-center justify-center rounded-full bg-accent">
                <span className="text-[10px] font-semibold tracking-wide text-bg">
                  SOM
                </span>
              </div>
            </div>
          </div>

          {/* RIGHT: stacked horizontal bars */}
          <div className="flex flex-col gap-4">
            {rows.map((r) => (
              <div key={r.key}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium tracking-wide text-muted">
                    {r.key}
                  </span>
                  <span className="font-mono text-sm font-bold text-fg">
                    {r.tier.value}
                  </span>
                </div>
                <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-panel2">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(0, Math.min(100, r.pct))}%`,
                      backgroundColor: r.fill,
                      opacity: opacity[r.key],
                    }}
                  />
                </div>
                {r.tier.note ? (
                  <p className="mt-1 text-[10px] leading-tight text-muted">
                    {r.tier.note}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        {/* Methodology */}
        {methodology ? (
          <div className="mt-5 rounded-lg border border-border bg-panel2 px-3 py-2">
            <p className="text-xs text-muted">
              <span className="font-medium text-fg">Methodology:</span>{" "}
              {methodology}
            </p>
          </div>
        ) : null}
      </Card>
    </Section>
  );
}
