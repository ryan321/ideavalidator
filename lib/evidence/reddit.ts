import type { RawEvidenceItem } from "./types";
import { hasWtpSignal } from "./queries";

// Reddit's official API via OAuth2 client-credentials (a free "script" app —
// create one at https://www.reddit.com/prefs/apps). Optional: when the creds
// are absent we skip Reddit gracefully and the UI shows how to connect it.

const TIMEOUT_MS = 8000;
const USER_AGENT = "ideavalidator/0.1 (local dev tool)";

export function redditConfigured(): boolean {
  return !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET);
}

// Module-scoped token cache — client-credentials tokens last ~1h. The in-flight
// request is cached too, so the parallel per-query searches share ONE token POST
// instead of stampeding the endpoint (and duplicating any token error 8×).
let _token: { value: string; expiresAt: number } | null = null;
let _tokenPromise: Promise<string> | null = null;

async function fetchToken(): Promise<string> {
  const basic = Buffer.from(
    `${process.env.REDDIT_CLIENT_ID}:${process.env.REDDIT_CLIENT_SECRET}`
  ).toString("base64");
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": USER_AGENT,
    },
    body: "grant_type=client_credentials",
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Reddit token ${res.status}`);
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) throw new Error("Reddit token response missing access_token");
  // refresh a minute early so a token never expires mid-search
  _token = { value: json.access_token, expiresAt: Date.now() + ((json.expires_in ?? 3600) - 60) * 1000 };
  return _token.value;
}

async function getToken(): Promise<string> {
  if (_token && Date.now() < _token.expiresAt) return _token.value;
  if (!_tokenPromise) {
    _tokenPromise = fetchToken().finally(() => {
      _tokenPromise = null; // success populated _token; failure allows a fresh retry
    });
  }
  return _tokenPromise;
}

type RedditChild = {
  data?: {
    title?: string;
    selftext?: string;
    permalink?: string;
    subreddit?: string;
    author?: string;
    score?: number;
    num_comments?: number;
    created_utc?: number;
  };
};

function excerpt(text: string, max = 300): string {
  // drop Reddit's ubiquitous zero-width-space artifact (both the raw char and the
  // literal "&#x200B;" people paste into markdown), then collapse whitespace
  const t = text.replace(/\u200b|&#x200B;/gi, "").replace(/\s+/g, " ").trim();
  return t.length <= max ? t : t.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

/**
 * Search Reddit posts for one query. Returns skipped=true (no error) when the
 * API creds aren't configured. Collects errors, never throws.
 */
export async function searchReddit(
  query: string
): Promise<{ items: RawEvidenceItem[]; errors: string[]; skipped: boolean }> {
  if (!redditConfigured()) return { items: [], errors: [], skipped: true };
  const items: RawEvidenceItem[] = [];
  const errors: string[] = [];
  try {
    const token = await getToken();
    // raw_json=1: without it Reddit HTML-escapes &, <, > in title/selftext, which
    // would leak literal entities into quotes, the prompt, and the UI.
    const url = `https://oauth.reddit.com/search?q=${encodeURIComponent(query)}&sort=relevance&t=year&limit=25&type=link&raw_json=1`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Reddit search ${res.status}`);
    const json = (await res.json()) as { data?: { children?: RedditChild[] } };
    for (const child of json.data?.children ?? []) {
      const d = child.data;
      if (!d?.permalink) continue;
      const body = d.selftext?.trim() || "";
      const quote = excerpt(body || d.title || "");
      if (!quote) continue;
      items.push({
        source: "reddit",
        kind: "post",
        title: d.title,
        quote,
        url: `https://www.reddit.com${d.permalink}`,
        author: d.author,
        score: d.score ?? 0,
        num_comments: d.num_comments,
        created_utc: d.created_utc ?? 0,
        community: d.subreddit,
        matched_query: query,
        wtp_signal: hasWtpSignal(`${d.title ?? ""} ${body}`),
      });
    }
  } catch (e) {
    errors.push(`Reddit search "${query}": ${e instanceof Error ? e.message : String(e)}`);
  }
  return { items, errors, skipped: false };
}
