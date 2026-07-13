import type { RawEvidenceItem } from "./types";
import { hasWtpSignal } from "./queries";
import { excerpt } from "./text";

// Web search via Exa's own neural index (needs EXA_API_KEY from dashboard.exa.ai). Since
// Reddit is parked, this is the PRIMARY demand read for buyers who never touch HN/SO/GitHub —
// especially non-technical / offline / consumer segments. Two complementary lanes, both
// normalized to source:"web" (so the schema, prompt, and UI are unchanged):
//   • BROAD  — the general catch-all, excluding the domains we already fetch via dedicated
//     structured plugins, so the budget goes to the long tail (blogs, news, niche forums,
//     competitor pages).
//   • REVIEW — a targeted pass over the review/complaint marketplaces (G2, Capterra,
//     Trustpilot, …) where real buyers say what they pay for and what's missing. This is the
//     behavioral T1/T2 demand signal Reddit used to give us, from users who never post to HN.
// Exa crawls its OWN index (it is NOT a Google-SERP scraper — SERP-scraping is litigated and
// off-limits here), so both lanes are a defensible way to reach content the dedicated plugins
// can't. Skipped (no error) when the key is absent. Separate from the grounded scoring pass's
// OpenRouter exa plugin — this one turns web results into first-class corpus evidence.

const TIMEOUT_MS = 12000;
const NUM_RESULTS = 10;

// Broad lane: exclude only the domains we already fetch via dedicated structured plugins, so
// the general web search spends its budget on the long tail instead of duplicating them. Exa
// forbids includeDomains + excludeDomains in ONE request, so the review lane uses its own
// includeDomains instead — the two lanes are separate calls.
const EXCLUDE_DOMAINS = [
  "news.ycombinator.com",
  "stackoverflow.com",
  "github.com",
  "apps.apple.com",
  "itunes.apple.com",
];

// Review lane: public review/complaint marketplaces + launch boards that carry the demand
// read for non-technical/offline buyers. Surfaced via Exa's OWN index — the same sanctioned
// posture as the rest of our Exa use (we consume Exa's crawl; we never scrape these sites
// ourselves, and SERP-scrapers stay off-limits).
const REVIEW_DOMAINS = [
  "g2.com",
  "capterra.com",
  "getapp.com",
  "softwareadvice.com",
  "trustradius.com",
  "trustpilot.com",
  "sitejabber.com",
  "producthunt.com",
];

export function webConfigured(): boolean {
  return !!process.env.EXA_API_KEY;
}

type ExaResult = {
  title?: string | null;
  url?: string;
  publishedDate?: string | null; // "YYYY-MM-DD" or null
  author?: string | null;
  highlights?: string[]; // present when contents.highlights requested
};

// "https://www.g2.com/products/…" -> "g2.com"
function domainOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

type Lane = {
  label: "broad" | "reviews";
  /** positive domain filter (review lane); mutually exclusive with excludeDomains per Exa. */
  includeDomains?: string[];
  excludeDomains?: string[];
  /** guides Exa's highlight LLM toward demand/pain/WTP excerpts rather than marketing copy. */
  highlightQuery: string;
};

/** One Exa /search call for a lane. Never throws — errors are collected, not raised. */
async function exaSearch(
  query: string,
  lane: Lane
): Promise<{ items: RawEvidenceItem[]; errors: string[]; skipped: boolean }> {
  if (!webConfigured()) return { items: [], errors: [], skipped: true };
  const items: RawEvidenceItem[] = [];
  const errors: string[] = [];
  try {
    const res = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: { "x-api-key": process.env.EXA_API_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        type: "auto",
        numResults: NUM_RESULTS,
        // includeDomains and excludeDomains are mutually exclusive in one Exa request — a lane
        // sets exactly one of them.
        ...(lane.includeDomains ? { includeDomains: lane.includeDomains } : {}),
        ...(lane.excludeDomains ? { excludeDomains: lane.excludeDomains } : {}),
        contents: { highlights: { query: lane.highlightQuery, numSentences: 3 } },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Exa ${res.status}`);
    const json = (await res.json()) as { results?: ExaResult[] };
    for (const r of json.results ?? []) {
      if (!r.url) continue;
      // join the top highlights into one quote — each is a query-relevant excerpt
      const quote = excerpt((r.highlights ?? []).slice(0, 2).join(" … "));
      if (!quote) continue;
      const title = r.title ?? undefined;
      items.push({
        source: "web",
        kind: "post",
        title,
        quote,
        url: r.url,
        author: r.author ?? undefined,
        score: 0, // web results carry no engagement metric (no upvotes/points)
        created_utc: r.publishedDate ? Math.floor(new Date(r.publishedDate).getTime() / 1000) || 0 : 0,
        community: domainOf(r.url),
        matched_query: query,
        wtp_signal: hasWtpSignal(`${title ?? ""} ${quote}`),
      });
    }
  } catch (e) {
    errors.push(`Web (Exa) ${lane.label} "${query}": ${e instanceof Error ? e.message : String(e)}`);
  }
  return { items, errors, skipped: false };
}

/** Broad web catch-all via Exa (excluding directly-covered domains). Never throws. */
export async function searchWeb(
  query: string
): Promise<{ items: RawEvidenceItem[]; errors: string[]; skipped: boolean }> {
  return exaSearch(query, {
    label: "broad",
    excludeDomains: EXCLUDE_DOMAINS,
    highlightQuery: `${query} — the problem people have, complaints, and what they wish existed`,
  });
}

/**
 * Targeted review-site pass via Exa — the demand/WTP read Reddit used to give us, from real
 * buyers on the review/complaint marketplaces. Never throws.
 */
export async function searchWebReviews(
  query: string
): Promise<{ items: RawEvidenceItem[]; errors: string[]; skipped: boolean }> {
  return exaSearch(query, {
    label: "reviews",
    includeDomains: REVIEW_DOMAINS,
    highlightQuery: `${query} — user complaints, missing features, pricing, willingness to pay, switching away`,
  });
}
