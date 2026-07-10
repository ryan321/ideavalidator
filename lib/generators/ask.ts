import { generateText } from "../ai/client";
import { addMessage, getArtifacts, getIdea, getMessages, getVersion, logUsage } from "../db";

/**
 * Conversational Q&A about a version's analysis. Grounded in already-generated
 * artifacts; does NOT re-score or re-run validation. Persists the thread.
 */
export async function answerQuestion(
  versionId: string,
  question: string
): Promise<{ answer: string; cost: number }> {
  const version = getVersion(versionId);
  if (!version) throw new Error("Version not found");
  const idea = getIdea(version.idea_id);

  const analysis = getArtifacts(versionId)
    .map((a) => `### ${a.kind}\n${JSON.stringify(a.data)}`)
    .join("\n\n")
    .slice(0, 60000);

  // Prior turns only (before this question). Cap so context stays lean.
  const prior = getMessages(versionId)
    .slice(-12)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.text,
    }));

  addMessage(versionId, "user", question);

  const goalLine = `Founder's goal: ${idea?.goal ?? "unsure"}${
    idea?.goal_detail ? ` (${idea.goal_detail})` : ""
  }`;

  const system =
    `You are a sharp product analyst chatting with the founder about a validation report you already wrote. ` +
    `This is a conversation — answer their message directly, in chat style.\n\n` +
    `RULES:\n` +
    `- Answer the question they asked. Do NOT produce a new validation report, re-score criteria, rewrite the verdict, or re-run the analysis.\n` +
    `- Cite specific figures, competitors, scores, and reasoning that appear IN the report below when relevant.\n` +
    `- If the answer isn't in the report, say so plainly, then give a short reasoned take and flag it as your take — not as a new formal analysis.\n` +
    `- Keep replies tight: a few short paragraphs or bullets. No executive summary, no full scorecard, no "here's a re-evaluation".\n` +
    `- Use prior turns for context; don't restate the whole report or re-introduce yourself every time.\n` +
    `- If they share new facts (skills, network, constraints), acknowledge them and discuss implications — do not pretend you re-validated the idea.\n\n` +
    `Idea: "${idea?.title ?? ""}" — ${version.statement}\n` +
    `${goalLine}\n\n` +
    `=== VALIDATION REPORT (read-only context — do not regenerate) ===\n` +
    `${analysis || "(no analysis generated yet)"}`;

  const { text, usage, model } = await generateText({
    role: "writing",
    grounded: false,
    maxTokens: 900,
    temperature: 0.5,
    system,
    messages: [...prior, { role: "user", content: question }],
  });

  addMessage(versionId, "assistant", text);
  logUsage({ ideaId: version.idea_id, versionId, kind: "ask", model, usage });
  return { answer: text, cost: usage.cost };
}
