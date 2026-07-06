import { z } from "zod";
import { generateStructured } from "../ai/client";
import { getArtifact, getEvidence, getIdea, getVersion, logUsage } from "../db";
import { corpusDigest } from "../evidence";
import { goalContext } from "./shared";

// The Wedge Explorer: propose 3-5 DIVERGENT variants of the idea, each attacking a
// different strategic wedge. Where refine is a hill-climber (one focused improvement),
// this is the fan-out: the variants are validated head-to-head on the SAME pinned
// corpus (a tournament) so the founder can see which angle actually scores best,
// instead of iterating blind down one path.

export const WedgeSetSchema = z.object({
  wedges: z
    .array(
      z.object({
        wedge: z.string(), // the angle in a few words, e.g. "Compliance-first for EU agencies"
        statement: z.string(), // full rewritten 1-3 sentence idea statement around this wedge
        label: z.string(), // short version label for the switcher
        rationale: z.string(), // why this wedge could win, tied to evidence/competitor gaps
        targets: z.string(), // which weakness / pain / competitor gap it attacks
      })
    )
    .min(3),
});

export type WedgeSet = z.infer<typeof WedgeSetSchema>;
export type WedgeProposal = WedgeSet["wedges"][number];

const MAX_WEDGES = 5;

type ValidationLike = {
  criteria?: { name: string; score: number; explanation?: string; lever?: string }[];
  possible_alphas?: { alpha: string; rationale: string }[];
  market?: {
    competitors?: { name: string; note?: string; complaint_theme?: string; your_edge?: string }[];
  };
  narrative?: { who?: string; pain?: string; verdict?: string };
};

/**
 * Propose 3-5 divergent wedge variants for a version. Does NOT create versions —
 * the client shows the set, then runs the tournament on the selected ones.
 */
export async function proposeWedges(versionId: string): Promise<WedgeSet & { _cost: number }> {
  const version = getVersion(versionId);
  if (!version) throw new Error("Version not found");
  const idea = getIdea(version.idea_id);

  const validation = getArtifact(versionId, "validation")?.data as ValidationLike | undefined;

  // Raw material for divergence: the validator's own alpha candidates, the named
  // competitors' complaint themes (where incumbents' customers are unhappy), and the
  // weakest criteria. Same isolation as refine: names + explanations, never numbers.
  const alphas = (validation?.possible_alphas ?? [])
    .map((a) => `  - ${a.alpha}: ${a.rationale}`)
    .join("\n");
  const competitors = (validation?.market?.competitors ?? [])
    .map(
      (c) =>
        `  - ${c.name}: ${c.note ?? ""}${c.complaint_theme ? ` | customers complain about: ${c.complaint_theme}` : ""}${c.your_edge ? ` | our current edge: ${c.your_edge}` : ""}`
    )
    .join("\n");
  const weak = (validation?.criteria ?? [])
    .slice()
    .sort((a, b) => a.score - b.score)
    .slice(0, 4)
    .map((c) => `  - ${c.name}: ${c.explanation ?? ""}`)
    .join("\n");

  const corpus = getEvidence(versionId);
  const digest = corpus ? corpusDigest(corpus) : "";

  const { data, usage, model } = await generateStructured(WedgeSetSchema, {
    role: "scoring",
    grounded: false,
    maxTokens: 4000,
    system:
      "You are a startup strategist generating DIVERGENT strategic variants of one idea — not " +
      "iterations of one path, but genuinely different wedges into the market. Keep the SAME core " +
      "idea in every variant (no pivots to unrelated concepts); vary the STRATEGY around it.\n" +
      "DIVERGENCE RULE: each wedge must be a materially different strategy — a different buyer " +
      "segment, a different slice of the problem, a different positioning/defensibility path, or a " +
      "different revenue emphasis. If two wedges would win the same first ten customers, they are " +
      "the same wedge: merge them and find another. Across the set, include at least (a) the " +
      "sharpest niche-down, (b) the strongest counter-position against the named competitors' " +
      "complaint themes, and (c) one contrarian or underserved-segment angle.\n" +
      "Each variant's statement will be RE-SCORED by a grounded analyst with live web search on the " +
      "SAME evidence corpus, so do NOT add unverifiable superlatives ('AI-powered', 'first-ever', " +
      "'massive market') — they get fact-checked and penalized. Every statement must be a crisp 1-3 " +
      "sentence idea statement (no preamble), STRICTLY more specific than the current one: name the " +
      "exact target segment (a real 'who'), the concrete wedge, and at least one quantified or named " +
      "detail.\n" +
      "HARD RULE — never invent founder capabilities or assets (an audience, warm channels, domain " +
      "experience, partnerships, proprietary data, capital) that are not in the FOUNDER PROFILE " +
      "below: the re-scorer treats founder-asset claims missing from that profile as unverified and " +
      "caps the criteria resting on them. Improve the idea, not the founder.",
    prompt: `Idea title: ${idea?.title ?? ""}${
      idea?.goal
        ? goalContext({
            idea: { title: idea.title, prompt: "" },
            prior: {},
            goal: { bucket: idea.goal, detail: idea.goal_detail },
          })
        : ""
    }
FOUNDER PROFILE — the ONLY founder capabilities/assets that exist (see the hard rule): ${
      idea?.founder_fit?.trim()
        ? `"${idea.founder_fit.trim()}"`
        : "none provided — assume NO special founder assets."
    }
Current statement (v${version.n}): ${version.statement}
${alphas ? `\nAlpha candidates the validator already spotted (build on or beat these):\n${alphas}` : ""}
${competitors ? `\nNamed competitors and where their customers are unhappy (counter-position here):\n${competitors}` : ""}
${weak ? `\nWeakest criteria (the wedges should route around or fix these):\n${weak}` : ""}
${digest ? `\nWhat real users are saying (fetched corpus — aim wedges at these actual pains and willingness-to-pay signals):\n${digest}` : ""}

Generate 3-${MAX_WEDGES} DIVERGENT wedge variants of this idea. For each, return:
{
  "wedges": [{
    "wedge": string,      // the angle in a few words
    "statement": string,  // the full 1-3 sentence idea statement positioned around this wedge
    "label": string,      // short label for a version switcher, e.g. "Wedge: EU agencies"
    "rationale": string,  // why this wedge could win — tie it to the evidence/competitor gaps above
    "targets": string     // which weakness, pain, or competitor gap it attacks
  }]
}`,
  });

  logUsage({ ideaId: version.idea_id, versionId, kind: "wedges", model, usage });
  return { wedges: data.wedges.slice(0, MAX_WEDGES), _cost: usage.cost };
}
