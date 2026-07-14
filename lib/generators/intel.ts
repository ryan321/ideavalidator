import { z } from "zod";
import { generateStructured, type Source } from "../ai/client";
import { getArtifact, getIdea, getVersion, logUsage, saveArtifact, type Artifact } from "../db";

// Market intel pack: enrich the validation's named competitors with CITED web facts
// (pricing + funding via Exa), derive a competitor pricing anchor for the pricing
// recommendation, and write the founder's copyable one-liner. On-demand (own route,
// like the kill-test kit) — a validation never pays for it silently.
//
// The honesty rule that separates this from competitor products: every fact must
// carry the URL it came from, "not found" is a first-class answer, and market-share
// numbers are BANNED (private-company share to one decimal is theater).

export const IntelSchema = z.object({
  one_liner: z.string().catch(""), // copyable positioning statement built on the current wedge
  pricing_anchor: z.string().catch(""), // "competitors charge $X–$Y/mo …" — ONLY from found pricing
  competitors: z
    .array(
      z.object({
        name: z.string().catch(""),
        website: z.string().catch(""), // official site origin, ONLY when an excerpt URL is clearly theirs
        pricing: z.string().catch(""), // "" = not found (never guessed)
        pricing_url: z.string().catch(""),
        funding: z.string().catch(""), // "" = not found
        funding_url: z.string().catch(""),
        // CITED revenue/ARR — only when an excerpt states it; carries its URL.
        revenue: z.string().catch(""),
        revenue_url: z.string().catch(""),
        // Clearly-flagged rough estimate, ONLY when a defensible basis exists among the
        // FOUND facts (e.g. funding × typical multiple); must name that basis. "" otherwise.
        // The UI renders it with an "estimate" tag — never as a cited fact.
        revenue_estimate: z.string().catch(""),
        positioning: z.string().catch(""), // how they present themselves, from their own pages
      })
    )
    .catch([]),
});

export type Intel = z.infer<typeof IntelSchema>;

const TIMEOUT_MS = 12000;

type ExaResult = { title?: string | null; url?: string; highlights?: string[] };

async function exaSearch(query: string, numResults: number): Promise<ExaResult[]> {
  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: { "x-api-key": process.env.EXA_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ query, type: "auto", numResults, contents: { highlights: true } }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Exa ${res.status}`);
  const json = (await res.json()) as { results?: ExaResult[] };
  return json.results ?? [];
}

type ValidationLike = {
  narrative?: { who?: string; pain?: string; solution?: string };
  market?: { competitors?: { name: string; note?: string; your_edge?: string }[] };
  possible_alphas?: { alpha: string }[];
};

/** Generate + persist the market intel pack for a version. Needs EXA_API_KEY. */
export async function generateIntel(versionId: string): Promise<Artifact> {
  if (!process.env.EXA_API_KEY) {
    throw new Error("Set EXA_API_KEY in .env.local — competitor enrichment searches the web via Exa.");
  }
  const version = getVersion(versionId);
  if (!version) throw new Error("Version not found");
  const idea = getIdea(version.idea_id);

  const validation = getArtifact(versionId, "validation")?.data as ValidationLike | undefined;
  const competitors = (validation?.market?.competitors ?? []).map((c) => c.name).filter(Boolean);
  if (!competitors.length) {
    throw new Error("Run a validation first — enrichment works on its named competitors.");
  }

  // 3 targeted searches per competitor, all in parallel. A failed search just means
  // fewer excerpts — the extractor answers "not found" rather than the pack failing.
  const queries = competitors.flatMap((name) => [
    { name, kind: "pricing", q: `${name} pricing plans cost per month` },
    { name, kind: "funding", q: `${name} funding raised series round` },
    { name, kind: "revenue", q: `${name} annual revenue ARR customers` },
  ]);
  const settled = await Promise.allSettled(queries.map((s) => exaSearch(s.q, 3)));
  const excerpts: string[] = [];
  const sources: Source[] = [];
  settled.forEach((r, i) => {
    if (r.status !== "fulfilled") return;
    for (const hit of r.value) {
      if (!hit.url) continue;
      const text = (hit.highlights ?? []).join(" … ").slice(0, 500);
      if (!text) continue;
      excerpts.push(`[${queries[i].name} · ${queries[i].kind}] ${hit.title ?? hit.url}\nURL: ${hit.url}\n${text}`);
      if (!sources.some((s) => s.url === hit.url)) sources.push({ url: hit.url, title: hit.title ?? hit.url });
    }
  });

  const { data, usage, model } = await generateStructured(IntelSchema, {
    role: "writing",
    grounded: false,
    maxTokens: 3200,
    system:
      "You extract competitor facts from provided web excerpts and write one positioning line. " +
      "HARD RULES:\n" +
      "- Only state facts that appear in the provided excerpts. Every pricing/funding fact must " +
      "carry the URL of the excerpt it came from (one of the provided URLs, verbatim). If the " +
      "excerpts don't establish a fact, return \"\" for it — 'not found' is a correct answer.\n" +
      "- WRONG-COMPANY GUARD: each competitor comes with a one-line description of what it does. " +
      "If an excerpt describes a company that merely shares a similar NAME but is clearly in a " +
      "different business (different product category, different customers), DISCARD it — return " +
      "\"\" instead. A wrong-company fact is worse than no fact.\n" +
      "- NEVER estimate market share or user counts — not even hedged. Banned entirely.\n" +
      "- \"revenue\" is a CITED fact only: fill it (with revenue_url) when an excerpt states " +
      "revenue/ARR; otherwise \"\".\n" +
      "- \"revenue_estimate\" is the ONE permitted estimate, and only when the FOUND facts give a " +
      "defensible basis (e.g. disclosed funding × typical revenue multiples, or found pricing × a " +
      "disclosed customer count). It must lead with '~', give a RANGE, and NAME its basis, e.g. " +
      "\"~$10–30M/yr (rough est. from $60M raised)\". No basis among the found facts → \"\". Never " +
      "present an estimate as fact — the UI renders this field with an 'estimate' flag.\n" +
      "- \"website\": the competitor's official site origin (e.g. \"https://acme.com\") ONLY when an " +
      "excerpt URL is clearly their own domain (their pricing/product page); otherwise \"\".\n" +
      "- pricing_anchor summarizes ONLY the pricing you actually found (e.g. \"competitors charge " +
      "$29–99/mo\"); \"\" if none found.\n" +
      "- one_liner: one crisp sentence a founder could paste anywhere — the developer-first X that " +
      "does Y for Z — built from the idea's CURRENT wedge and edge, not hype words (no 'AI-powered', " +
      "'revolutionary', 'first-ever').",
    prompt: `The idea (v${version.n}): ${version.statement}
${idea?.title ? `Title: ${idea.title}` : ""}
Who it serves: ${validation?.narrative?.who ?? ""}
Named competitors to enrich (with what each one actually IS — the wrong-company guard checks against this):
${(validation?.market?.competitors ?? [])
  .map((c) => `- ${c.name}: ${c.note ?? ""}${c.your_edge ? ` (our edge: ${c.your_edge})` : ""}`)
  .join("\n")}

WEB EXCERPTS (the only permitted source of facts):
${excerpts.length ? excerpts.join("\n\n") : "(no excerpts found — return empty facts)"}

Return JSON exactly:
{
  "one_liner": string,
  "pricing_anchor": string,
  "competitors": [{"name": string, "website": string, "pricing": string, "pricing_url": string, "funding": string, "funding_url": string, "revenue": string, "revenue_url": string, "revenue_estimate": string, "positioning": string}]
}`,
  });

  logUsage({ ideaId: version.idea_id, versionId, kind: "intel", model, usage });
  return saveArtifact(versionId, "intel", data, sources, model, usage);
}
