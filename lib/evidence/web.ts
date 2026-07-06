import type { RawEvidenceItem } from "./types";
import { hasWtpSignal } from "./queries";
import { excerpt } from "./text";

// Web search via Exa's own neural index (needs EXA_API_KEY from dashboard.exa.ai). This is
// our legitimate catch-all source: review sites (G2/Capterra/Trustpilot), blogs, news, niche
// forums, competitor pages — and whatever public Reddit Exa has indexed — returned as cited
// results with query-relevant highlights. Exa crawls its own index (it is not a Google-SERP
// scraper), so this is a defensible way to reach content the dedicated plugins can't.
//
// We EXCLUDE the domains we already fetch directly, so web search focuses on the long tail
// instead of duplicating HN/SO/GitHub/App Store/Product Hunt. Skipped (no error) when the
// key is absent. NOTE: this is separate from the grounded scoring pass's OpenRouter exa
// plugin — this one turns web results into first-class corpus evidence.

const TIMEOUT_MS = 12000;
const NUM_RESULTS = 10;
// exclude only the domains we already fetch via dedicated structured plugins, so web
// search spends its budget on the long tail (review sites, blogs, competitor & Product
// Hunt pages, forums) instead of duplicating them.
const EXCLUDE_DOMAINS = [
  "news.ycombinator.com",
  "stackoverflow.com",
  "github.com",
  "apps.apple.com",
  "itunes.apple.com",
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

/** Web search for one query via Exa (excluding directly-covered domains). Never throws. */
export async function searchWeb(
  query: string
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
        excludeDomains: EXCLUDE_DOMAINS,
        contents: { highlights: true },
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
    errors.push(`Web (Exa) search "${query}": ${e instanceof Error ? e.message : String(e)}`);
  }
  return { items, errors, skipped: false };
}
