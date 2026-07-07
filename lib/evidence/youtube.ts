import type { RawEvidenceItem } from "./types";
import { hasWtpSignal } from "./queries";
import { excerpt, decodeEntities } from "./text";

// YouTube comments via the official Data API v3 (needs YOUTUBE_API_KEY — a browser-key
// from a Google Cloud project with "YouTube Data API v3" enabled). We find a few relevant
// videos for the query, then pull each one's top comments: real viewers describing the
// problem in their own words. Skipped (no error) when the key is absent.
//
// Quota note: search.list costs 100 units, commentThreads 1 unit each. The default daily
// quota is 10,000 units — so the video count per query is deliberately small.

const TIMEOUT_MS = 8000;
const VIDEOS_PER_QUERY = 3;
const COMMENTS_PER_VIDEO = 10;

export function youtubeConfigured(): boolean {
  return !!process.env.YOUTUBE_API_KEY;
}

type SearchResp = {
  items?: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string } }[];
};
type CommentResp = {
  items?: {
    snippet?: {
      totalReplyCount?: number;
      topLevelComment?: {
        id?: string;
        snippet?: {
          textOriginal?: string;
          authorDisplayName?: string;
          likeCount?: number;
          publishedAt?: string;
        };
      };
    };
  }[];
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`YouTube ${res.status}`);
  return (await res.json()) as T;
}

/** Search YouTube videos for one query and pull their top comments. Never throws. */
export async function searchYouTube(
  query: string
): Promise<{ items: RawEvidenceItem[]; errors: string[]; skipped: boolean }> {
  if (!youtubeConfigured()) return { items: [], errors: [], skipped: true };
  const key = process.env.YOUTUBE_API_KEY!;
  const items: RawEvidenceItem[] = [];
  const errors: string[] = [];
  try {
    const search = await getJson<SearchResp>(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=relevance&maxResults=${VIDEOS_PER_QUERY}&q=${encodeURIComponent(query)}&key=${key}`
    );
    // Fetch every video's comments in PARALLEL — wall clock is one comment call, not the
    // sum of all of them (each has an 8s timeout). Same quota usage.
    const videos = (search.items ?? []).filter((v) => v.id?.videoId);
    const perVideo = await Promise.all(
      videos.map(async (v) => {
        const videoId = v.id!.videoId!;
        const videoTitle = decodeEntities(v.snippet?.title ?? "");
        const channel = v.snippet?.channelTitle;
        try {
          const threads = await getJson<CommentResp>(
            `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&order=relevance&maxResults=${COMMENTS_PER_VIDEO}&videoId=${videoId}&key=${key}`
          );
          const out: RawEvidenceItem[] = [];
          for (const t of threads.items ?? []) {
            const c = t.snippet?.topLevelComment?.snippet;
            const text = c?.textOriginal ? excerpt(decodeEntities(c.textOriginal)) : "";
            if (!text) continue;
            const commentId = t.snippet?.topLevelComment?.id ?? "";
            out.push({
              source: "youtube",
              kind: "comment",
              title: videoTitle || undefined,
              quote: text,
              url: `https://www.youtube.com/watch?v=${videoId}${commentId ? `&lc=${commentId}` : ""}`,
              author: c?.authorDisplayName,
              score: c?.likeCount ?? 0,
              num_comments: t.snippet?.totalReplyCount,
              created_utc: c?.publishedAt ? Math.floor(new Date(c.publishedAt).getTime() / 1000) : 0,
              community: channel,
              matched_query: query,
              wtp_signal: hasWtpSignal(text),
            });
          }
          return { items: out, error: null as string | null };
        } catch (e) {
          // comments disabled on a video is common and expected — record, keep going
          return { items: [] as RawEvidenceItem[], error: `YouTube comments (${videoId}): ${e instanceof Error ? e.message : String(e)}` };
        }
      })
    );
    for (const r of perVideo) {
      items.push(...r.items);
      if (r.error) errors.push(r.error);
    }
  } catch (e) {
    errors.push(`YouTube search "${query}": ${e instanceof Error ? e.message : String(e)}`);
  }
  return { items, errors, skipped: false };
}
