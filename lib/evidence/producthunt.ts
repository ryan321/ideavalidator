import type { RawEvidenceItem } from "./types";
import { excerpt } from "./text";

// Product Hunt via the official GraphQL API v2 (needs PRODUCTHUNT_TOKEN — a developer
// token from producthunt.com/v2/oauth/applications). Surfaces competing/adjacent
// launches: what already exists in this space and how much traction it drew.
//
// CAVEAT: the PH API v2 has NO full-text post search. We pull a window of top posts and
// keyword-match them client-side, so this is competitor/traction *context*, not exhaustive
// search — the ranking pass drops anything that isn't genuinely relevant. For thorough PH
// coverage, the grounded web (exa) path is the better tool. Called once per collection
// (not per query) since it scans a fixed window.

const TIMEOUT_MS = 10000;
const WINDOW = 50; // top posts to scan per run

export function productHuntConfigured(): boolean {
  return !!process.env.PRODUCTHUNT_TOKEN;
}

type GqlResp = {
  data?: {
    posts?: {
      edges?: {
        node?: {
          name?: string;
          tagline?: string;
          description?: string;
          url?: string;
          votesCount?: number;
          commentsCount?: number;
          createdAt?: string;
          topics?: { edges?: { node?: { name?: string } }[] };
        };
      }[];
    };
  };
  errors?: { message?: string }[];
};

// distinct content words (>3 chars) across the query set, for the client-side match
function keywords(queries: string[]): string[] {
  return [...new Set(queries.flatMap((q) => q.toLowerCase().split(/\s+/)).filter((w) => w.length > 3))];
}

/** Scan top Product Hunt posts and keep those matching the query keywords. Never throws. */
export async function searchProductHunt(
  queries: string[]
): Promise<{ items: RawEvidenceItem[]; errors: string[]; skipped: boolean }> {
  if (!productHuntConfigured()) return { items: [], errors: [], skipped: true };
  const items: RawEvidenceItem[] = [];
  const errors: string[] = [];
  const words = keywords(queries);
  if (!words.length) return { items, errors, skipped: false };
  try {
    const res = await fetch("https://api.producthunt.com/v2/api/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PRODUCTHUNT_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        query: `{ posts(first: ${WINDOW}, order: VOTES) { edges { node { name tagline description url votesCount commentsCount createdAt topics { edges { node { name } } } } } } }`,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`Product Hunt ${res.status}`);
    const json = (await res.json()) as GqlResp;
    if (json.errors?.length) throw new Error(json.errors.map((e) => e.message).join("; "));
    for (const edge of json.data?.posts?.edges ?? []) {
      const n = edge.node;
      if (!n?.url || !n.name) continue;
      const hay = `${n.name} ${n.tagline ?? ""} ${n.description ?? ""}`.toLowerCase();
      if (!words.some((w) => hay.includes(w))) continue; // keyword gate (no server search)
      items.push({
        source: "producthunt",
        kind: "post",
        title: n.tagline ? `${n.name} — ${n.tagline}` : n.name,
        quote: excerpt(n.description || n.tagline || n.name),
        url: n.url,
        score: n.votesCount ?? 0,
        num_comments: n.commentsCount,
        created_utc: n.createdAt ? Math.floor(new Date(n.createdAt).getTime() / 1000) : 0,
        community: n.topics?.edges?.[0]?.node?.name,
        matched_query: words.join(" "),
        wtp_signal: false,
      });
    }
  } catch (e) {
    errors.push(`Product Hunt search: ${e instanceof Error ? e.message : String(e)}`);
  }
  return { items, errors, skipped: false };
}
