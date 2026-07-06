// The evidence corpus: real posts/comments WE fetched from public APIs, so every
// quote/link the report renders is verifiably real (not asserted by the model).

export type EvidenceSource =
  | "reddit"
  | "hn"
  | "youtube"
  | "appstore"
  | "stackexchange"
  | "github"
  | "producthunt"
  | "web";

export type EvidenceItem = {
  id: string; // "E1", "E2", ... stable within a corpus
  source: EvidenceSource;
  kind: "post" | "comment" | "story" | "review";
  title?: string;
  quote: string; // the relevant excerpt (trimmed, verbatim from the fetched text)
  url: string; // canonical permalink WE constructed from API fields
  author?: string;
  score: number; // upvotes / HN points / helpful-votes
  num_comments?: number;
  created_utc: number;
  community?: string; // subreddit, SE site, repo (owner/repo), app name, PH topic…
  matched_query: string;
  wtp_signal: boolean; // willingness-to-pay phrase matched
  relevance: number; // 0-3 from the ranking pass
  // Mom-Test evidence tier of what the item actually shows (assigned in the ranking
  // pass): 1 = money/behavior (paying, built workarounds); 2 = a costly commitment;
  // 3 = a specific past fact/complaint; 4 = a compliment/hypothetical. T1/T2 weigh
  // heavily for demand, T4 ≈ zero. Optional because corpora persisted before this
  // existed lack it — the renderer defaults a missing tier to 3.
  tier?: 1 | 2 | 3 | 4;
};

// A fetched item before the ranking pass assigns its E-id, relevance, and tier.
export type RawEvidenceItem = Omit<EvidenceItem, "id" | "relevance" | "tier">;

export type EvidenceCorpus = {
  version_id: string;
  collected_at: number;
  /** Set when this corpus was COPIED from the parent version at version-creation time
   * (corpus pinning) — hill-climb comparisons hold evidence constant. Absent on a
   * freshly collected corpus. */
  pinned_from?: string;
  queries: string[];
  items: EvidenceItem[];
  stats: {
    reddit_count: number;
    hn_count: number;
    /** Per-source item counts (superset of reddit_count/hn_count). Absent on corpora
     * collected before multi-source support — the UI falls back to reddit/hn counts. */
    source_counts?: Partial<Record<EvidenceSource, number>>;
    /** Sources the query-planning pass chose as relevant to THIS idea and actually
     * searched (baseline reddit+hn plus the conditional sources it selected). A source
     * here with a zero count means it was searched but returned nothing. */
    selected_sources?: EvidenceSource[];
    communities: string[];
    reddit_skipped?: boolean;
    /** Sources skipped this run because they need an API key that isn't set (e.g.
     * youtube, producthunt). Reddit keeps its own dedicated reddit_skipped flag. */
    skipped_sources?: EvidenceSource[];
    /** Relevance ranking failed and every item defaulted to relevance 1 — the corpus
     * contribution to confidence is capped and a visible note is rendered. */
    degraded?: boolean;
    /** Does this idea's BUYER hang out on HN/Reddit? From the query-generation pass.
     * "low" inverts the thin-corpus penalty (a thin corpus is expected — lean on web/
     * review sources instead) and reweights confidence toward web. Absent on corpora
     * collected before this existed (and when the query pass failed) — treated as the
     * default (high/medium) behavior. */
    audience_online?: "high" | "medium" | "low";
    errors: string[];
  };
};
