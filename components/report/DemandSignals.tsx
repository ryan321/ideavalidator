import { Card, Section, Badge } from "@/components/ui";

const scoreColor = (n: number) =>
  n >= 70 ? "var(--color-good)" : n >= 45 ? "var(--color-warn)" : "var(--color-bad)";

type RedditThread = {
  subreddit: string;
  title: string;
  body: string;
  tag: string;
  sentiment: string;
};

type Reddit = {
  threads_found: number;
  sentiment: string;
  pain_intensity: "Low" | "Medium" | "High";
  demand_score: number;
  threads: RedditThread[];
};

type RisingSearch = { term: string; change: string };

type Search = {
  keyword: string;
  interest_score: number;
  direction: "Rising" | "Flat" | "Falling";
  momentum: string;
  rising_searches: RisingSearch[];
};

function clampScore(n: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function sentimentTone(s: string): "high" | "medium" | "low" {
  const v = (s || "").toLowerCase();
  if (v.includes("negative")) return "high";
  if (v.includes("positive")) return "low";
  return "medium";
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-panel2 p-3">
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div
        className="mt-1 font-mono text-lg font-bold leading-none text-fg"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

export function DemandSignals({
  reddit,
  search,
}: {
  reddit: Reddit;
  search: Search;
}) {
  const r = reddit ?? ({} as Reddit);
  const s = search ?? ({} as Search);
  const threads = Array.isArray(r.threads) ? r.threads : [];
  const risingSearches = Array.isArray(s.rising_searches) ? s.rising_searches : [];

  const demandScore = clampScore(r.demand_score ?? 0);
  const interestScore = clampScore(s.interest_score ?? 0);

  const directionColor =
    s.direction === "Rising"
      ? "var(--color-good)"
      : s.direction === "Falling"
      ? "var(--color-bad)"
      : "var(--color-muted)";

  return (
    <Section
      title="Live Demand Signals"
      right={<Badge tone="accent">REAL-TIME</Badge>}
    >
      <div className="space-y-5">
        {/* CARD 1 — Reddit Signal */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-fg">Reddit Signal</h4>
              <Badge tone="low">VERIFIED</Badge>
            </div>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Real voice of customer · live community discussions
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Threads Found" value={`~${r.threads_found ?? 0}`} />
            <Stat label="Sentiment" value={r.sentiment || "—"} />
            <Stat label="Pain Intensity" value={r.pain_intensity || "—"} />
            <Stat
              label="Demand Score"
              value={demandScore}
              color={scoreColor(demandScore)}
            />
          </div>

          {threads.length > 0 ? (
            <div className="mt-4 space-y-3">
              {threads.map((t, i) => (
                <div
                  key={`${t?.subreddit ?? "thread"}-${i}`}
                  className="rounded-xl border border-border bg-panel2 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-accent2">
                      r/{t?.subreddit || "unknown"}
                    </span>
                    {t?.tag ? <Badge tone="accent">{t.tag}</Badge> : null}
                    {t?.sentiment ? (
                      <Badge tone={sentimentTone(t.sentiment)}>{t.sentiment}</Badge>
                    ) : null}
                  </div>
                  <div className="mt-2 text-sm font-bold text-fg">
                    {t?.title || "Untitled thread"}
                  </div>
                  {t?.body ? (
                    <p className="mt-1 text-xs leading-relaxed text-muted">{t.body}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">No threads found.</p>
          )}
        </Card>

        {/* CARD 2 — Search Trends Signal */}
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-fg">Search Trends Signal</h4>
              <Badge tone="low">LIVE DATA</Badge>
            </div>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Google Trends-style momentum · keyword: {s.keyword || "—"}
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat
              label="Interest Score"
              value={
                <>
                  {interestScore}
                  <span className="text-xs font-medium text-muted">/100</span>
                </>
              }
              color={scoreColor(interestScore)}
            />
            <Stat
              label="Direction"
              value={s.direction || "—"}
              color={directionColor}
            />
            <Stat label="Momentum" value={s.momentum || "—"} />
          </div>

          <div className="mt-4">
            <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Rising Searches
            </h5>
            {risingSearches.length > 0 ? (
              <ul className="space-y-2">
                {risingSearches.map((rs, i) => (
                  <li
                    key={`${rs?.term ?? "term"}-${i}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-panel2 px-3 py-2"
                  >
                    <span className="min-w-0 truncate text-sm text-fg">
                      {rs?.term || "—"}
                    </span>
                    <span className="shrink-0 rounded-full border border-good/30 bg-good/15 px-2 py-0.5 font-mono text-xs font-semibold text-good">
                      {rs?.change || "—"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No rising searches.</p>
            )}
          </div>
        </Card>
      </div>
    </Section>
  );
}
