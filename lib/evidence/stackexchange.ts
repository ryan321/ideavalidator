import type { RawEvidenceItem } from "./types";
import { hasWtpSignal } from "./queries";
import { stripHtml, excerpt, decodeEntities } from "./text";

// Stack Exchange search via the public API (api.stackexchange.com). No key needed; an
// optional STACKEXCHANGE_KEY raises the daily quota. Questions are pain points stated
// plainly ("how do I…", "is there a tool for…") — strong signal for developer/technical
// ideas. Defaults to Stack Overflow. (The API auto-gzips; undici's fetch decodes it.)

const TIMEOUT_MS = 8000;
const SITE = "stackoverflow";

// works without a key — kept for symmetry with the other source modules
export function stackExchangeConfigured(): boolean {
  return true;
}

type SearchResp = {
  items?: {
    title?: string;
    body?: string;
    link?: string;
    score?: number;
    answer_count?: number;
    creation_date?: number;
    owner?: { display_name?: string };
  }[];
};

/** Search Stack Overflow questions for one query. Never throws. */
export async function searchStackExchange(
  query: string
): Promise<{ items: RawEvidenceItem[]; errors: string[] }> {
  const items: RawEvidenceItem[] = [];
  const errors: string[] = [];
  try {
    const key = process.env.STACKEXCHANGE_KEY;
    const url =
      `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&pagesize=10` +
      `&site=${SITE}&filter=withbody&q=${encodeURIComponent(query)}${key ? `&key=${key}` : ""}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`Stack Exchange ${res.status}`);
    const json = (await res.json()) as SearchResp;
    for (const q of json.items ?? []) {
      if (!q.link) continue;
      const title = q.title ? decodeEntities(q.title) : undefined;
      const quote = excerpt(stripHtml(q.body ?? "")) || title;
      if (!quote) continue;
      items.push({
        source: "stackexchange",
        kind: "post",
        title,
        quote,
        url: q.link,
        author: q.owner?.display_name,
        score: q.score ?? 0,
        num_comments: q.answer_count,
        created_utc: q.creation_date ?? 0,
        community: SITE,
        matched_query: query,
        wtp_signal: hasWtpSignal(`${title ?? ""} ${quote}`),
      });
    }
  } catch (e) {
    errors.push(`Stack Exchange search "${query}": ${e instanceof Error ? e.message : String(e)}`);
  }
  return { items, errors };
}
