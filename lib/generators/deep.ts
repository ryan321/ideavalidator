// Wave 3 — DEEP VALIDATION MODE (opt-in, gated; ~3–4× the cost of a standard run).
//
// A standard validation fires k self-consistency samples of ONE scorer and medians them.
// Deep mode instead runs an adversarial dual-pass reconciled by a judge, then verifies the
// load-bearing claims:
//
//   1. BULL memo  — an independent, FRESH-context call building the STRONGEST evidence-based
//      case FOR the idea (cites corpus [E#] ids + web; asserts nothing it can't support).
//   2. BEAR memo  — independent, FRESH context, the strongest case AGAINST (incorporates a
//      pre-mortem); same citation discipline.
//   3. RECONCILE  — the scoring pass (this REPLACES the k-sample scorer in deep mode, run k=1)
//      sees BOTH memos + the corpus and the rule "the side citing RETRIEVED evidence wins;
//      unsupported assertions lose; where the memos agree that's high-confidence; where they
//      conflict without evidence, widen uncertainty". It emits the full ValidationElicitSchema
//      exactly as the standard scorer does.
//   4. CoVe      — a factored-verification pass on the WRITING model: extract the 5–10
//      LOAD-BEARING claims (the ones most responsible for the high bands) and judge each
//      supported | contradicted | not_in_evidence STRICTLY against the corpus + fetched
//      sources. finalizeValidation discounts each affected criterion.
//
// Per-step failure is graceful (never hard-fails the whole run on an aux step):
//   - bull OR bear fails      → proceed with the survivor + a system_adjustment note.
//   - reconcile fails         → the caller falls back to a standard k=1 scoring run + a note.
//   - CoVe fails              → skip discounting + a note.

import { z } from "zod";
import { generateStructured, generateText, type Source } from "../ai/client";
import { logUsage } from "../db";
import type { EvidenceCorpus } from "../evidence";
import { evidencePromptBlock } from "../evidence";
import type { Generator } from "./shared";
import {
  CoveClaimSchema,
  ValidationElicitSchema,
  type CoveClaim,
  type SystemAdjustment,
  type ValidationElicited,
} from "./validation";

type Usage = { prompt_tokens: number; completion_tokens: number; cost: number };

export type DeepResult = {
  elicited: ValidationElicited;
  sources: Source[];
  model: string;
  usage: Usage;
  bullMemo: string | null;
  bearMemo: string | null;
  cove: CoveClaim[] | null;
};

const CITATION_DISCIPLINE =
  "CITATION DISCIPLINE: cite specific evidence for every load-bearing claim — corpus items by their " +
  "[E#] id (from the EVIDENCE section) and web sources by domain (issue web searches; name the domain " +
  'inline, e.g. "(grandviewresearch.com, 2024)"). Assert NOTHING you cannot support with a retrieved ' +
  "source or a corpus item; an unsupported assertion is worse than a hedge. Be specific, quantitative, " +
  "and terse — this is read by a busy analyst.";

/**
 * Run the full deep-validation orchestration. `fullPrompt` is the SAME assembled scoring
 * prompt the standard path builds (claims brief + goal + founder + evidence block + steer),
 * so all four steps share one claims brief + corpus. Returns the reconciled elicited result
 * plus the memos and CoVe ledger to store; the caller finalizes (CoVe discount lives there).
 *
 * Throws only if RECONCILE itself fails after the memos — the caller catches and falls back to
 * a standard k=1 run. Bull/bear/CoVe failures are absorbed into `adj` and never throw.
 */
export async function runDeepValidation(
  def: Generator,
  fullPrompt: string,
  corpus: EvidenceCorpus | null,
  adj: SystemAdjustment[],
  ids: { ideaId: string; versionId: string }
): Promise<DeepResult> {
  const usage: Usage = { prompt_tokens: 0, completion_tokens: 0, cost: 0 };
  const addUsage = (u: Usage) => {
    usage.prompt_tokens += u.prompt_tokens;
    usage.completion_tokens += u.completion_tokens;
    usage.cost += u.cost;
  };

  // 1 + 2: the two memos, in FRESH contexts (their own system prompts), in parallel.
  const [bullSettled, bearSettled] = await Promise.allSettled([
    memo("bull", def, fullPrompt),
    memo("bear", def, fullPrompt),
  ]);

  let bullMemo: string | null = null;
  let bearMemo: string | null = null;
  if (bullSettled.status === "fulfilled") {
    bullMemo = bullSettled.value.text;
    addUsage(bullSettled.value.usage);
    logUsage({ ideaId: ids.ideaId, versionId: ids.versionId, kind: "deep_bull", model: bullSettled.value.model, usage: bullSettled.value.usage });
  } else {
    adj.push({
      rule: "deep-bull-failed",
      detail: `The BULL memo (strongest case FOR) failed (${errMsg(bullSettled.reason)}); reconciliation proceeded with the bear memo only.`,
    });
  }
  if (bearSettled.status === "fulfilled") {
    bearMemo = bearSettled.value.text;
    addUsage(bearSettled.value.usage);
    logUsage({ ideaId: ids.ideaId, versionId: ids.versionId, kind: "deep_bear", model: bearSettled.value.model, usage: bearSettled.value.usage });
  } else {
    adj.push({
      rule: "deep-bear-failed",
      detail: `The BEAR memo (strongest case AGAINST) failed (${errMsg(bearSettled.reason)}); reconciliation proceeded with the bull memo only.`,
    });
  }

  // 3: RECONCILE — the scoring pass, k=1, given both memos + the rule. Throws on failure
  // (the caller falls back to a standard run). The memos are appended to the shared prompt.
  const reconcilePrompt = fullPrompt + reconcileBlock(bullMemo, bearMemo);
  const reconciled = await generateStructured(ValidationElicitSchema, {
    role: def.role,
    grounded: def.grounded,
    webMaxResults: def.webMaxResults,
    maxTokens: def.maxTokens,
    system: def.system + RECONCILE_SYSTEM,
    prompt: reconcilePrompt,
  });
  addUsage(reconciled.usage);
  logUsage({ ideaId: ids.ideaId, versionId: ids.versionId, kind: "deep_reconcile", model: reconciled.model, usage: reconciled.usage });
  const elicited = reconciled.data;

  // 4: CoVe — factored verification of the load-bearing claims on the WRITING model.
  // Never throws — a failure just skips discounting with a note.
  let cove: CoveClaim[] | null = null;
  try {
    const c = await runCove(elicited, corpus, reconciled.sources);
    cove = c.claims;
    addUsage(c.usage);
    logUsage({ ideaId: ids.ideaId, versionId: ids.versionId, kind: "deep_cove", model: c.model, usage: c.usage });
  } catch (e) {
    adj.push({
      rule: "cove-failed",
      detail: `Chain-of-verification (load-bearing-claim check) failed (${errMsg(e)}); no CoVe discount was applied to this run.`,
    });
  }

  return {
    elicited,
    sources: reconciled.sources,
    model: reconciled.model,
    usage,
    bullMemo,
    bearMemo,
    cove,
  };
}

// ---- bull / bear memos --------------------------------------------------------------

async function memo(
  side: "bull" | "bear",
  def: Generator,
  fullPrompt: string
): Promise<{ text: string; model: string; usage: Usage }> {
  const system =
    side === "bull"
      ? "You are the BULL analyst in an adversarial validation. Build the STRONGEST possible EVIDENCE-BASED " +
        "case FOR this idea succeeding — the most persuasive true argument a smart advocate would make. " +
        CITATION_DISCIPLINE +
        " Do NOT be a cheerleader: every point must rest on a real corpus item or retrieved source. If the " +
        "strongest honest case is weak, say so — a bull memo that overstates loses to the bear at reconciliation."
      : "You are the BEAR analyst in an adversarial validation. Build the STRONGEST possible EVIDENCE-BASED " +
        "case AGAINST this idea — the most persuasive true argument a skeptical investor would make. Lead with " +
        "a PRE-MORTEM (it is 18 months later and this failed — the specific, likely causes of death for THIS " +
        "idea) and then the disconfirming evidence. " +
        CITATION_DISCIPLINE +
        " Attack the load-bearing assumptions, not generic startup risks; a bear memo of boilerplate loses to a bull that cites real evidence.";
  const prompt =
    fullPrompt +
    `\n\n=== YOUR TASK (${side.toUpperCase()} MEMO) ===\n` +
    (side === "bull"
      ? "Write the strongest evidence-based case FOR this idea. ~6-10 tight bullets grouped as: DEMAND & WTP, " +
        "MARKET & TIMING, THE FOUNDER'S EDGE, and WHY THE OBVIOUS OBJECTIONS ARE BEATABLE. Cite [E#]/domains throughout. " +
        "Do not score anything — this is a memo, not a rubric."
      : "Write the strongest evidence-based case AGAINST this idea. Start with a 3-5 bullet PRE-MORTEM, then " +
        "~6-10 tight bullets grouped as: WEAK/ABSENT DEMAND, WTP & UNIT ECONOMICS, COMPETITION & MOAT, and " +
        "TIMING/EXECUTION RISK. Cite [E#]/domains throughout. Do not score anything — this is a memo, not a rubric.");
  const { text, usage, model } = await generateText({
    role: def.role,
    grounded: def.grounded,
    maxTokens: 2000,
    system,
    prompt,
  });
  if (!text.trim()) throw new Error("empty memo");
  return { text, model, usage };
}

// ---- reconcile ----------------------------------------------------------------------

const RECONCILE_SYSTEM =
  "\n\nADVERSARIAL RECONCILIATION — this run includes a BULL memo (the strongest case FOR) and a BEAR memo " +
  "(the strongest case AGAINST), both appended below. Reconcile them under these rules, then score exactly as " +
  "instructed: (1) THE SIDE CITING RETRIEVED EVIDENCE WINS — a claim backed by a corpus [E#] item or a named " +
  "web source beats an unsupported assertion from the other side, regardless of which memo made it. (2) Where " +
  "the memos AGREE, treat that as high-confidence and let the bands reflect it. (3) Where they CONFLICT and " +
  "neither cites decisive evidence, do NOT split the difference — widen the uncertainty (band that criterion " +
  "more conservatively and lower your confidence self-report). Ignore rhetorical force; weigh only evidence.";

function reconcileBlock(bull: string | null, bear: string | null): string {
  const parts: string[] = [];
  if (bull) parts.push(`=== BULL MEMO (strongest case FOR) ===\n${bull}`);
  if (bear) parts.push(`=== BEAR MEMO (strongest case AGAINST) ===\n${bear}`);
  if (!parts.length) {
    return "\n\n(Both adversarial memos failed to generate; score the evidence directly and note the reduced rigor in your confidence.)";
  }
  return "\n\n" + parts.join("\n\n") + "\n\n(Reconcile these per the reconciliation rules in the system message, then produce your scored JSON.)";
}

// ---- CoVe: chain-of-verification of the load-bearing claims -------------------------

const CoveElicitSchema = z.object({
  // .catch([]) is only meant to survive a non-array / junk field, not to WIPE an otherwise
  // valid ledger when the model overruns the prompt's 5–10 ask. Keep the bound generous
  // (well above the ask) and drop the min so a 13-claim response isn't silently discarded.
  claims: z.array(CoveClaimSchema).max(30).catch([]),
});

async function runCove(
  elicited: ValidationElicited,
  corpus: EvidenceCorpus | null,
  sources: Source[]
): Promise<{ claims: CoveClaim[]; model: string; usage: Usage }> {
  // Feed the reconciled scorecard (criterion → band + explanation) + the corpus so the
  // verifier can extract the load-bearing claims and judge each against the evidence.
  const scorecard = elicited.criteria
    .map((c) => `- ${c.name} [${c.band}]: ${c.explanation}`)
    .join("\n");
  const evidenceBlock = corpus ? evidencePromptBlock(corpus) : "\n\n(No evidence corpus was available.)";
  const webList = sources.length
    ? `\n\nWEB SOURCES cited in the scoring pass:\n${sources.map((s) => `- ${s.title} (${s.url})`).join("\n")}`
    : "\n\n(No web sources were cited in the scoring pass.)";

  const { data, model, usage } = await generateStructured(CoveElicitSchema, {
    role: "writing",
    grounded: false,
    maxTokens: 1800,
    temperature: 0.1,
    system:
      "You are a fact-checker verifying a startup analysis. You are given a scored SCORECARD (each criterion's " +
      "band + rationale) and the EVIDENCE it was supposed to rest on (a corpus of fetched Reddit/HN posts + a " +
      "list of cited web sources). Extract the 5-10 LOAD-BEARING factual claims — the specific, checkable " +
      "assertions MOST responsible for the HIGH bands (a claim about demand, pricing, a competitor, a market " +
      "figure, a trend). For EACH, judge its status STRICTLY against the provided evidence ONLY (do not use " +
      "outside knowledge, do not search): 'supported' = a corpus item or a cited source directly backs it; " +
      "'contradicted' = the evidence directly cuts against it; 'not_in_evidence' = the evidence neither " +
      "supports nor refutes it (an assertion with no backing in what was retrieved). Be strict: plausibility " +
      "is NOT support. For each claim also name the exact criterion it underpins (from the scorecard names) or " +
      '"" if none, and a one-line note. Return { \"claims\": [{ claim, criterion, status, note }] }.',
    prompt:
      `SCORECARD (criterion [band]: rationale):\n${scorecard}\n${evidenceBlock}${webList}\n\n` +
      `Extract the 5-10 load-bearing factual claims most responsible for the high bands and verify each strictly against the evidence above. ` +
      `Return JSON: {"claims": [{"claim": string, "criterion": string, "status": "supported"|"contradicted"|"not_in_evidence", "note": string}]}`,
  });
  return { claims: data.claims, model, usage };
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
