import { generateText } from "../ai/client";
import { addMessage, getArtifacts, getIdea, getMessages, getVersion, logUsage } from "../db";

/**
 * Answer a founder's question about a version's analysis, grounded in the
 * artifacts already generated for it. Persists the Q&A to the chat thread.
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

  const history = getMessages(versionId)
    .slice(-8)
    .map((m) => `${m.role === "user" ? "Founder" : "Analyst"}: ${m.text}`)
    .join("\n");

  addMessage(versionId, "user", question);

  const { text, usage, model } = await generateText({
    role: "research",
    grounded: false,
    maxTokens: 1200,
    system:
      "You are the analyst who produced the idea analysis below. Answer the founder's questions about it " +
      "concisely and specifically, citing the actual figures, competitors, scores, and reasoning IN the " +
      "analysis. If the answer isn't in the analysis, say so plainly — you may then reason about it, but " +
      "flag that as your take. Don't restate the whole report; answer the question directly.",
    prompt: `Idea: "${idea?.title ?? ""}" — ${version.statement}
Founder's goal: ${idea?.goal ?? "unsure"}${idea?.goal_detail ? ` (${idea.goal_detail})` : ""}

=== THE ANALYSIS (validation, market, financials, etc.) ===
${analysis || "(no analysis generated yet)"}

${history ? `=== CONVERSATION SO FAR ===\n${history}\n\n` : ""}Founder's question: ${question}`,
  });

  addMessage(versionId, "assistant", text);
  logUsage({ ideaId: version.idea_id, versionId, kind: "ask", model, usage });
  return { answer: text, cost: usage.cost };
}
