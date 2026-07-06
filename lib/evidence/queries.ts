import { z } from "zod";
import { generateStructured } from "../ai/client";
import type { Usage } from "../ai/client";
import type { EvidenceSource } from "./types";

// Hacker News is ALWAYS searched — free, no auth, and the robust floor that guarantees the
// pipeline never returns a zero-sourced corpus. The query pass routes the SPECIALIZED
// sources below per idea. (Reddit is parked — no legit cheap access — and YouTube is a
// key-gated opt-in handled in index.ts; neither is in the router's menu.)
const CONDITIONAL_SOURCES = ["stackexchange", "github", "appstore", "web"] as const;
const BASELINE_SOURCES: EvidenceSource[] = ["hn"];
export const ALL_SOURCES: EvidenceSource[] = [...BASELINE_SOURCES, ...CONDITIONAL_SOURCES];

// Willingness-to-pay phrases — matched at ranking time to flag wtp_signal items,
// which the validator weighs heavily for the Willingness to Pay criterion.
const WTP_PATTERNS = [
  "i'd pay",
  "i would pay",
  "shut up and take my money",
  "we pay $",
  "we're paying",
  "worth paying",
  "happily pay",
  "currently paying",
];

export function hasWtpSignal(text: string): boolean {
  // normalize curly apostrophes so "I’d pay" (smart punctuation) matches "i'd pay"
  const t = text.toLowerCase().replace(/[‘’]/g, "'");
  return WTP_PATTERNS.some((p) => t.includes(p));
}

// no .max — the result is sliced to 8 below, so an over-eager model can't fail the parse.
// audience_online: does this idea's BUYER hang out on HN/Reddit? .catch keeps a stray
// value from failing the parse (defaults to "medium" = the neutral, current behavior).
const QueriesSchema = z.object({
  queries: z.array(z.string()).min(1),
  audience_online: z.enum(["high", "medium", "low"]).catch("medium"),
  // specialized sources the model deems relevant to THIS idea. Optional/.catch so a
  // missing or malformed field falls back to "search them all" rather than failing the
  // whole pass (handled by the ?? below).
  sources: z.array(z.enum(CONDITIONAL_SOURCES)).optional().catch(undefined),
});

/**
 * Generate 4-8 targeted search queries from the idea statement + goal using the
 * fast model. These go to keyword search engines (HN Algolia, Reddit search),
 * not an LLM — so short core terms, not sentences.
 */
export async function generateQueries(
  statement: string,
  goal: string | null
): Promise<{
  queries: string[];
  audience_online: "high" | "medium" | "low";
  sources: EvidenceSource[];
  usage: Usage;
  model: string;
}> {
  const { data, usage, model } = await generateStructured(QueriesSchema, {
    role: "writing",
    grounded: false,
    maxTokens: 600,
    system:
      "You plan evidence collection for a startup idea: you write keyword search queries " +
      "AND choose which sources to search. Queries are SHORT (2-5 core terms, no quotes, no " +
      "operators) — they hit keyword engines, not an LLM. You also judge whether this idea's " +
      "BUYER discusses their problems online at all, and which specialized sources fit the idea.",
    prompt: `Startup idea: ${statement}${goal ? `\nFounder's goal: ${goal}` : ""}

Write 4-8 search queries that would surface real people talking about this problem. Mix:
- pain-phrase queries (how people describe the problem, e.g. "how do I …", "is there a tool for …" reduced to core terms)
- competitor / alternative queries (e.g. "<category> alternative")
- willingness-to-pay queries (e.g. "pay for <category> tool")

Set "audience_online": would this idea's BUYER realistically discuss this problem on Reddit or Hacker News?
- "high": developers, founders, tech-savvy consumers, hobbyists — HN/Reddit natives.
- "medium": mixed / some online presence (many SMB and prosumer tools).
- "low": the buyer rarely posts on HN/Reddit about this (e.g. plumbers, dentists, freight brokers, restaurant owners, field-service, most local/offline SMBs, enterprise procurement) — expect a thin forum corpus even for a strong idea.

Set "sources": choose which SPECIALIZED sources to search (Hacker News is ALWAYS searched — do not list it). Include every source whose users would genuinely discuss THIS problem or product; OMIT the rest — searching an irrelevant source just adds noise:
- "stackexchange": developers hitting technical/programming problems — dev tools, APIs, libraries, data, infra.
- "github": software / developer-tool ideas — existing open-source solutions and feature requests/issues (also competitor discovery).
- "appstore": ideas that ship (or compete with) a mobile/desktop APP — real user reviews expose unmet needs. Include for most consumer apps and app-shaped SaaS; omit for pure offline/services ideas.
- "web": the widest net — review sites (G2, Capterra, Trustpilot), blogs, news, niche forums, competitor pages, Product Hunt launches, and general web discussion of the problem. Include for ALMOST ANY idea; especially important when the buyer is offline/non-technical (audience_online "low"), where review sites and industry sources carry the demand read.

Return JSON: {"queries": ["...", "..."], "audience_online": "high"|"medium"|"low", "sources": ["stackexchange", "github", ...]}`,
  });
  // keyword engines choke on long strings — keep each query tight
  const queries = data.queries
    .map((q) => q.trim())
    .filter(Boolean)
    .map((q) => q.split(/\s+/).slice(0, 6).join(" "))
    .slice(0, 8);
  // baseline (reddit + hn) is always on; the model routes the conditional set. A missing/
  // malformed selection falls back to all conditional sources (broad, ranker-filtered).
  const selected = data.sources ?? [...CONDITIONAL_SOURCES];
  const sources: EvidenceSource[] = [...BASELINE_SOURCES, ...new Set(selected)];
  return { queries, audience_online: data.audience_online, sources, usage, model };
}

// If the query LLM fails we still collect: fall back to naive keyword queries
// derived from the statement itself.
export function fallbackQueries(statement: string): string[] {
  const words = statement
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 8);
  const core = words.slice(0, 4).join(" ");
  return core ? [core, `${words.slice(0, 3).join(" ")} alternative`] : [];
}
