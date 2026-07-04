import { getIdea, getVersion, logUsage, saveEvidence } from "../db";
import { fallbackQueries, generateQueries } from "./queries";
import { searchHn } from "./hn";
import { redditConfigured, searchReddit } from "./reddit";
import { dedupeAndRank } from "./rank";
import type { EvidenceCorpus } from "./types";

export type { EvidenceCorpus, EvidenceItem } from "./types";

/**
 * Collect the evidence corpus for a version: generate targeted queries, fan out to
 * HN + Reddit, dedupe + rank, assign E-ids, persist. Resilient by design — per-source
 * failures land in stats.errors and the corpus is whatever was actually fetched.
 */
export async function collectEvidence(versionId: string): Promise<EvidenceCorpus> {
  const version = getVersion(versionId);
  if (!version) throw new Error("Version not found");
  const idea = getIdea(version.idea_id);

  const errors: string[] = [];

  // 1. targeted search queries (fast model), with a naive keyword fallback
  let queries: string[];
  try {
    const q = await generateQueries(version.statement, idea?.goal ?? null);
    queries = q.queries;
    logUsage({ ideaId: version.idea_id, versionId, kind: "evidence_queries", model: q.model, usage: q.usage });
  } catch (e) {
    errors.push(`Query generation failed: ${e instanceof Error ? e.message : String(e)}`);
    queries = fallbackQueries(version.statement);
  }

  // 2. fan out to both sources per query — one slow/failed search never blocks the rest
  const settled = await Promise.allSettled(
    queries.flatMap((q) => [searchHn(q), searchReddit(q)])
  );
  const raw = [];
  for (const s of settled) {
    if (s.status === "fulfilled") {
      raw.push(...s.value.items);
      errors.push(...s.value.errors);
    } else {
      errors.push(String(s.reason));
    }
  }

  // 3. dedupe, judge relevance, sort, assign E-ids
  const ranked = await dedupeAndRank(raw, version.statement);
  errors.push(...ranked.errors);
  if (ranked.usage) {
    logUsage({ ideaId: version.idea_id, versionId, kind: "evidence_rank", model: null, usage: ranked.usage });
  }

  const items = ranked.items;
  const communities = [...new Set(items.map((i) => i.community).filter((c): c is string => !!c))];
  if (items.some((i) => i.source === "hn")) communities.push("Hacker News");

  const corpus: EvidenceCorpus = {
    version_id: versionId,
    collected_at: Date.now(),
    queries,
    items,
    stats: {
      reddit_count: items.filter((i) => i.source === "reddit").length,
      hn_count: items.filter((i) => i.source === "hn").length,
      communities,
      reddit_skipped: !redditConfigured() || undefined,
      degraded: ranked.degraded || undefined,
      errors,
    },
  };
  saveEvidence(versionId, corpus);
  return corpus;
}

// ---- prompt formatting ---------------------------------------------------------

const fmtDate = (utc: number) =>
  utc ? new Date(utc * 1000).toISOString().slice(0, 7) : "unknown date";

function itemLine(i: { id: string; source: string; community?: string; kind: string; score: number; num_comments?: number; created_utc: number; wtp_signal: boolean; title?: string; quote: string; url: string }): string {
  const where = i.source === "reddit" ? `Reddit r/${i.community ?? "?"}` : "Hacker News";
  const meta = `${where} ${i.kind} · ▲${i.score}${i.num_comments != null ? ` · ${i.num_comments} comments` : ""} · ${fmtDate(i.created_utc)}${i.wtp_signal ? " · WILLINGNESS-TO-PAY SIGNAL" : ""}`;
  return `[${i.id}] ${meta}\n${i.title ? `Title: ${i.title}\n` : ""}"${i.quote}"\n${i.url}`;
}

/**
 * The EVIDENCE section injected into the validation prompt: the numbered corpus
 * plus the citation rules (E-ids only — the server rewrites URLs from the corpus,
 * so a model-invented link can never render).
 */
export function evidencePromptBlock(corpus: EvidenceCorpus): string {
  const header = `\n\n=== EVIDENCE — real posts we fetched from Reddit + Hacker News (queries: ${corpus.queries.join("; ")}) ===`;
  const body = corpus.items.length
    ? corpus.items.map(itemLine).join("\n\n")
    : "(no relevant posts were found for this idea)";
  const rules = `
Rules for this evidence:
- Every "demand_signals" citation MUST reference one of the ids above via "evidence_id" (e.g. "E3"). Do NOT output URLs — the system attaches the real link from the corpus, and a signal citing an unknown id is DROPPED.
- Weigh the WILLINGNESS-TO-PAY-flagged items heavily when scoring Willingness to Pay.
- If this corpus is thin or empty for a dimension (e.g. no one discussing the pain), SAY SO in the relevant explanation and band that criterion lower and lower the overall confidence — do not paper over missing evidence.`;
  return `${header}\n${body}\n${rules}`;
}

/**
 * A compact digest (~1500 chars) of what real users are saying — top pain themes +
 * WTP quotes — so the refine loop attacks weaknesses with real evidence.
 */
export function corpusDigest(corpus: EvidenceCorpus, maxLen = 1500): string {
  if (!corpus.items.length) return "";
  const lines: string[] = [];
  const wtp = corpus.items.filter((i) => i.wtp_signal).slice(0, 3);
  if (wtp.length) {
    lines.push("Willingness-to-pay quotes (fetched):");
    for (const i of wtp) lines.push(`- [${i.id}] "${i.quote.slice(0, 180)}"`);
  }
  const rest = corpus.items.filter((i) => !i.wtp_signal && i.relevance >= 2).slice(0, 6);
  if (rest.length) {
    lines.push("Top pain/discussion themes (fetched):");
    for (const i of rest) {
      const where = i.source === "reddit" ? `r/${i.community ?? "?"}` : "HN";
      lines.push(`- [${i.id}] (${where}, ▲${i.score}) "${i.quote.slice(0, 150)}"`);
    }
  }
  let out = "";
  for (const l of lines) {
    if (out.length + l.length + 1 > maxLen) break;
    out += (out ? "\n" : "") + l;
  }
  return out;
}
