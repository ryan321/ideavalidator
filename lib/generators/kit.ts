import { z } from "zod";
import { generateStructured } from "../ai/client";
import { getArtifact, getEvidence, getIdea, getVersion, logUsage, saveArtifact, type Artifact } from "../db";

// The Kill-Test Execution Kit: turns the validation's next_test (riskiest assumption +
// cheapest test + PRE-REGISTERED pass/kill thresholds) into a ready-to-run field kit —
// non-leading interview questions, green/red signals mapped to those exact thresholds,
// outreach copy for the named channel, and an anti-bias checklist. The report states
// the protocol; the kit is how a founder actually runs it this week. Cheap fast-model
// call (role "writing") — it's disciplined copywriting over the existing analysis, not
// new judgment, and it must not move any score.

export const KitSchema = z.object({
  who: z.string(), // exactly who to talk to (role/situation, from the narrative + test)
  where: z.array(z.string()).min(1), // named channels — REAL corpus communities first
  questions: z.array(z.string()).min(4), // non-leading, past-behavior Mom-Test questions
  green_signals: z.array(z.string()).min(2), // answers/behaviors that COUNT toward the pass threshold
  red_signals: z.array(z.string()).min(2), // responses that COUNT toward the kill threshold
  anti_bias: z.array(z.string()).min(3), // rules that keep the data honest
  outreach: z.object({
    dm: z.string(), // short DM / comment for the named community (asks about the pain, no pitch)
    email: z.string(), // cold-email variant, subject line included
    forum_post: z.string(), // a post asking about the problem — Mom-Test style, not a launch post
  }),
  tally: z.string(), // how to score the run against the pre-registered thresholds, verbatim
});

export type Kit = z.infer<typeof KitSchema>;

type ValidationLike = {
  next_test?: {
    riskiest_assumption?: string;
    cheapest_test?: string;
    pass_threshold?: string;
    kill_threshold?: string;
  };
  narrative?: { who?: string; pain?: string; status_quo?: string };
};

/** Generate + persist the execution kit for a version's kill-test. */
export async function generateKit(versionId: string): Promise<Artifact> {
  const version = getVersion(versionId);
  if (!version) throw new Error("Version not found");
  const idea = getIdea(version.idea_id);

  const validation = getArtifact(versionId, "validation")?.data as ValidationLike | undefined;
  const next = validation?.next_test;
  if (!next?.riskiest_assumption || !next?.cheapest_test) {
    throw new Error("Run a validation first — the kit is built from its kill-test.");
  }

  // Real places this buyer already talks — the corpus communities. The kit must
  // recommend channels we actually found evidence in, not asserted hangouts.
  const corpus = getEvidence(versionId);
  const communities = corpus?.stats.communities ?? [];

  const { data, usage, model } = await generateStructured(KitSchema, {
    role: "writing",
    grounded: false,
    maxTokens: 3000,
    system:
      "You write field kits for founders running a Mom-Test style validation sprint. The kit " +
      "operationalizes ONE pre-registered kill-test: the founder must be able to run it this week " +
      "and honestly tally the result against thresholds that were fixed BEFORE the data came in.\n" +
      "RULES:\n" +
      "- Questions probe PAST BEHAVIOR and specifics ('walk me through the last time…', 'what did " +
      "that cost you…', 'show me how you do it today') — never opinions about the idea, never " +
      "'would you use/pay for…'. The idea itself is NOT pitched during the interview.\n" +
      "- green_signals and red_signals must map DIRECTLY onto the pre-registered pass/kill " +
      "thresholds — they are the unit of tally, phrased so two different people scoring the same " +
      "conversation would agree. Compliments, 'sounds cool', and hypothetical enthusiasm are " +
      "NEVER green signals.\n" +
      "- Outreach copy asks about the PROBLEM, not the product: no pitch, no waitlist link, no " +
      "'I'm building X' in the forum post (the DM/email may say one line of who you are). It must " +
      "fit the norms of the named community — write like a member, not a marketer.\n" +
      "- 'where' lists the named test channel and the real communities provided — never invent " +
      "channels that weren't provided unless the test itself names one.\n" +
      "- 'tally' restates the pass and kill thresholds VERBATIM and says exactly how to count " +
      "green/red signals toward them, including the sample size and the one-week timebox.",
    prompt: `Idea statement (v${version.n}): ${version.statement}
${idea?.goal ? `Founder goal: ${idea.goal}${idea.goal_detail ? ` — ${idea.goal_detail}` : ""}` : ""}

THE KILL-TEST (pre-registered — the kit operationalizes exactly this):
- Riskiest assumption: ${next.riskiest_assumption}
- Cheapest test: ${next.cheapest_test}
- PASS threshold (verbatim): ${next.pass_threshold ?? ""}
- KILL threshold (verbatim): ${next.kill_threshold ?? ""}

Who the buyer is (from the validated narrative): ${validation?.narrative?.who ?? "see statement"}
The pain: ${validation?.narrative?.pain ?? ""}
How they cope today: ${validation?.narrative?.status_quo ?? ""}
Real communities where we actually FOUND evidence (prefer these for 'where' and outreach): ${
      communities.length ? communities.join(", ") : "none fetched — use the channel the cheapest test names"
    }

Return JSON EXACTLY in this shape (every key required, outreach nested exactly like this):
{
  "who": string,
  "where": [string, ...],
  "questions": [string, ...],          // 5-7 questions
  "green_signals": [string, ...],      // 3-5
  "red_signals": [string, ...],        // 3-5
  "anti_bias": [string, ...],          // 3-5
  "outreach": { "dm": string, "email": string, "forum_post": string },
  "tally": string
}`,
  });

  logUsage({ ideaId: version.idea_id, versionId, kind: "kit", model, usage });
  return saveArtifact(versionId, "kit", data, [], model, usage);
}
