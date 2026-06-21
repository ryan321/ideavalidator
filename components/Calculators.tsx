"use client";

import { useState } from "react";

type Input = {
  key: string;
  label: string;
  default: number;
  prefix?: string;
  suffix?: string;
};

type Output = { label: string; value: string; highlight?: boolean };

type CalcDef = {
  title: string;
  desc: string;
  inputs: Input[];
  compute: (v: Record<string, number>) => Output[];
};

const money = (n: number) =>
  isFinite(n)
    ? n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "—";
const num = (n: number, d = 1) => (isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: d }) : "—");
const pct = (n: number) => (isFinite(n) ? `${num(n, 1)}%` : "—");
const safe = (n: number) => (isFinite(n) ? n : NaN);

const CALCULATORS: CalcDef[] = [
  {
    title: "ROI",
    desc: "Return on investment.",
    inputs: [
      { key: "gain", label: "Return / gain", default: 50000, prefix: "$" },
      { key: "cost", label: "Investment", default: 20000, prefix: "$" },
    ],
    compute: (v) => [
      { label: "Net profit", value: money(v.gain - v.cost) },
      { label: "ROI", value: pct(safe(((v.gain - v.cost) / v.cost) * 100)), highlight: true },
    ],
  },
  {
    title: "CAC",
    desc: "Customer acquisition cost.",
    inputs: [
      { key: "spend", label: "Sales + marketing spend", default: 10000, prefix: "$" },
      { key: "customers", label: "New customers", default: 50 },
    ],
    compute: (v) => [
      { label: "CAC", value: money(safe(v.spend / v.customers)), highlight: true },
    ],
  },
  {
    title: "LTV",
    desc: "Customer lifetime value.",
    inputs: [
      { key: "arpa", label: "Avg revenue / customer / mo", default: 50, prefix: "$" },
      { key: "margin", label: "Gross margin", default: 80, suffix: "%" },
      { key: "churn", label: "Monthly churn", default: 5, suffix: "%" },
    ],
    compute: (v) => {
      const ltv = (v.arpa * (v.margin / 100)) / (v.churn / 100);
      return [
        { label: "Avg lifetime", value: `${num(100 / v.churn, 1)} mo` },
        { label: "LTV", value: money(safe(ltv)), highlight: true },
      ];
    },
  },
  {
    title: "LTV : CAC",
    desc: "Unit-economics ratio (aim ≥ 3).",
    inputs: [
      { key: "ltv", label: "LTV", default: 800, prefix: "$" },
      { key: "cac", label: "CAC", default: 200, prefix: "$" },
    ],
    compute: (v) => {
      const r = v.ltv / v.cac;
      return [
        { label: "Ratio", value: `${num(safe(r), 2)} : 1`, highlight: true },
        { label: "Verdict", value: r >= 3 ? "Healthy" : r >= 1 ? "Thin" : "Unsustainable" },
      ];
    },
  },
  {
    title: "Runway",
    desc: "Months of cash left.",
    inputs: [
      { key: "cash", label: "Cash in bank", default: 250000, prefix: "$" },
      { key: "burn", label: "Monthly net burn", default: 25000, prefix: "$" },
    ],
    compute: (v) => [
      { label: "Runway", value: `${num(safe(v.cash / v.burn), 1)} months`, highlight: true },
    ],
  },
  {
    title: "Break-even",
    desc: "Units to cover fixed costs.",
    inputs: [
      { key: "fixed", label: "Fixed costs / mo", default: 10000, prefix: "$" },
      { key: "price", label: "Price / unit", default: 50, prefix: "$" },
      { key: "varcost", label: "Variable cost / unit", default: 20, prefix: "$" },
    ],
    compute: (v) => {
      const units = v.fixed / (v.price - v.varcost);
      return [
        { label: "Contribution / unit", value: money(v.price - v.varcost) },
        { label: "Break-even units / mo", value: num(safe(units), 0), highlight: true },
        { label: "Break-even revenue / mo", value: money(safe(units * v.price)) },
      ];
    },
  },
  {
    title: "Market size",
    desc: "Top-down TAM / SOM.",
    inputs: [
      { key: "customers", label: "Potential customers", default: 1000000 },
      { key: "acv", label: "Annual value / customer", default: 600, prefix: "$" },
      { key: "share", label: "Realistic share", default: 2, suffix: "%" },
    ],
    compute: (v) => [
      { label: "TAM", value: money(v.customers * v.acv) },
      { label: "SOM (your share)", value: money(v.customers * v.acv * (v.share / 100)), highlight: true },
    ],
  },
  {
    title: "Funding need",
    desc: "Raise to reach a runway target.",
    inputs: [
      { key: "burn", label: "Monthly net burn", default: 25000, prefix: "$" },
      { key: "months", label: "Runway target", default: 18, suffix: "mo" },
      { key: "buffer", label: "Safety buffer", default: 20, suffix: "%" },
    ],
    compute: (v) => {
      const base = v.burn * v.months;
      return [
        { label: "Base need", value: money(base) },
        { label: "With buffer", value: money(base * (1 + v.buffer / 100)), highlight: true },
      ];
    },
  },
  {
    title: "Equity / dilution",
    desc: "Round dilution & post-money.",
    inputs: [
      { key: "pre", label: "Pre-money valuation", default: 4000000, prefix: "$" },
      { key: "raise", label: "Amount raising", default: 1000000, prefix: "$" },
      { key: "pool", label: "New option pool", default: 10, suffix: "%" },
    ],
    compute: (v) => {
      const post = v.pre + v.raise;
      const investor = (v.raise / post) * 100;
      return [
        { label: "Post-money", value: money(post) },
        { label: "Investor stake", value: pct(safe(investor)), highlight: true },
        { label: "Founder dilution", value: pct(safe(investor + v.pool)) },
      ];
    },
  },
];

function CalcCard({ def }: { def: CalcDef }) {
  const [values, setValues] = useState<Record<string, number>>(
    () => Object.fromEntries(def.inputs.map((i) => [i.key, i.default]))
  );
  const outputs = def.compute(values);
  return (
    <div className="rounded-xl border border-border bg-panel p-5">
      <div className="font-semibold">{def.title}</div>
      <div className="mb-3 text-xs text-muted">{def.desc}</div>
      <div className="space-y-2">
        {def.inputs.map((inp) => (
          <label key={inp.key} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted">{inp.label}</span>
            <span className="flex items-center gap-1">
              {inp.prefix && <span className="text-muted">{inp.prefix}</span>}
              <input
                type="number"
                value={Number.isNaN(values[inp.key]) ? "" : values[inp.key]}
                onChange={(e) =>
                  setValues((v) => ({ ...v, [inp.key]: parseFloat(e.target.value) }))
                }
                className="w-28 rounded-md border border-border bg-panel2 px-2 py-1 text-right font-mono outline-none focus:border-accent"
              />
              {inp.suffix && <span className="text-muted">{inp.suffix}</span>}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-4 space-y-1.5 border-t border-border pt-3">
        {outputs.map((o, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="text-muted">{o.label}</span>
            <span
              className={`font-mono ${o.highlight ? "text-base font-bold text-accent2" : ""}`}
            >
              {o.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Calculators() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CALCULATORS.map((def) => (
        <CalcCard key={def.title} def={def} />
      ))}
    </div>
  );
}
