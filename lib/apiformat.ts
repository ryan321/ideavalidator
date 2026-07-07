import { MEASURED_SCORE_SD } from "./scoring";
import type { Validation } from "./generators/validation";
import type { EvidenceCorpus } from "./evidence/types";
import type { Idea, Version } from "./db";

// The public, DOCUMENTED shape returned to API consumers. Kept deliberately flat and
// stable (the internal Validation artifact is large and UI-shaped): agents get the
// decision, the money, the one test that changes it, the moat read, and the evidence
// receipts — the fields an agent actually acts on. Adding fields is safe; renaming is a
// breaking change (the OpenAPI schema mirrors this exactly).

export type ApiValidation = ReturnType<typeof toApiValidation>;

const moatOrder = { strong: 0, plausible: 1, weak: 2, none: 3 } as const;

export function toApiValidation(
  idea: Idea,
  version: Version,
  d: Validation,
  evidence?: EvidenceCorpus | null
) {
  const bestMoat = (d.moat?.paths ?? [])
    .slice()
    .sort((a, b) => (moatOrder[a.grade] ?? 3) - (moatOrder[b.grade] ?? 3))[0];

  return {
    idea_id: idea.id,
    version_id: version.id,
    version: version.n,
    goal: idea.goal ?? null,

    verdict: d.verdict, // "GO" | "MAYBE" | "NO-GO" | "INSUFFICIENT EVIDENCE"
    score: Math.round(d.score), // 0-100, judged against the goal's bands
    score_sd: MEASURED_SCORE_SD, // ± run-to-run noise; differences within it are not signal
    confidence: d.confidence, // 0-100 evidence-backed confidence in the read
    summary: d.summary,
    painkiller: d.narrative?.verdict === "Painkiller",

    obtainable_revenue: d.demand?.obtainable_revenue ?? null,
    willingness_to_pay: d.demand?.willingness_to_pay ?? null,

    // the one pre-registered test that would change the verdict — the agent's next action
    kill_test: d.next_test
      ? {
          riskiest_assumption: d.next_test.riskiest_assumption,
          cheapest_test: d.next_test.cheapest_test,
          pass_threshold: d.next_test.pass_threshold,
          kill_threshold: d.next_test.kill_threshold,
          would_flip: d.next_test.would_flip ?? null,
          pivotal_criterion: d.next_test.pivotal_criterion ?? null,
        }
      : null,

    moat: d.moat
      ? {
          today: d.moat.today ?? null,
          strongest: bestMoat ? { type: bestMoat.type, grade: bestMoat.grade } : null,
          to_build: (d.moat.to_build ?? []).map((m) => ({ path: m.path, becomes_true: m.becomes_true })),
        }
      : null,

    criteria: (d.criteria ?? []).map((c) => ({
      name: c.name,
      group: c.group ?? null,
      band: c.band,
      score: c.score,
      explanation: c.explanation ?? null,
    })),

    strengths: [...(d.go_signals?.key_strengths ?? []), ...(d.go_signals?.positive_signals ?? [])]
      .slice(0, 5)
      .map((s) => s.text),
    risks: [...(d.stop_signals?.critical_risks ?? []), ...(d.stop_signals?.areas_of_concern ?? [])]
      .slice(0, 5)
      .map((s) => s.text),

    competitors: (d.market?.competitors ?? []).map((c) => ({
      name: c.name,
      note: c.note ?? null,
      complaint_theme: c.complaint_theme ?? null,
      your_edge: c.your_edge ?? null,
    })),
    market_size: d.market?.sizing
      ? {
          tam: d.market.sizing.tam?.value ?? null,
          sam: d.market.sizing.sam?.value ?? null,
          som: d.market.sizing.som?.value ?? null,
          cagr_pct: d.market.cagr_pct ?? null,
        }
      : null,

    possible_alphas: (d.possible_alphas ?? []).map((a) => ({ alpha: a.alpha, rationale: a.rationale })),

    // the receipts: real fetched posts behind the demand read (never model-asserted)
    evidence: evidence
      ? {
          count: evidence.items.length,
          sources: evidence.stats.source_counts ?? {},
          top_signals: evidence.items.slice(0, 5).map((i) => ({
            quote: i.quote,
            url: i.url,
            source: i.source,
            tier: i.tier ?? null,
            wtp_signal: i.wtp_signal,
          })),
        }
      : null,
  };
}
