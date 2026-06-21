import { Card } from "@/components/ui";

const cap = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1) : "—";

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="font-mono text-2xl font-bold leading-tight text-accent2 sm:text-3xl">
        {value}
      </div>
    </Card>
  );
}

export function MarketHeader({
  cagrLabel,
  maturity,
  competitorCount,
}: {
  cagrLabel: string;
  maturity: string;
  competitorCount: number;
}) {
  const count = Number.isFinite(competitorCount) ? competitorCount : 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Stat label="CAGR" value={cagrLabel?.trim() ? cagrLabel : "—"} />
      <Stat label="Maturity" value={cap(maturity?.trim() ? maturity : "")} />
      <Stat label="Competitors" value={count} />
    </div>
  );
}
