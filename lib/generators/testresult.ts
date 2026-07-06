import { z } from "zod";
import { generateStructured } from "../ai/client";
import { getArtifact, getVersion, logUsage, saveArtifact, type Artifact } from "../db";

// Recording the kill-test's REAL-WORLD result — the loop's keystone. The founder
// reports what actually happened; the SYSTEM judges it against the thresholds that
// were pre-registered before the data came in (so the goalposts can't move after the
// fact). The judged outcome then feeds re-validation as founder context, where the
// claims audit tiers it like any other self-reported fact.

export const TestResultSchema = z.object({
  outcome: z.enum(["pass", "kill", "inconclusive"]),
  reasoning: z.string(), // one short paragraph: the reported numbers vs each bar
});

export type TestOutcome = z.infer<typeof TestResultSchema>;

// what we persist: the founder's verbatim report + the judged outcome
export type TestResultData = TestOutcome & { report: string; recorded_at: number };

type ValidationLike = {
  next_test?: {
    riskiest_assumption?: string;
    cheapest_test?: string;
    pass_threshold?: string;
    kill_threshold?: string;
  };
};

/** Judge a founder-reported test result against the pre-registered bars; persist it. */
export async function recordTestResult(versionId: string, report: string): Promise<Artifact> {
  const version = getVersion(versionId);
  if (!version) throw new Error("Version not found");
  const text = report.trim();
  if (text.length < 10) throw new Error("Describe what happened — numbers first (e.g. \"DMed 22, 4 said they'd pay, 1 card conversion\").");

  const next = (getArtifact(versionId, "validation")?.data as ValidationLike | undefined)?.next_test;
  if (!next?.pass_threshold || !next?.kill_threshold) {
    throw new Error("This version has no pre-registered kill-test to score against.");
  }

  const { data, usage, model } = await generateStructured(TestResultSchema, {
    role: "writing",
    grounded: false,
    maxTokens: 800,
    system:
      "You score a validation-test result against thresholds that were PRE-REGISTERED before " +
      "the test ran. Be strict and numeric:\n" +
      "- outcome 'pass' ONLY if the reported results clearly meet the PASS threshold.\n" +
      "- outcome 'kill' if they clearly meet the KILL threshold.\n" +
      "- otherwise 'inconclusive' — including when the report is vague, missing the numbers the " +
      "bars require, mixes anecdotes for evidence, or lands between the bars.\n" +
      "The founder's enthusiasm and framing carry zero weight; only the reported facts vs the " +
      "bars. In 'reasoning', restate the relevant numbers against each bar in 2-3 sentences.",
    prompt: `THE PRE-REGISTERED TEST:
- Test: ${next.cheapest_test ?? ""}
- PASS bar (verbatim): ${next.pass_threshold}
- KILL bar (verbatim): ${next.kill_threshold}

THE FOUNDER'S REPORT OF WHAT HAPPENED:
"${text}"

Return JSON: {"outcome": "pass"|"kill"|"inconclusive", "reasoning": string}`,
  });

  logUsage({ ideaId: version.idea_id, versionId, kind: "test_result", model, usage });
  const payload: TestResultData = { ...data, report: text, recorded_at: Date.now() };
  return saveArtifact(versionId, "test_result", payload, [], model, usage);
}
