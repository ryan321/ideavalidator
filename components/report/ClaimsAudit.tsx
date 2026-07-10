"use client";

import type { Validation } from "@/lib/generators/validation";
import { useT } from "../LocaleProvider";
import { TierChip, TierLegend } from "./chips";

// The claims ledger from the sycophancy-firewall pre-pass, rendered inside the
// "What we scored" disclosure: the founder's claims split into self-facts (authoritative
// about their own skills/network/capital) vs market-assumptions (about customers/
// competitors — must be corroborated), each carrying its Mom-Test evidence tier. T4
// (compliments/hypotheticals) is visually deprecated but still readable — it weighs
// ≈ zero, and seeing that is the point.

type Claim = NonNullable<Validation["claims_audit"]>["claims"][number];

function ClaimRow({ c }: { c: Claim }) {
  const deprecated = (c.tier ?? 3) === 4;
  return (
    <li className={`flex items-start gap-2 leading-snug ${deprecated ? "opacity-60" : ""}`}>
      <TierChip tier={c.tier} compact />
      <span
        className={`text-sm ${deprecated ? "text-muted line-through decoration-muted/40" : "text-fg/90"}`}
      >
        {c.text}
      </span>
    </li>
  );
}

function ClaimGroup({
  title,
  hint,
  claims,
}: {
  title: string;
  hint: string;
  claims: Claim[];
}) {
  if (!claims.length) return null;
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{title}</div>
      <p className="mb-2 mt-0.5 text-[11px] text-muted/80">{hint}</p>
      <ul className="space-y-1.5">
        {claims.map((c, i) => (
          <ClaimRow key={i} c={c} />
        ))}
      </ul>
    </div>
  );
}

export function ClaimsLedger({ claims }: { claims: Claim[] }) {
  const t = useT();
  if (!claims?.length) return null;
  const selfFacts = claims.filter((c) => c.kind === "self_fact");
  const assumptions = claims.filter((c) => c.kind === "market_assumption");
  return (
    <div className="mt-4">
      <TierLegend className="mb-3" />
      <div className="grid gap-5 sm:grid-cols-2 sm:divide-x sm:divide-border">
        <div className="sm:pr-5">
          <ClaimGroup
            title={t("report.selfFacts")}
            hint={t("report.selfFactsHint")}
            claims={selfFacts}
          />
        </div>
        <div className="sm:pl-5">
          <ClaimGroup
            title={t("report.marketAssumptions")}
            hint={t("report.marketAssumptionsHint")}
            claims={assumptions}
          />
        </div>
      </div>
    </div>
  );
}
