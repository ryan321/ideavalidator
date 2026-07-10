import type { RawEvidenceItem } from "./types";
import { hasWtpSignal } from "./queries";
import { excerpt } from "./text";

// GitHub issue search via the official REST API. Issues on real projects are unmet needs
// in the wild — feature requests, "does anything do X?", complaints about existing tools.
// Doubles as competitor discovery (which repos already tackle this). Works unauthenticated
// at a low rate limit (10 search req/min); an optional GITHUB_TOKEN raises it to 30/min.

const TIMEOUT_MS = 8000;
const USER_AGENT = "validorian/1.0 (https://validorian.com)";

// works unauthenticated — GITHUB_TOKEN only raises the rate limit
export function githubConfigured(): boolean {
  return true;
}

type SearchResp = {
  items?: {
    title?: string;
    body?: string | null;
    html_url?: string;
    user?: { login?: string };
    comments?: number;
    reactions?: { total_count?: number };
    created_at?: string;
    repository_url?: string;
  }[];
};

// "https://api.github.com/repos/owner/repo" -> "owner/repo"
function repoSlug(repositoryUrl?: string): string | undefined {
  return repositoryUrl?.match(/repos\/([^/]+\/[^/]+)$/)?.[1];
}

/** Search GitHub issues + PRs for one query. Never throws. */
export async function searchGitHub(
  query: string
): Promise<{ items: RawEvidenceItem[]; errors: string[] }> {
  const items: RawEvidenceItem[] = [];
  const errors: string[] = [];
  try {
    const token = process.env.GITHUB_TOKEN;
    const url = `https://api.github.com/search/issues?per_page=10&sort=reactions&order=desc&q=${encodeURIComponent(`${query} in:title,body`)}`;
    const res = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": USER_AGENT,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`GitHub ${res.status}`);
    const json = (await res.json()) as SearchResp;
    for (const it of json.items ?? []) {
      if (!it.html_url) continue;
      const quote = excerpt(it.body ?? it.title ?? "");
      if (!quote) continue;
      items.push({
        source: "github",
        kind: "post",
        title: it.title,
        quote,
        url: it.html_url,
        author: it.user?.login,
        score: it.reactions?.total_count ?? 0,
        num_comments: it.comments,
        created_utc: it.created_at ? Math.floor(new Date(it.created_at).getTime() / 1000) : 0,
        community: repoSlug(it.repository_url),
        matched_query: query,
        wtp_signal: hasWtpSignal(`${it.title ?? ""} ${it.body ?? ""}`),
      });
    }
  } catch (e) {
    errors.push(`GitHub search "${query}": ${e instanceof Error ? e.message : String(e)}`);
  }
  return { items, errors };
}
