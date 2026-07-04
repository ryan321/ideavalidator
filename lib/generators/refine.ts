import { z } from "zod";
import { generateStructured } from "../ai/client";
import { getArtifact, getEvidence, getIdea, getVersion, logUsage } from "../db";
import { corpusDigest } from "../evidence";
import { goalContext } from "./shared";

export const RefinementSchema = z.object({
  statement: z.string(), // the rewritten idea statement (same crisp 1-3 sentence format)
  label: z.string(), // short label, e.g. "Narrowed to SaaS lead-qual vertical"
  rationale: z.string(), // why this should score higher / de-risk
  changes: z
    .array(z.object({ change: z.string(), targets: z.string() }))
    .min(1), // what changed and which weakness/risk/criterion it addresses
  expected_effect: z.string(),
});

export type Refinement = z.infer<typeof RefinementSchema>;

type ValidationLike = {
  score?: number;
  criteria?: { name: string; score: number; group?: string; explanation?: string }[];
  stop_signals?: {
    critical_risks?: { text: string }[];
    areas_of_concern?: { text: string }[];
  };
  risk_matrix?: { title: string; probability: number; impact: number }[];
};

/**
 * Propose a refined idea statement for a version, attacking its lowest-scoring
 * criteria and highest risks. Does NOT create a version — returns the proposal.
 */
export async function proposeRefinement(
  versionId: string
): Promise<Refinement & { _cost: number }> {
  const version = getVersion(versionId);
  if (!version) throw new Error("Version not found");
  const idea = getIdea(version.idea_id);

  const validation = getArtifact(versionId, "validation")?.data as ValidationLike | undefined;

  // Refiner isolation: the refiner sees the weakest criteria NAMES + the validator's
  // explanations (plus stop signals + the corpus digest) — never the numeric scores,
  // band definitions, weights, or anchor panel. It must fix substance it can't game.
  const evidence = validation
    ? `Weakest criteria to attack (worst first — the criterion name and WHY the validator found it weak):
${(validation.criteria ?? [])
        .slice()
        .sort((a, b) => a.score - b.score)
        .slice(0, 4)
        .map((c) => `  - ${c.name}: ${c.explanation ?? ""}`)
        .join("\n")}
Critical risks: ${(validation.stop_signals?.critical_risks ?? []).map((r) => r.text).join("; ")}
Concerns: ${(validation.stop_signals?.areas_of_concern ?? []).map((r) => r.text).join("; ")}
Top risk-matrix items: ${(validation.risk_matrix ?? [])
        .slice()
        .sort((a, b) => b.probability * b.impact - a.probability * a.impact)
        .slice(0, 3)
        .map((r) => r.title)
        .join("; ")}`
    : "No validation has been run yet; refine for clarity, focus, and defensibility.";

  // What real users actually said (fetched Reddit/HN corpus) — so the refinement
  // attacks weaknesses with real evidence, not just the prior JSON.
  const corpus = getEvidence(versionId);
  const digest = corpus ? corpusDigest(corpus) : "";

  const { data, usage, model } = await generateStructured(RefinementSchema, {
    role: "scoring",
    grounded: false,
    maxTokens: 2500,
    system:
      "You are a startup strategist who sharpens ideas to score higher and carry less risk. " +
      "Keep the SAME core idea — do not pivot to an unrelated concept (no jumping from a consumer app to " +
      "a B2B workflow tool). Improve the idea's SUBSTANCE — a sharper target segment, a clearer wedge, " +
      "concrete defensibility — not just its wording.\n" +
      "Your refined statement will be RE-SCORED by a grounded analyst with live web search, so do NOT add " +
      "unverifiable superlatives ('AI-powered', 'first-ever', 'massive market') to inflate perception — " +
      "they get fact-checked and penalized. All criteria are scored high=favorable: a low 'Competitive " +
      "Position' or 'Acquisition Ease' means a crowded/contested market or a hard sell, and the fix is a " +
      "sharper differentiator/wedge (a niche, proprietary data, a hard-to-copy workflow, or being the " +
      "trusted alternative) plus an easier go-to-market — NOT adding competitors or barriers.\n" +
      "HARD RULE — never invent founder capabilities or assets (an audience, warm channels, domain " +
      "experience, partnerships, proprietary data, capital) that are not in the FOUNDER PROFILE below: " +
      "the re-scorer treats founder-asset claims missing from that profile as unverified, caps the " +
      "criteria resting on them, and asks the founder to confirm — an invented asset LOWERS the score. " +
      "Improve the idea, not the founder.\n" +
      "Make the SMALLEST change set that lifts the weakest criteria; if a prior refinement hurt a " +
      "criterion, prefer reverting that specific aspect. The refined 'statement' must be a crisp 1-3 " +
      "sentence idea statement in the same format as the input (no preamble), and STRICTLY more specific " +
      "than the current one — name the exact target segment (a real 'who', not 'businesses'), the concrete " +
      "wedge, and at least one quantified or named detail. Never restate the idea in vaguer or broader terms.\n" +
      "Refine TOWARD the founder's goal (below) and hunt for the ALPHA: the specific differentiator, niche, " +
      "angle, or positioning (incl. simply being the credible alternative to a dominant incumbent for a " +
      "disaffected segment) that would most raise the OBTAINABLE REVENUE for that goal — ideally aimed where " +
      "the incumbents' customers are unhappy or underserved.",
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

Validation evidence to improve against:
${evidence}
${digest ? `\nWhat real users are saying (fetched from Reddit/Hacker News — aim the refinement at these actual pains and willingness-to-pay signals):\n${digest}\n` : ""}
Rewrite the idea statement to raise the overall validation score and reduce the top risks, while
keeping the same core idea. Ask yourself: what ALPHA (differentiator/niche/angle/positioning) would most
raise the obtainable revenue for this founder's goal? Return JSON:
{
  "statement": string,            // the improved 1-3 sentence idea statement
  "label": string,                // short label describing the change
  "rationale": string,            // why it should score higher / de-risk
  "changes": [{"change": string, "targets": string}],  // each change + which weakness/risk it addresses
  "expected_effect": string
}`,
  });

  logUsage({ ideaId: version.idea_id, versionId, kind: "refine", model, usage });
  return { ...data, _cost: usage.cost };
}
