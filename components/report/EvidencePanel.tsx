"use client";

import type { EvidenceCorpus, EvidenceItem } from "@/lib/evidence/types";
import { Eyebrow, Panel, Tag } from "@/components/ui";

// Relative date from a unix-seconds timestamp — honest recency without fake precision.
export function relDate(utc: number): string {
  if (!utc) return "";
  const days = Math.max(0, Math.floor((Date.now() / 1000 - utc) / 86400));
  if (days < 1) return "today";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

export function sourceLabel(item: { source: string; community?: string }): string {
  return item.source === "reddit" ? `r/${item.community ?? "reddit"}` : "Hacker News";
}

// "Fetched · Reddit" / "Fetched · Hacker News" — this data came from the source's
// API, not from the model's mouth.
export function FetchedBadge({ source }: { source: string }) {
  return (
    <span className="inline-block rounded-full border border-border bg-panel2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
      Fetched · {source === "reddit" ? "Reddit" : "Hacker News"}
    </span>
  );
}

export function WtpTag() {
  return <Tag tone="accent2">💰 willingness-to-pay</Tag>;
}

function EvidenceRow({ item }: { item: EvidenceItem }) {
  return (
    <Panel className="p-3">
      <div className="flex flex-wrap items-center gap-2">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-accent2 hover:underline">
          {sourceLabel(item)} ↗
        </a>
        <span className="font-mono text-[11px] text-muted">
          ▲{item.score}
          {item.num_comments != null ? ` · ${item.num_comments} comments` : ""}
          {item.created_utc ? ` · ${relDate(item.created_utc)}` : ""}
        </span>
        {item.wtp_signal && <WtpTag />}
        <span className="ml-auto"><FetchedBadge source={item.source} /></span>
      </div>
      {item.title && <div className="mt-1.5 text-sm font-medium text-fg/90">{item.title}</div>}
      <p className="mt-1 text-sm leading-relaxed text-muted">“{item.quote}”</p>
    </Panel>
  );
}

/**
 * The full fetched corpus behind the demand read: WTP items pinned first, then
 * each source's items, plus collection stats and per-source errors. Collapsible —
 * it's the receipts, not the headline.
 */
export function EvidencePanel({
  corpus,
  onRefresh,
  refreshing,
}: {
  corpus: EvidenceCorpus;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const wtp = corpus.items.filter((i) => i.wtp_signal);
  const reddit = corpus.items.filter((i) => i.source === "reddit" && !i.wtp_signal);
  const hn = corpus.items.filter((i) => i.source === "hn" && !i.wtp_signal);
  const groups: [string, EvidenceItem[]][] = [
    ["💰 Willingness-to-pay signals", wtp],
    ["Reddit", reddit],
    ["Hacker News", hn],
  ];

  return (
    <details className="group rounded-xl border border-border bg-panel/40">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 font-mono text-[13px] uppercase tracking-[0.12em] text-muted hover:text-fg">
        <span className="transition group-open:rotate-90">▸</span>
        Evidence corpus — {corpus.items.length} fetched post{corpus.items.length === 1 ? "" : "s"}
      </summary>
      <div className="space-y-6 border-t border-border p-5">
        {/* collection stats + refresh */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] uppercase tracking-wide text-muted">
          <span>{corpus.stats.hn_count} HN</span>
          <span>·</span>
          <span>{corpus.stats.reddit_count} Reddit</span>
          {corpus.stats.communities.length > 0 && (
            <>
              <span>·</span>
              <span>{corpus.stats.communities.length} communities</span>
            </>
          )}
          <span>·</span>
          <span>collected {relDate(Math.floor(corpus.collected_at / 1000))}</span>
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="ml-auto rounded-lg border border-accent2/30 px-3 py-1.5 text-sm font-medium normal-case tracking-normal text-accent2 transition hover:bg-accent2/10 disabled:opacity-50"
            >
              {refreshing ? "Refreshing…" : "⟳ Refresh evidence"}
            </button>
          )}
        </div>

        {corpus.stats.reddit_skipped && (
          <div className="rounded-r-lg border-l-2 border-warn/50 bg-warn/5 px-4 py-3 text-sm">
            <span className="font-mono text-[13px] uppercase tracking-wide text-warn">Reddit not connected · </span>
            <span className="text-fg/90">
              Add <code className="font-mono text-xs">REDDIT_CLIENT_ID</code> / <code className="font-mono text-xs">REDDIT_CLIENT_SECRET</code> to{" "}
              <code className="font-mono text-xs">.env.local</code> (free “script” app at reddit.com/prefs/apps) to include Reddit posts.
            </span>
          </div>
        )}

        <div className="text-xs text-muted">
          Search queries: {corpus.queries.map((q) => `“${q}”`).join(" · ")}
        </div>

        {corpus.items.length === 0 && (
          <p className="text-sm text-muted">
            No relevant posts found — that itself is a demand signal worth noting. Try refreshing, or
            sharpen the idea statement so the searches have more to bite on.
          </p>
        )}

        {groups.map(([label, items]) =>
          items.length ? (
            <div key={label}>
              <Eyebrow className="mb-2.5">{label} ({items.length})</Eyebrow>
              <div className="space-y-2">
                {items.map((item) => (
                  <EvidenceRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          ) : null
        )}

        {corpus.stats.errors.length > 0 && (
          <details>
            <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wide text-warn">
              {corpus.stats.errors.length} collection error{corpus.stats.errors.length === 1 ? "" : "s"}
            </summary>
            <ul className="mt-2 space-y-1">
              {corpus.stats.errors.map((e, i) => (
                <li key={i} className="font-mono text-xs text-muted">{e}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </details>
  );
}
