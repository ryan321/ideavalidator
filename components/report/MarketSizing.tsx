"use client";

import { Card, Section, Badge } from "@/components/ui";
import { useT } from "../LocaleProvider";

type Tier = { value: string; note: string };

// Parse a market figure like "$4.2B", "850M", "$40,000K" into a number so the
// circles reflect the REAL proportions instead of decorative fixed sizes.
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

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

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
  const t = useT();
  const tam = sizing?.tam ?? { value: "—", note: "" };
  const sam = sizing?.sam ?? { value: "—", note: "" };
  const som = sizing?.som ?? { value: "—", note: "" };
  const methodology = sizing?.methodology ?? "";
  const cagr = Number.isFinite(cagrPct) ? cagrPct : 0;

  const tamN = parseMagnitude(tam.value);
  const samN = parseMagnitude(sam.value);
  const somN = parseMagnitude(som.value);
  const proportional = tamN > 0 && samN > 0 && somN > 0;

  // Concentric radii (viewBox 200). Areas span orders of magnitude ($Bs → $Ms), so
  // strict area-proportionality would make SOM vanish; use sqrt-of-share with floors
  // so a bigger real share reads as a bigger circle while all three stay legible and
  // properly nested. Non-parseable figures fall back to fixed aesthetic radii.
  // TRUE area-proportional radii: radius ∝ √(value / TAM), so circle AREA tracks the
  // dollar figure and the nesting is honest — a SAM that's 14% of TAM reads as a clearly
  // smaller ring, a SOM that's 0.3% reads as a small dot (which is the real story). Only a
  // small floor keeps the slimmest slice visible, and a min-gap keeps them cleanly nested.
  const rTam = 94;
  const frac = (n: number) => (tamN > 0 ? Math.sqrt(Math.max(0, n) / tamN) : 0);
  let rSam = proportional ? Math.max(28, rTam * frac(samN)) : 60;
  let rSom = proportional ? Math.max(11, rTam * frac(somN)) : 30;
  rSam = Math.min(rSam, rTam - 6);
  rSom = clamp(rSom, 8, rSam - 10);

  // Value labels sit in each ring's top band; the SOM dot is often too small to hold its
  // own label, so it drops just below the dot when tiny.
  const yTam = 100 - rTam + 15;
  const ySam = Math.min(100 - rSam + 14, 100 - rSom - 16);
  const somInside = rSom >= 22;
  const ySom = somInside ? 100 : 100 + rSom + 14;

  const legend = [
    { key: "TAM", label: t("report.totalMarket"), tier: tam, raw: tamN, fill: "var(--color-accent)", opacity: 0.9, share: "100%" },
    { key: "SAM", label: t("report.youCouldServe"), tier: sam, raw: samN, fill: "var(--color-accent)", opacity: 0.55, share: shareLabel(samN, tamN) },
    { key: "SOM", label: t("report.youCouldWin"), tier: som, raw: somN, fill: "var(--color-accent)", opacity: 1, share: shareLabel(somN, tamN) },
  ];

  return (
    <Section title={t("report.marketSizing")}>
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

        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-7">
          {/* Concentric circles — TAM (outer) ⊃ SAM ⊃ SOM (the slice you'd win). */}
          <svg
            viewBox="0 0 200 200"
            className="keep-color w-40 shrink-0 sm:w-44"
            role="img"
            aria-label={`Market sizing: TAM ${tam.value}, SAM ${sam.value}, SOM ${som.value}`}
          >
            <circle cx="100" cy="100" r={rTam} fill="var(--color-accent)" opacity={0.16} stroke="var(--color-accent)" strokeOpacity={0.35} strokeWidth={1} />
            <circle cx="100" cy="100" r={rSam} fill="var(--color-accent)" opacity={0.32} stroke="var(--color-accent)" strokeOpacity={0.55} strokeWidth={1} />
            <circle cx="100" cy="100" r={rSom} fill="var(--color-accent)" opacity={0.95} />
            {/* TAM + SAM values in their ring's top band */}
            <text x="100" y={yTam} textAnchor="middle" className="fill-fg font-mono" style={{ fontSize: 13, fontWeight: 700 }}>{tam.value}</text>
            <text x="100" y={yTam + 11} textAnchor="middle" className="fill-muted font-mono" style={{ fontSize: 8, letterSpacing: 1 }}>TAM</text>
            <text x="100" y={ySam} textAnchor="middle" className="fill-fg font-mono" style={{ fontSize: 12, fontWeight: 700 }}>{sam.value}</text>
            <text x="100" y={ySam + 10} textAnchor="middle" className="fill-muted font-mono" style={{ fontSize: 8, letterSpacing: 1 }}>SAM</text>
            {/* SOM: label sits inside the dot when it's big enough, else just below it */}
            <text x="100" y={ySom} textAnchor="middle" className="font-mono" style={{ fontSize: 12, fontWeight: 700, fill: somInside ? "white" : "var(--color-fg)" }}>{som.value}</text>
            <text x="100" y={ySom + (somInside ? 10 : 9)} textAnchor="middle" className="font-mono" style={{ fontSize: 8, letterSpacing: 1, fill: somInside ? "white" : "var(--color-muted)", fillOpacity: somInside ? 0.85 : 1 }}>SOM</text>
          </svg>

          {/* Legend — the numbers and the honest share of TAM, colour-keyed to the rings. */}
          <div className="flex w-full flex-col gap-3">
            {legend.map((r) => (
              <div key={r.key} className="flex gap-2.5">
                <span
                  className="keep-color mt-1 h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: r.fill, opacity: r.opacity }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="flex items-baseline gap-2">
                      <span className="font-mono text-xs font-semibold tracking-wide text-fg">{r.key}</span>
                      <span className="text-[11px] text-muted">{r.label}</span>
                    </span>
                    <span className="flex items-baseline gap-2">
                      {r.share && r.key !== "TAM" && (
                        <span className="font-mono text-[11px] text-muted">{r.share} of TAM</span>
                      )}
                      <span className="font-mono text-sm font-bold text-fg">{r.tier.value}</span>
                    </span>
                  </div>
                  {r.tier.note ? <p className="mt-0.5 text-[11px] leading-tight text-muted">{r.tier.note}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {methodology ? (
          <div className="mt-5 rounded-lg border border-border bg-panel2 px-3 py-2">
            <p className="text-xs text-muted">
              <span className="font-medium text-fg">Methodology:</span> {methodology}
            </p>
          </div>
        ) : null}
        {!proportional && (
          <p className="mt-2 text-[11px] text-muted/70">Circles are indicative — exact figures couldn&apos;t be parsed for scale.</p>
        )}
      </Card>
    </Section>
  );
}
