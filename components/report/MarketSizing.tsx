import { Card, Section, Badge } from "@/components/ui";

type Tier = { value: string; note: string };

// Parse a market figure like "$4.2B", "850M", "$40,000K" into a number so the
// bars reflect the REAL proportions instead of decorative fixed widths.
function parseMagnitude(s: string): number {
  if (!s) return 0;
  const m = s.replace(/,/g, "").match(/([\d.]+)\s*(b|m|k|bn|tn|t)?/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return 0;
  const u = (m[2] || "").toLowerCase();
  const mult = u.startsWith("t") ? 1e12 : u === "b" || u === "bn" ? 1e9 : u === "m" ? 1e6 : u === "k" ? 1e3 : 1;
  return n * mult;
}

// "0.9%" / "21%" / "<0.1%" — the honest share of the headline TAM.
function shareLabel(part: number, whole: number): string | null {
  if (!whole || !part) return null;
  const pct = (part / whole) * 100;
  if (pct >= 100) return "100%";
  if (pct < 0.1) return "<0.1%";
  return `${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`;
}

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

  const tamN = parseMagnitude(tam.value);
  const samN = parseMagnitude(sam.value);
  const somN = parseMagnitude(som.value);
  const proportional = tamN > 0 && samN > 0 && somN > 0;

  // Bar widths are the true fraction of TAM (floored so the slimmest slice stays
  // visible); when a value can't be parsed, fall back to nominal descending widths.
  const widthOf = (n: number, fallback: number) =>
    proportional ? Math.max(3, Math.min(100, (n / tamN) * 100)) : fallback;

  const rows = [
    { key: "TAM", label: "Total market", tier: tam, raw: tamN, width: widthOf(tamN, 100), opacity: 0.4 },
    { key: "SAM", label: "You could serve", tier: sam, raw: samN, width: widthOf(samN, 52), opacity: 0.7 },
    { key: "SOM", label: "You could win", tier: som, raw: somN, width: widthOf(somN, 16), opacity: 1 },
  ];

  return (
    <Section title="Market sizing">
      <Card>
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted">
            How much of the headline market you can realistically reach — TAM is the ceiling, SOM is the
            slice you&apos;d actually win.
          </p>
          <Badge tone="accent">
            <span className="font-mono">CAGR {cagr}%</span>
          </Badge>
        </div>
        <p
          className="-mt-3 mb-4 font-mono text-[10px] uppercase tracking-wide text-muted/70"
          title="These figures are the model's synthesis of its web-search results — check the cited sources before relying on them."
        >
          model estimate — see sources
        </p>

        <div className="flex flex-col gap-4">
          {rows.map((r) => {
            const share = r.key === "TAM" ? "100%" : shareLabel(r.raw, tamN);
            return (
              <div key={r.key}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="flex items-baseline gap-2">
                    <span className="font-mono text-xs font-semibold tracking-wide text-fg">{r.key}</span>
                    <span className="text-[11px] text-muted">{r.label}</span>
                  </span>
                  <span className="flex items-baseline gap-2">
                    {share && r.key !== "TAM" && (
                      <span className="font-mono text-[11px] text-muted">{share} of TAM</span>
                    )}
                    <span className="font-mono text-sm font-bold text-fg">{r.tier.value}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-panel2">
                  <div
                    className="keep-color h-full rounded-full"
                    style={{ width: `${r.width}%`, backgroundColor: "var(--color-accent)", opacity: r.opacity }}
                  />
                </div>
                {r.tier.note ? <p className="mt-1 text-[11px] leading-tight text-muted">{r.tier.note}</p> : null}
              </div>
            );
          })}
        </div>

        {methodology ? (
          <div className="mt-5 rounded-lg border border-border bg-panel2 px-3 py-2">
            <p className="text-xs text-muted">
              <span className="font-medium text-fg">Methodology:</span> {methodology}
            </p>
          </div>
        ) : null}
        {!proportional && (
          <p className="mt-2 text-[11px] text-muted/70">Bars are indicative — exact figures couldn&apos;t be parsed for scale.</p>
        )}
      </Card>
    </Section>
  );
}
