import type { RawEvidenceItem } from "./types";
import { hasWtpSignal } from "./queries";

// Hacker News via Algolia — free, no auth. One call for stories, one for comments.

const TIMEOUT_MS = 8000;

type AlgoliaHit = {
  objectID: string;
  title?: string | null;
  story_title?: string | null;
  story_id?: number | null;
  url?: string | null;
  author?: string | null;
  points?: number | null;
  num_comments?: number | null;
  created_at_i?: number | null;
  comment_text?: string | null;
  story_text?: string | null;
};

// Algolia returns comment/story text as HTML — strip tags, then decode entities
// (named and numeric: HN text is full of &#x27; &#x2F; etc.).
function stripHtml(html: string): string {
  const NAMED: Record<string, string> = { quot: '"', gt: ">", lt: "<", nbsp: " " };
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&(quot|gt|lt|nbsp);/g, (_, n) => NAMED[n])
    .replace(/&amp;/g, "&") // last, so double-escaped entities don't re-decode
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(text: string, max = 300): string {
  const t = text.trim();
  return t.length <= max ? t : t.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

async function search(query: string, tags: "story" | "comment"): Promise<AlgoliaHit[]> {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=${tags}&hitsPerPage=10`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HN Algolia ${res.status}`);
  const json = (await res.json()) as { hits?: AlgoliaHit[] };
  return json.hits ?? [];
}

function hitToItem(hit: AlgoliaHit, kind: "story" | "comment", query: string): RawEvidenceItem | null {
  const title = (kind === "story" ? hit.title : hit.story_title) ?? undefined;
  const body = stripHtml(hit.comment_text ?? hit.story_text ?? "");
  const quote = excerpt(body || title || "");
  if (!quote) return null;
  // stories link directly; comments anchor into their story's thread
  const url =
    kind === "comment" && hit.story_id
      ? `https://news.ycombinator.com/item?id=${hit.story_id}#${hit.objectID}`
      : `https://news.ycombinator.com/item?id=${hit.objectID}`;
  return {
    source: "hn",
    kind,
    title,
    quote,
    url,
    author: hit.author ?? undefined,
    score: hit.points ?? 0,
    num_comments: hit.num_comments ?? undefined,
    created_utc: hit.created_at_i ?? 0,
    matched_query: query,
    wtp_signal: hasWtpSignal(`${title ?? ""} ${body}`),
  };
}

/** Search HN stories + comments for one query. Collects errors, never throws. */
export async function searchHn(query: string): Promise<{ items: RawEvidenceItem[]; errors: string[] }> {
  const items: RawEvidenceItem[] = [];
  const errors: string[] = [];
  for (const tags of ["story", "comment"] as const) {
    try {
      for (const hit of await search(query, tags)) {
        const item = hitToItem(hit, tags, query);
        if (item) items.push(item);
      }
    } catch (e) {
      errors.push(`HN search "${query}" (${tags}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return { items, errors };
}
