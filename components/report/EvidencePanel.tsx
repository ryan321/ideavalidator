"use client";

import type { EvidenceCorpus, EvidenceItem, EvidenceSource } from "@/lib/evidence/types";
import { SOURCE_META, SOURCE_ORDER, sourceName } from "@/lib/evidence/sources";
import type { TranslateFn } from "@/lib/i18n/t";
import { Eyebrow, Panel, Tag } from "@/components/ui";
import { useT } from "../LocaleProvider";
import { TierChip, TierLegend } from "./chips";

// Relative date from a unix-seconds timestamp — honest recency without fake precision.
export function relDate(utc: number, t?: TranslateFn): string {
  if (!utc) return "";
  const days = Math.max(0, Math.floor((Date.now() / 1000 - utc) / 86400));
  if (!t) {
    if (days < 1) return "today";
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.round(days / 30)}mo ago`;
    return `${Math.round(days / 365)}y ago`;
  }
  if (days < 1) return t("report.today");
  if (days < 30) return t("report.daysAgo", { n: days });
  if (days < 365) return t("report.monthsAgo", { n: Math.round(days / 30) });
  return t("report.yearsAgo", { n: Math.round(days / 365) });
}

/** Localized source brand/short name for UI (machine ids stay English in data). */
export function localizedSourceName(source: string, t: TranslateFn): string {
  const map: Record<string, string> = {
    reddit: t("report.sourceReddit"),
    hn: t("report.sourceHn"),
    appstore: t("report.sourceAppStore"),
    stackexchange: t("report.sourceStackExchange"),
    github: t("report.sourceGithub"),
    youtube: t("report.sourceYoutube"),
    producthunt: t("report.sourceProductHunt"),
    web: t("report.sourceWeb"),
  };
  return map[source] ?? sourceName(source);
}

export function localizedSourceShort(source: string, t: TranslateFn): string {
  const map: Record<string, string> = {
    reddit: t("report.sourceReddit"),
    hn: t("report.sourceHnShort"),
    appstore: t("report.sourceAppStore"),
    stackexchange: t("report.sourceStackExchangeShort"),
    github: t("report.sourceGithub"),
    youtube: t("report.sourceYoutube"),
    producthunt: t("report.sourceProductHuntShort"),
    web: t("report.sourceWeb"),
  };
  return map[source] ?? SOURCE_META[source as EvidenceSource]?.short ?? source;
}

export function sourceLabel(
  item: { source: string; community?: string },
  t?: TranslateFn
): string {
  if (item.source === "reddit") return `r/${item.community ?? "reddit"}`;
  if (item.community) return item.community;
  return t ? localizedSourceName(item.source, t) : sourceName(item.source);
}

/** Map model demand-signal tags to localized labels. */
export function signalTagLabel(tag: string, t: TranslateFn): string {
  const key = tag.trim().toUpperCase().replace(/[_-]+/g, " ");
  if (key === "PAIN POINT" || key === "PAINPOINT") return t("report.tagPainPoint");
  if (key === "FEATURE REQUEST" || key === "FEATURE REQUESTS") return t("report.tagFeatureRequest");
  if (key === "DISCUSSION") return t("report.tagDiscussion");
  return tag;
}

// "Fetched · Reddit" / "Fetched · App Store" — this data came from the source's API,
// not from the model's mouth.
export function FetchedBadge({ source }: { source: string }) {
  const t = useT();
  return (
    <span className="inline-block rounded-full border border-border bg-panel2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
      {t("report.fetched", { source: localizedSourceName(source, t) })}
    </span>
  );
}

export function WtpTag() {
  const t = useT();
  return <Tag tone="accent2">{t("report.willingnessToPayTag")}</Tag>;
}

function commentsLabel(n: number, t: TranslateFn): string {
  return n === 1 ? t("report.commentsOne") : t("report.comments", { n });
}

function EvidenceRow({ item }: { item: EvidenceItem }) {
  const t = useT();
  return (
    <Panel className="p-3">
      <div className="flex flex-wrap items-center gap-2">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-accent2 hover:underline">
          {sourceLabel(item, t)} ↗
        </a>
        <span className="font-mono text-[11px] text-muted">
          ▲{item.score}
          {item.num_comments != null ? ` · ${commentsLabel(item.num_comments, t)}` : ""}
          {item.created_utc ? ` · ${relDate(item.created_utc, t)}` : ""}
        </span>
        {item.wtp_signal && <WtpTag />}
        <TierChip tier={item.tier} compact />
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
  const t = useT();
  const wtp = corpus.items.filter((i) => i.wtp_signal);
  const rest = corpus.items.filter((i) => !i.wtp_signal);
  const groups: [string, EvidenceItem[]][] = [[t("report.wtpSignals"), wtp]];
  for (const src of SOURCE_ORDER) {
    const g = rest.filter((i) => i.source === src);
    if (g.length) groups.push([localizedSourceName(src, t), g]);
  }

  // per-source counts for the stats row — fall back to reddit/hn on pre-multi-source corpora
  const counts: Partial<Record<EvidenceSource, number>> =
    corpus.stats.source_counts ?? { hn: corpus.stats.hn_count, reddit: corpus.stats.reddit_count };
  const countParts = SOURCE_ORDER.filter((s) => (counts[s] ?? 0) > 0).map(
    (s) => `${counts[s]} ${localizedSourceShort(s, t)}`
  );
  const otherSkipped = (corpus.stats.skipped_sources ?? []).filter((s) => s !== "reddit");
  const n = corpus.items.length;

  return (
    <details className="group rounded-xl border border-border bg-panel/40">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 font-mono text-[13px] uppercase tracking-[0.12em] text-muted hover:text-fg">
        <span className="transition group-open:rotate-90">▸</span>
        {n === 1
          ? t("report.evidenceCorpusOne")
          : t("report.evidenceCorpus", { n })}
      </summary>
      <div className="space-y-6 border-t border-border p-5">
        {/* collection stats + refresh */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[11px] uppercase tracking-wide text-muted">
          {[
            ...countParts,
            ...(corpus.stats.communities.length > 0
              ? [t("report.communities", { n: corpus.stats.communities.length })]
              : []),
            t("report.collected", {
              when: relDate(Math.floor(corpus.collected_at / 1000), t),
            }),
          ].map((part, i) => (
            <span key={i} className="flex items-center gap-3">
              {i > 0 && <span>·</span>}
              <span>{part}</span>
            </span>
          ))}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="ml-auto rounded-lg border border-accent2/30 px-3 py-1.5 text-sm font-medium normal-case tracking-normal text-accent2 transition hover:bg-accent2/10 disabled:opacity-50"
            >
              {refreshing ? t("report.refreshing") : t("report.refreshEvidence")}
            </button>
          )}
        </div>

        {corpus.stats.reddit_skipped && (
          <div className="rounded-r-lg border-l-2 border-warn/50 bg-warn/5 px-4 py-3 text-sm">
            <span className="font-mono text-[13px] uppercase tracking-wide text-warn">
              {t("report.redditNotConnected")}{" "}
            </span>
            <span className="text-fg/90">{t("report.redditNotConnectedBlurb")}</span>
          </div>
        )}

        {otherSkipped.length > 0 && (
          <div className="text-xs text-muted">
            {t("report.notConnected", {
              sources: otherSkipped.map((s) => localizedSourceName(s, t)).join(", "),
            })}
          </div>
        )}

        <div className="text-xs text-muted">
          {t("report.searchQueries")}{" "}
          {corpus.queries.map((q) => `“${q}”`).join(" · ")}
        </div>

        {corpus.stats.selected_sources && corpus.stats.selected_sources.length > 0 && (
          <div className="text-xs text-muted">
            {t("report.sourcesMatched")}{" "}
            {corpus.stats.selected_sources
              .map((s) => localizedSourceName(s, t))
              .join(", ")}
          </div>
        )}

        {/* Mom-Test tier ledger: each item is chipped by what it actually SHOWS
            (T1 money/behavior … T4 compliment), not how encouraging it sounds. */}
        {corpus.items.length > 0 && <TierLegend />}

        {corpus.items.length === 0 && (
          <p className="text-sm text-muted">{t("report.noPostsFound")}</p>
        )}

        {groups.map(([label, items]) =>
          items.length ? (
            <div key={label}>
              <Eyebrow className="mb-2.5">
                {label} ({items.length})
              </Eyebrow>
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
              {corpus.stats.errors.length === 1
                ? t("report.collectionErrorOne")
                : t("report.collectionErrors", { n: corpus.stats.errors.length })}
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
