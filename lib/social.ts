// Best-effort social-handle availability. Only the platforms whose public profile
// URLs return a clean 404-vs-200 are checked here (GitHub, YouTube). The bot-walled
// ones (X, Instagram, TikTok) are left to the grounded name-intel research, which
// can reason about them from search results.
export type HandleStatus = "available" | "taken" | "unknown";

const HTTP_PLATFORMS: { key: string; url: (s: string) => string }[] = [
  { key: "github", url: (s) => `https://github.com/${s}` },
  { key: "youtube", url: (s) => `https://www.youtube.com/@${s}` },
];

async function probe(url: string): Promise<HandleStatus> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ideavalidator/1.0)" },
    });
    if (res.status === 404) return "available";
    if (res.status === 200) return "taken";
    return "unknown";
  } catch {
    return "unknown";
  }
}

/** Check handle availability where it's reliable. Returns { github: status, youtube: status }. */
export async function checkHandles(slug: string): Promise<Record<string, HandleStatus>> {
  if (!slug) return {};
  const entries = await Promise.all(
    HTTP_PLATFORMS.map(async (p) => [p.key, await probe(p.url(slug))] as const)
  );
  return Object.fromEntries(entries);
}
