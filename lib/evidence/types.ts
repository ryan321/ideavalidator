// The evidence corpus: real posts/comments WE fetched from public APIs, so every
// quote/link the report renders is verifiably real (not asserted by the model).

export type EvidenceSource = "reddit" | "hn";

export type EvidenceItem = {
  id: string; // "E1", "E2", ... stable within a corpus
  source: EvidenceSource;
  kind: "post" | "comment" | "story";
  title?: string;
  quote: string; // the relevant excerpt (trimmed, verbatim from the fetched text)
  url: string; // canonical permalink WE constructed from API fields
  author?: string;
  score: number; // upvotes / HN points
  num_comments?: number;
  created_utc: number;
  community?: string; // subreddit name for reddit
  matched_query: string;
  wtp_signal: boolean; // willingness-to-pay phrase matched
  relevance: number; // 0-3 from the ranking pass
};

// A fetched item before the ranking pass assigns its E-id and relevance.
export type RawEvidenceItem = Omit<EvidenceItem, "id" | "relevance">;

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
    communities: string[];
    reddit_skipped?: boolean;
    /** Relevance ranking failed and every item defaulted to relevance 1 — the corpus
     * contribution to confidence is capped and a visible note is rendered. */
    degraded?: boolean;
    errors: string[];
  };
};
