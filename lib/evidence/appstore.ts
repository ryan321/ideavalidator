import type { RawEvidenceItem } from "./types";
import { hasWtpSignal } from "./queries";
import { excerpt } from "./text";

// App Store reviews via Apple's public iTunes endpoints — no key required. We match the
// query to a few apps (Search API), then pull each app's customer reviews (RSS feed).
// A review of a shipping app is high-signal evidence: a real user of a real product
// saying exactly what's missing — the kind of behavioral/T2 signal the ranker weighs
// heavily, and a corrective to the tech-forum bias of HN/Reddit.

const TIMEOUT_MS = 8000;
const APPS_PER_QUERY = 3;
const REVIEWS_PER_APP = 10;

// no credentials to configure — kept for symmetry with the other source modules
export function appStoreConfigured(): boolean {
  return true;
}

type SearchResp = {
  results?: { trackId?: number; trackName?: string; trackViewUrl?: string }[];
};
type ReviewFeed = {
  feed?: {
    entry?: {
      id?: { label?: string };
      title?: { label?: string };
      content?: { label?: string };
      author?: { name?: { label?: string } };
      "im:rating"?: { label?: string };
      "im:voteSum"?: { label?: string };
    }[];
  };
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`App Store ${res.status}`);
  return (await res.json()) as T;
}

/** Match the query to apps, then fetch each app's reviews. Never throws. */
export async function searchAppStore(
  query: string
): Promise<{ items: RawEvidenceItem[]; errors: string[] }> {
  const items: RawEvidenceItem[] = [];
  const errors: string[] = [];
  try {
    const search = await getJson<SearchResp>(
      `https://itunes.apple.com/search?media=software&entity=software&limit=${APPS_PER_QUERY}&term=${encodeURIComponent(query)}`
    );
    // Fetch each app's review feed in PARALLEL — wall clock is one feed call, not the sum.
    const apps = (search.results ?? []).filter((a) => a.trackId && a.trackName);
    const perApp = await Promise.all(
      apps.map(async (app) => {
        const appUrl = app.trackViewUrl ?? `https://apps.apple.com/app/id${app.trackId}`;
        try {
          const feed = await getJson<ReviewFeed>(
            `https://itunes.apple.com/us/rss/customerreviews/page=1/id=${app.trackId}/sortby=mosthelpful/json`
          );
          const out: RawEvidenceItem[] = [];
          let n = 0;
          for (const e of feed.feed?.entry ?? []) {
            if (n >= REVIEWS_PER_APP) break;
            const body = e.content?.label?.trim();
            const rating = e["im:rating"]?.label;
            // the feed's first entry is the app itself (no review body/rating) — skip it
            if (!body || !rating) continue;
            const quote = excerpt(body);
            if (!quote) continue;
            n++;
            const reviewId = e.id?.label ?? `${app.trackId}-${n}`;
            const reviewTitle = e.title?.label?.trim();
            out.push({
              source: "appstore",
              kind: "review",
              // lead with the star rating — a 1★ review is an unmet-need goldmine
              title: `★${rating} · ${app.trackName}${reviewTitle ? ` — ${reviewTitle}` : ""}`,
              quote,
              // the reviews feed has no per-review permalink; synthesize a unique url off
              // the app page so dedupe-by-url keeps every distinct review
              url: `${appUrl}#review-${reviewId}`,
              author: e.author?.name?.label,
              score: Number(e["im:voteSum"]?.label ?? 0) || 0,
              created_utc: 0, // the customer-reviews RSS carries no reliable timestamp
              community: app.trackName,
              matched_query: query,
              wtp_signal: hasWtpSignal(`${reviewTitle ?? ""} ${body}`),
            });
          }
          return { items: out, error: null as string | null };
        } catch (e) {
          return { items: [] as RawEvidenceItem[], error: `App Store reviews (${app.trackName}): ${e instanceof Error ? e.message : String(e)}` };
        }
      })
    );
    for (const r of perApp) {
      items.push(...r.items);
      if (r.error) errors.push(r.error);
    }
  } catch (e) {
    errors.push(`App Store search "${query}": ${e instanceof Error ? e.message : String(e)}`);
  }
  return { items, errors };
}
