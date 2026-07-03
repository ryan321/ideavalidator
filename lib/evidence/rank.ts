import { z } from "zod";
import { generateStructured } from "../ai/client";
import type { Usage } from "../ai/client";
import type { EvidenceItem, RawEvidenceItem } from "./types";

const KEEP_TOP = 30;

// relevance is unbounded here — the clamp below handles a stray out-of-range rating,
// so one bad entry can't fail the whole batch (and trigger the keep-all degrade path).
const RatingsSchema = z.object({
  ratings: z.array(z.object({ n: z.number(), relevance: z.number() })),
});

/**
 * Dedupe fetched items by url, judge each one's relevance to the idea (one fast-model
 * batch call, 0-3), drop the irrelevant, sort (WTP first, then relevance, engagement,
 * recency) and assign stable E-ids. Ranking failures degrade (keep everything at
 * relevance 1) rather than throw — the corpus is still real fetched data.
 */
export async function dedupeAndRank(
  raw: RawEvidenceItem[],
  statement: string
): Promise<{ items: EvidenceItem[]; errors: string[]; usage: Usage | null }> {
  const errors: string[] = [];

  // dedupe by url (the same post often matches several queries)
  const byUrl = new Map<string, RawEvidenceItem>();
  for (const item of raw) if (!byUrl.has(item.url)) byUrl.set(item.url, item);
  const deduped = [...byUrl.values()];
  if (!deduped.length) return { items: [], errors, usage: null };

  // one batch relevance call: number each item, judge title+quote vs the idea
  let relevance = new Map<number, number>();
  let usage: Usage | null = null;
  try {
    const list = deduped
      .map((it, i) => `${i + 1}. [${it.source}] ${it.title ? `${it.title} — ` : ""}${it.quote}`.slice(0, 400))
      .join("\n");
    const res = await generateStructured(RatingsSchema, {
      role: "writing",
      grounded: false,
      maxTokens: Math.min(200 + deduped.length * 20, 4000),
      system:
        "You judge whether forum posts are relevant evidence for validating a startup idea. " +
        "Rate each item 0-3: 0 = unrelated noise; 1 = same general space; 2 = discusses this " +
        "problem or its competitors; 3 = directly expresses this pain or willingness to pay for it.",
      prompt: `Startup idea: ${statement}

Rate the relevance of each numbered item:
${list}

Return JSON: {"ratings": [{"n": 1, "relevance": 0-3}, ...]} — one entry per item, every item rated.`,
    });
    usage = res.usage;
    relevance = new Map(res.data.ratings.map((r) => [r.n, Math.max(0, Math.min(3, Math.round(r.relevance)))]));
  } catch (e) {
    // degrade: keep everything at relevance 1 rather than lose the corpus
    errors.push(`Relevance ranking failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  const rated = deduped
    .map((it, i) => ({ ...it, relevance: relevance.get(i + 1) ?? 1 }))
    .filter((it) => it.relevance > 0);

  rated.sort(
    (a, b) =>
      Number(b.wtp_signal) - Number(a.wtp_signal) ||
      b.relevance - a.relevance ||
      b.score - a.score ||
      b.created_utc - a.created_utc
  );

  const items: EvidenceItem[] = rated
    .slice(0, KEEP_TOP)
    .map((it, i) => ({ ...it, id: `E${i + 1}` }));
  return { items, errors, usage };
}
