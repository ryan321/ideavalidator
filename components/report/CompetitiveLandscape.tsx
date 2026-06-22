import React from "react";
import { Card, Section, Badge } from "@/components/ui";

type Competitor = {
  name: string;
  url: string;
  funding: string;
  strengths: string[];
  weaknesses: string[];
  customer_sentiment?: "Happy" | "Mixed" | "Frustrated";
  switching_costs?: "Low" | "Medium" | "High";
  opportunity: string;
};

// Frustrated customers = opportunity (green); happy = hard moat (red).
const sentimentTone = (s?: string) =>
  s === "Frustrated" ? "low" : s === "Happy" ? "high" : "medium";
// Low lock-in = easy to take share (green); high = captured (red).
const lockTone = (s?: string) => (s === "Low" ? "low" : s === "High" ? "high" : "medium");

function normalizeUrl(url: string): string {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function MiniBullets({ items, tone }: { items: string[]; tone: "good" | "bad" }) {
  if (!Array.isArray(items) || items.length === 0) {
    return <p className="text-xs text-muted">None listed</p>;
  }
  const dot = tone === "good" ? "bg-good" : "bg-bad";
  return (
    <ul className="space-y-1">
      {items.map((t, i) => (
        <li key={i} className="flex gap-1.5 text-sm leading-snug text-fg/90">
          <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${dot}`} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function CompetitiveLandscape({
  competitors,
}: {
  competitors: Competitor[];
}) {
  const list: Competitor[] = Array.isArray(competitors) ? competitors : [];

  return (
    <Section
      title="Competitive Landscape"
      right={<Badge tone="accent">{list.length} mapped</Badge>}
    >
      {list.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">No competitors mapped.</p>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((c, i) => {
            const href = normalizeUrl(c?.url ?? "");
            return (
              <Card key={i} className="flex flex-col gap-3">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold leading-tight text-fg">
                      {c?.name || "Unknown"}
                    </h4>
                    {c?.funding ? (
                      <Badge tone="accent">{c.funding}</Badge>
                    ) : null}
                  </div>
                  {href ? (
                    <a
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-accent2 hover:underline"
                    >
                      <span aria-hidden>🌐</span>
                      <span className="truncate">{c.url}</span>
                    </a>
                  ) : null}
                  {(c?.customer_sentiment || c?.switching_costs) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c?.customer_sentiment && (
                        <Badge tone={sentimentTone(c.customer_sentiment)}>
                          customers: {c.customer_sentiment.toLowerCase()}
                        </Badge>
                      )}
                      {c?.switching_costs && (
                        <Badge tone={lockTone(c.switching_costs)}>
                          lock-in: {c.switching_costs.toLowerCase()}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-border bg-panel2 p-2.5">
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-good">
                      Strengths
                    </div>
                    <MiniBullets items={c?.strengths ?? []} tone="good" />
                  </div>
                  <div className="rounded-lg border border-border bg-panel2 p-2.5">
                    <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-bad">
                      Weaknesses
                    </div>
                    <MiniBullets items={c?.weaknesses ?? []} tone="bad" />
                  </div>
                </div>

                {c?.opportunity ? (
                  <div className="mt-auto rounded-lg border border-accent/30 bg-accent/15 p-2.5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-accent">
                      Your opportunity
                    </div>
                    <p className="mt-1 text-sm leading-snug text-fg/90">
                      {c.opportunity}
                    </p>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </Section>
  );
}
