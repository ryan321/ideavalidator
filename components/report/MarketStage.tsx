import { Card, Badge } from "@/components/ui";

type Maturity = "Emerging" | "Growing" | "Mature" | "Declining";

type Seasonality = {
  level: "Low" | "Medium" | "High";
  peak_months: string[];
  note: string;
};

type Region = {
  name: string;
  tier: "primary" | "secondary";
  note: string;
};

const MATURITY_STEPS: Maturity[] = [
  "Emerging",
  "Growing",
  "Mature",
  "Declining",
];

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const SEASON_TONE: Record<Seasonality["level"], "low" | "medium" | "high"> = {
  Low: "low",
  Medium: "medium",
  High: "high",
};

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs font-semibold uppercase tracking-wide text-muted">
      {children}
    </div>
  );
}

export function MarketStage({
  maturity,
  maturityRationale,
  seasonality,
  regions,
}: {
  maturity: Maturity;
  maturityRationale: string;
  seasonality: Seasonality;
  regions: Region[];
}) {
  const activeIndex = Math.max(0, MATURITY_STEPS.indexOf(maturity));
  const peaks = new Set(
    (Array.isArray(seasonality?.peak_months) ? seasonality.peak_months : []).map(
      (m) => String(m).slice(0, 3).toLowerCase(),
    ),
  );
  const regionList = Array.isArray(regions) ? regions : [];
  const level = seasonality?.level ?? "Low";

  return (
    <Card>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-fg">Market Stage</h3>
          <p className="mt-0.5 text-xs text-muted">
            Lifecycle, timing &amp; geography
          </p>
        </div>
      </div>

      {/* 1) MARKET MATURITY */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <SubTitle>Market Maturity</SubTitle>
          <Badge tone="accent">{maturity.toUpperCase()}</Badge>
        </div>

        <div className="relative">
          {/* connecting line behind the dots */}
          <div className="absolute left-0 right-0 top-3 h-0.5 bg-border" />
          <div className="relative grid grid-cols-4 gap-1">
            {MATURITY_STEPS.map((step, i) => {
              const filled = i <= activeIndex;
              const isActive = i === activeIndex;
              return (
                <div
                  key={step}
                  className="flex flex-col items-center text-center"
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full ${
                      filled ? "bg-accent" : "bg-border"
                    }`}
                  >
                    {filled ? (
                      <svg
                        viewBox="0 0 12 12"
                        className="h-3 w-3 text-white"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path
                          d="M2.5 6.5 5 9l4.5-5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-panel" />
                    )}
                  </div>
                  <span
                    className={`mt-1.5 text-[11px] font-medium leading-tight sm:text-xs ${
                      isActive
                        ? "text-accent"
                        : filled
                        ? "text-fg"
                        : "text-muted"
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {maturityRationale ? (
          <div className="mt-4 rounded-lg border border-accent/20 bg-accent/10 p-3 text-sm leading-relaxed text-fg/90">
            {maturityRationale}
          </div>
        ) : null}
      </section>

      {/* 2) SEASONALITY */}
      <section className="mb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <SubTitle>Seasonality</SubTitle>
          <Badge tone={SEASON_TONE[level]}>{level}</Badge>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:flex-nowrap">
          {MONTHS.map((m, i) => {
            const hot = peaks.has(m.toLowerCase());
            return (
              <div
                key={`${m}-${i}`}
                title={m}
                className={`flex h-8 flex-1 min-w-[1.75rem] items-center justify-center rounded-md border font-mono text-[11px] ${
                  hot
                    ? "border-accent/30 bg-accent/15 text-accent"
                    : "border-border bg-panel2 text-muted"
                }`}
              >
                {m.charAt(0)}
              </div>
            );
          })}
        </div>

        {seasonality?.note ? (
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {seasonality.note}
          </p>
        ) : null}
      </section>

      {/* 3) TARGET REGIONS */}
      <section>
        <div className="mb-3">
          <SubTitle>Target Regions</SubTitle>
        </div>

        {regionList.length === 0 ? (
          <p className="text-sm text-muted">No regions specified.</p>
        ) : (
          <div className="space-y-2">
            {regionList.map((r, i) => {
              const primary = r.tier === "primary";
              return (
                <div
                  key={`${r.name}-${i}`}
                  className={`rounded-lg border-l-2 bg-panel2 py-2.5 pl-3 pr-3 ${
                    primary ? "border-accent" : "border-border"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-fg">
                      {r.name}
                    </span>
                    {primary ? (
                      <Badge tone="accent">PRIMARY</Badge>
                    ) : (
                      <span className="inline-block rounded-full border border-border bg-panel px-2 py-0.5 text-xs font-medium text-muted">
                        SECONDARY
                      </span>
                    )}
                  </div>
                  {r.note ? (
                    <p className="mt-1 text-xs leading-relaxed text-muted">
                      {r.note}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </Card>
  );
}
