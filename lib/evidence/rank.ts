import { z } from "zod";
import { generateStructured } from "../ai/client";
import type { Usage } from "../ai/client";
import type { EvidenceItem, RawEvidenceItem } from "./types";

const KEEP_TOP = 30;

// relevance is unbounded here — the clamp below handles a stray out-of-range rating,
// so one bad entry can't fail the whole batch (and trigger the keep-all degrade path).
// wtp is optional so an omitted flag falls back to the keyword match, never a parse fail.
// tier is optional too (Mom-Test 1-4); an omitted/failed tier falls back to the keyword
// rule (wtp_signal → 1 else 3), so it can never fail the parse either.
const RatingsSchema = z.object({
  ratings: z.array(
    z.object({
      n: z.number(),
      relevance: z.number(),
      wtp: z.boolean().optional(),
      tier: z.number().optional(),
    })
  ),
});

// Keyword fallback tier when the ranking call didn't supply one (or degraded): a
// willingness-to-pay item is behavioral money-signal (T1); everything else is a
// plain past fact/complaint (T3). Never T2/T4 without the model's judgment.
const fallbackTier = (wtpSignal: boolean): 1 | 2 | 3 | 4 => (wtpSignal ? 1 : 3);
const clampTier = (t: number | undefined): 1 | 2 | 3 | 4 | null => {
  if (t == null) return null;
  const r = Math.round(t);
  return r === 1 || r === 2 || r === 3 || r === 4 ? (r as 1 | 2 | 3 | 4) : null;
};

/**
 * Dedupe fetched items by url, judge each one's relevance to the idea (one fast-model
 * batch call, 0-3) AND confirm willingness-to-pay per item, drop the irrelevant, sort
 * (WTP first, then relevance, engagement, recency) and assign stable E-ids.
 * wtp_signal = keyword match AND model confirmation ("I'd pay for this" is a signal;
 * "I'd pay for this... NOT" and "I wouldn't pay" are not). Ranking failures degrade
 * (keep everything at relevance 1, keyword-only WTP) rather than throw — the corpus
 * is still real fetched data.
 */
export async function dedupeAndRank(
  raw: RawEvidenceItem[],
  statement: string
): Promise<{ items: EvidenceItem[]; errors: string[]; usage: Usage | null; degraded: boolean }> {
  const errors: string[] = [];
  let degraded = false;

  // dedupe by url (the same post often matches several queries)
  const byUrl = new Map<string, RawEvidenceItem>();
  for (const item of raw) if (!byUrl.has(item.url)) byUrl.set(item.url, item);
  const deduped = [...byUrl.values()];
  if (!deduped.length) return { items: [], errors, usage: null, degraded };

  // one batch call: number each item, judge title+quote vs the idea (relevance 0-3)
  // and confirm any willingness-to-pay reading of the text (wtp boolean)
  let relevance = new Map<number, number>();
  let wtpConfirm = new Map<number, boolean>();
  let tierMap = new Map<number, 1 | 2 | 3 | 4>();
  let usage: Usage | null = null;
  try {
    const list = deduped
      .map((it, i) => `${i + 1}. [${it.source}] ${it.title ? `${it.title} — ` : ""}${it.quote}`.slice(0, 400))
      .join("\n");
    const res = await generateStructured(RatingsSchema, {
      role: "writing",
      grounded: false,
      // ~45-70 tokens per pretty-printed {n,relevance,wtp,tier} entry — the old
      // 200 + n*30 budget truncated ~30-item batches (finish=length), forcing the
      // degrade path. Give the whole batch room to land in one response.
      maxTokens: Math.min(400 + deduped.length * 70, 8000),
      system:
        "You judge whether forum posts are relevant evidence for validating a startup idea. " +
        "Rate each item 0-3: 0 = unrelated noise; 1 = same general space; 2 = discusses this " +
        "problem or its competitors; 3 = directly expresses this pain or willingness to pay for it. " +
        "Also set wtp per item: true ONLY if the text genuinely expresses real willingness to pay " +
        "(stated or demonstrated — 'I'd pay for this', 'we currently pay $X'); sarcasm, jokes, " +
        "refusals ('I would never pay for this'), hypotheticals about OTHER people paying, and " +
        "complaints about price are wtp false.\n" +
        "Also set tier 1-4 = the Mom-Test evidence STRENGTH of what the item shows (not its " +
        "relevance): 1 = money or behavior actually happened (paying for it, built a workaround, " +
        "switched tools); 2 = a costly commitment (real time/effort spent, a signed-up pilot); " +
        "3 = a specific past fact or concrete complaint; 4 = a compliment, generic praise, or a " +
        "hypothetical ('I would totally use this', 'sounds cool'). Bias toward the WEAKER tier when unsure.",
      prompt: `Startup idea: ${statement}

Rate each numbered item:
${list}

Return JSON: {"ratings": [{"n": 1, "relevance": 0-3, "wtp": true|false, "tier": 1-4}, ...]} — one entry per item, every item rated.`,
    });
    usage = res.usage;
    relevance = new Map(res.data.ratings.map((r) => [r.n, Math.max(0, Math.min(3, Math.round(r.relevance)))]));
    wtpConfirm = new Map(
      res.data.ratings
        .filter((r): r is { n: number; relevance: number; wtp: boolean } => typeof r.wtp === "boolean")
        .map((r) => [r.n, r.wtp])
    );
    tierMap = new Map(
      res.data.ratings
        .map((r) => [r.n, clampTier(r.tier)] as const)
        .filter((e): e is readonly [number, 1 | 2 | 3 | 4] => e[1] !== null)
    );
  } catch (e) {
    // degrade: keep everything at relevance 1 (and keyword-only WTP) rather than lose
    // the corpus — but flag it so confidence caps the corpus contribution instead of
    // reading fake relevance.
    degraded = true;
    errors.push(`Relevance ranking failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  const rated = deduped
    .map((it, i) => {
      // keyword match AND model confirmation; an omitted/failed confirmation falls
      // back to the keyword-only match (degraded mode keeps the old behavior).
      const wtp_signal = it.wtp_signal && (wtpConfirm.get(i + 1) ?? true);
      return {
        ...it,
        relevance: relevance.get(i + 1) ?? 1,
        wtp_signal,
        // model tier when supplied; else the keyword fallback (wtp → T1 else T3).
        tier: tierMap.get(i + 1) ?? fallbackTier(wtp_signal),
      };
    })
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
  return { items, errors, usage, degraded };
}
