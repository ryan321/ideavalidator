import { z } from "zod";
import { generateStructured } from "../ai/client";
import type { Usage } from "../ai/client";

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

// no .max — the result is sliced to 8 below, so an over-eager model can't fail the parse
const QueriesSchema = z.object({ queries: z.array(z.string()).min(1) });

/**
 * Generate 4-8 targeted search queries from the idea statement + goal using the
 * fast model. These go to keyword search engines (HN Algolia, Reddit search),
 * not an LLM — so short core terms, not sentences.
 */
export async function generateQueries(
  statement: string,
  goal: string | null
): Promise<{ queries: string[]; usage: Usage; model: string }> {
  const { data, usage, model } = await generateStructured(QueriesSchema, {
    role: "writing",
    grounded: false,
    maxTokens: 600,
    system:
      "You write keyword search queries for Reddit and Hacker News search. " +
      "Queries are SHORT (2-5 core terms, no quotes, no operators) — they hit a " +
      "keyword engine, not an LLM.",
    prompt: `Startup idea: ${statement}${goal ? `\nFounder's goal: ${goal}` : ""}

Write 4-8 search queries that would surface real people talking about this problem. Mix:
- pain-phrase queries (how people describe the problem, e.g. "how do I …", "is there a tool for …" reduced to core terms)
- competitor / alternative queries (e.g. "<category> alternative")
- willingness-to-pay queries (e.g. "pay for <category> tool")

Return JSON: {"queries": ["...", "..."]}`,
  });
  // keyword engines choke on long strings — keep each query tight
  const queries = data.queries
    .map((q) => q.trim())
    .filter(Boolean)
    .map((q) => q.split(/\s+/).slice(0, 6).join(" "))
    .slice(0, 8);
  return { queries, usage, model };
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
