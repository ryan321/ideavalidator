import { z } from "zod";
import { generateStructured } from "../ai/client";
import { getArtifact, getIdea, getVersion } from "../db";

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
  action_plan?: { title: string; first_step?: string }[];
};

// Criteria whose scale is inverted (high score = LESS competition / EASIER entry).
const INVERTED = new Set(["Competition Level", "Market Entry Barriers"]);

/**
 * Propose a refined idea statement for a version, attacking its lowest-scoring
 * criteria and highest risks. Does NOT create a version — returns the proposal.
 */
export async function proposeRefinement(versionId: string): Promise<Refinement> {
  const version = getVersion(versionId);
  if (!version) throw new Error("Version not found");
  const idea = getIdea(version.idea_id);

  const validation = getArtifact(versionId, "validation")?.data as ValidationLike | undefined;
  const market = getArtifact(versionId, "market")?.data;

  const evidence = validation
    ? `Current overall score: ${validation.score ?? "?"}/100.
Lowest-scoring criteria to attack (each: score — why it's low):
${(validation.criteria ?? [])
        .slice()
        .sort((a, b) => a.score - b.score)
        .slice(0, 4)
        .map(
          (c) =>
            `  - ${c.name} (${c.score})${
              INVERTED.has(c.name) ? " [inverted: low score = crowded market / high barriers]" : ""
            }: ${c.explanation ?? ""}`
        )
        .join("\n")}
Critical risks: ${(validation.stop_signals?.critical_risks ?? []).map((r) => r.text).join("; ")}
Concerns: ${(validation.stop_signals?.areas_of_concern ?? []).map((r) => r.text).join("; ")}
Top risk-matrix items: ${(validation.risk_matrix ?? [])
        .slice()
        .sort((a, b) => b.probability * b.impact - a.probability * a.impact)
        .slice(0, 3)
        .map((r) => r.title)
        .join("; ")}
Already-recommended actions (build on these, don't just repeat them): ${(validation.action_plan ?? [])
        .map((a) => a.title)
        .join("; ")}`
    : "No validation has been run yet; refine for clarity, focus, and defensibility.";

  const marketCtx = market
    ? `\n\nMarket context (competitors/gaps) for reference:\n${JSON.stringify(market).slice(0, 2500)}`
    : "";

  const { data } = await generateStructured(RefinementSchema, {
    role: "reasoning",
    grounded: false,
    maxTokens: 2500,
    system:
      "You are a startup strategist who sharpens ideas to score higher and carry less risk. " +
      "Keep the SAME core idea — do not pivot to an unrelated concept (no jumping from a consumer app to " +
      "a B2B workflow tool). Improve the idea's SUBSTANCE — a sharper target segment, a clearer wedge, " +
      "concrete defensibility — not just its wording.\n" +
      "Your refined statement will be RE-SCORED by a grounded analyst with live web search, so do NOT add " +
      "unverifiable superlatives ('AI-powered', 'first-ever', 'massive market') to inflate perception — " +
      "they get fact-checked and penalized. For the inverted criteria (Competition Level, Market Entry " +
      "Barriers) a low score means a crowded/contested market: the fix is sharper differentiation and a " +
      "defensible wedge (a niche, proprietary data, a hard-to-copy workflow) — NOT adding competitors or " +
      "barriers. Make the SMALLEST change set that lifts the lowest criteria; if a prior refinement hurt a " +
      "criterion, prefer reverting that specific aspect. The refined 'statement' must be a crisp 1-3 " +
      "sentence idea statement in the same format as the input (no preamble), and STRICTLY more specific " +
      "than the current one — name the exact target segment (a real 'who', not 'businesses'), the concrete " +
      "wedge, and at least one quantified or named detail. Never restate the idea in vaguer or broader terms.",
    prompt: `Idea title: ${idea?.title ?? ""}
Current statement (v${version.n}): ${version.statement}

Validation evidence to improve against:
${evidence}${marketCtx}

Rewrite the idea statement to raise the overall validation score and reduce the top risks, while
keeping the same core idea. Return JSON:
{
  "statement": string,            // the improved 1-3 sentence idea statement
  "label": string,                // short label describing the change
  "rationale": string,            // why it should score higher / de-risk
  "changes": [{"change": string, "targets": string}],  // each change + which weakness/risk it addresses
  "expected_effect": string
}`,
  });

  return data;
}
