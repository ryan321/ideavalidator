import { z } from "zod";
import { generateStructured, type Source } from "../ai/client";
import {
  Artifact,
  ArtifactKind,
  getArtifacts,
  getEvidence,
  getIdea,
  getVersion,
  logUsage,
  saveArtifact,
  setVersionRevenue,
  setVersionScore,
} from "../db";
import { collectEvidence, evidencePromptBlock, type EvidenceCorpus } from "../evidence";
import {
  GATES,
  bandScore,
  criterionWeight,
  demandStrengthLabel,
  normalizeGoal,
  scoringSamples,
  verdictBands,
} from "../scoring";
import { ClaimsAudit, Generator, GenContext, steerContext } from "./shared";
import {
  ClaimSchema,
  validationGenerator,
  type SystemAdjustment,
  type Validation,
  type ValidationCriterion,
  type ValidationElicited,
} from "./validation";

export const GENERATORS: Record<ArtifactKind, Generator> = {
  validation: validationGenerator as Generator,
};

// Display/run order for the dashboard.
export const KIND_ORDER: ArtifactKind[] = ["validation"];

export type GeneratorMeta = {
  kind: ArtifactKind;
  label: string;
  blurb: string;
  grounded: boolean;
  uses: ArtifactKind[];
};

export function generatorMeta(): GeneratorMeta[] {
  return KIND_ORDER.map((kind) => {
    const g = GENERATORS[kind];
    return {
      kind,
      label: g.label,
      blurb: g.blurb,
      grounded: g.grounded,
      uses: g.uses ?? [],
    };
  });
}

/** Run one generator for a version, persist the artifact, and return it. */
export async function runGenerator(
  versionId: string,
  kind: ArtifactKind,
  opts?: { steer?: string | null }
): Promise<Artifact> {
  const version = getVersion(versionId);
  if (!version) throw new Error("Version not found");
  const idea = getIdea(version.idea_id);
  if (!idea) throw new Error("Idea not found");

  const def = GENERATORS[kind];
  if (!def) throw new Error(`Unknown generator: ${kind}`);

  const prior: GenContext["prior"] = {};
  for (const a of getArtifacts(versionId)) prior[a.kind] = a.data;

  const ctx: GenContext = {
    idea: { title: idea.title, prompt: version.statement },
    prior,
    context: version.context,
    goal: idea.goal ? { bucket: idea.goal, detail: idea.goal_detail } : null,
    steer: opts?.steer ?? null,
    founderFit: idea.founder_fit,
  };

  // Validation is grounded in the fetched evidence corpus (real Reddit/HN posts):
  // collect it once per version, then inject it as numbered [E1..En] items the
  // model must cite by id.
  let corpus: EvidenceCorpus | null = null;
  // Adjustments accumulated BEFORE the scoring call (claims-brief fallback) — the
  // recompute appends the gate/lint notes and the whole list lands on the artifact.
  const adjustments: SystemAdjustment[] = [];
  if (kind === "validation") {
    corpus = getEvidence(versionId) ?? (await collectEvidence(versionId));

    // The next_test's cheapest_test must name a channel from the corpus's own
    // communities — hand them to the prompt builder.
    ctx.corpusCommunities = corpus?.stats.communities ?? null;

    // Sycophancy firewall: a fast-model pre-pass rewrites the pitch into a neutral
    // third-person claims brief + a typed, evidence-tiered claim ledger; the scorer
    // judges the audit, not the enthusiasm.
    try {
      const audit = await generateClaimsAudit(ctx);
      ctx.claimsAudit = audit.audit;
      logUsage({ ideaId: version.idea_id, versionId, kind: "claims_brief", model: audit.model, usage: audit.usage });
    } catch (e) {
      ctx.claimsAudit = null;
      adjustments.push({
        rule: "claims-brief-fallback",
        detail: `Neutral claims-audit pre-pass failed (${e instanceof Error ? e.message : String(e)}); the scorer saw the founder's raw statement — sycophancy stripping was NOT applied to this run.`,
      });
    }
  }

  // Steer is appended generically so it works for every generator without each
  // one having to opt in. The full prompt (identical across the k scoring samples) is
  // built once so the samples share a cache-friendly prefix.
  const fullPrompt =
    def.buildPrompt(ctx) +
    (corpus ? evidencePromptBlock(corpus) : "") +
    steerContext(ctx, prior[kind]);

  // k=scoringSamples() self-consistency (validation only): fire k parallel scoring
  // calls, then reduce them to one elicited result (per-criterion median band-scores,
  // spread flags) plus the overall-agreement confidence delta. k=1 collapses to a
  // single call with none of that machinery — see runScoringSamples.
  const k = kind === "validation" ? scoringSamples() : 1;
  const { elicited, sources, model, usage, agreement } = await runScoringSamples(def, fullPrompt, k, adjustments);

  let data: unknown = elicited;
  if (kind === "validation") {
    // Bands → numbers, weighted recompute, non-compensatory gates, derived
    // sub-scores, consistency lint — everything the prompt promises, enforced.
    const v = finalizeValidation(elicited as ValidationElicited, {
      goal: idea.goal,
      corpus,
      sources,
      claimsAudit: ctx.claimsAudit ?? null,
      adjustments,
      agreement,
    });

    // Rewrite demand signals from the corpus (real url/engagement) and drop any
    // signal citing an unknown id — a model-invented link can never render.
    if (v.market?.demand_signals) {
      v.market.demand_signals = enrichDemandSignals(v.market.demand_signals, corpus);
    }

    // Cache the headline score + (lint-corrected) obtainable-revenue onto the version.
    setVersionScore(versionId, v.score);
    if (v.demand?.obtainable_revenue) setVersionRevenue(versionId, v.demand.obtainable_revenue);
    data = v;
  }

  logUsage({ ideaId: version.idea_id, versionId, kind, model, usage });
  return saveArtifact(versionId, kind, data, sources, model, usage);
}

// ---- k-sample self-consistency scoring --------------------------------------------

type Usage = { prompt_tokens: number; completion_tokens: number; cost: number };

/** The pre-gate weighted overall of one elicited sample (bands → numbers, weighted mean
 * by criterionWeight, NO gates/clamps) — used only to RANK the k samples so the prose
 * comes from the middle one and to measure overall agreement. Goal-neutral ranking:
 * weights use the base map (goal null) so the ranking can't be gamed by the goal. */
function preGateOverall(e: ValidationElicited): number {
  let num = 0;
  let den = 0;
  for (const c of e.criteria) {
    const w = criterionWeight(c.name, null);
    num += w * bandScore(c.band);
    den += w;
  }
  return den > 0 ? num / den : 0;
}

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

/** How much the k samples disagreed overall — max−min of their pre-gate overalls.
 * finalizeValidation turns this into a confidence delta (≤5 tightens, >12 loosens). */
export type ScoringAgreement = { spread: number } | null;

/**
 * Run the scoring generator k times and reduce the samples to ONE elicited result:
 * - k=1 (or a single survivor): behaves EXACTLY like a single generateStructured call —
 *   no medians, no per-criterion spread, no agreement delta (agreement=null).
 * - k>1: per criterion, numeric score = median of the k band-scores and the reported
 *   band = the band of the MIDDLE sample (ranked by that criterion's band-score);
 *   a max−min band-score spread over SPREAD_FLAG appends a system_adjustment naming the
 *   criterion and sets that criterion's `spread` field. All NON-criteria content
 *   (summary, narrative, market, next_test, demand, financials, plan, …) is taken whole
 *   from the MEDIAN-OVERALL sample (the k samples ranked by pre-gate overall, middle one)
 *   so it stays internally consistent. Usage is the SUMMED usage of every call.
 * A sample that throws is dropped; if ALL throw, the last error surfaces as today.
 */
async function runScoringSamples(
  def: Generator,
  prompt: string,
  k: number,
  adj: SystemAdjustment[]
): Promise<{
  elicited: unknown;
  sources: Source[];
  model: string;
  usage: Usage;
  agreement: ScoringAgreement;
}> {
  const call = () =>
    generateStructured(def.schema, {
      role: def.role,
      grounded: def.grounded,
      webMaxResults: def.webMaxResults,
      maxTokens: def.maxTokens,
      system: def.system,
      prompt,
    });

  // k=1: a single call, identical to the pre-k behavior (agreement stays null).
  if (k <= 1) {
    const r = await call();
    return { elicited: r.data, sources: r.sources, model: r.model, usage: r.usage, agreement: null };
  }

  const settled = await Promise.allSettled(Array.from({ length: k }, () => call()));
  const ok = settled.filter(
    (s): s is PromiseFulfilledResult<Awaited<ReturnType<typeof call>>> => s.status === "fulfilled"
  );
  // Summed usage across EVERY call that actually ran (survivors only — a rejected call
  // never returned usage; the client already billed its own retry internally).
  const usage: Usage = { prompt_tokens: 0, completion_tokens: 0, cost: 0 };
  for (const s of ok) {
    usage.prompt_tokens += s.value.usage.prompt_tokens;
    usage.completion_tokens += s.value.usage.completion_tokens;
    usage.cost += s.value.usage.cost;
  }

  if (ok.length === 0) {
    // All samples failed — surface the error exactly as a single failed call would.
    const firstReject = settled.find((s) => s.status === "rejected") as PromiseRejectedResult | undefined;
    throw firstReject?.reason ?? new Error("All scoring samples failed");
  }

  const results = ok.map((s) => s.value);
  const samples = results.map((r) => r.data as ValidationElicited);

  // A lone survivor is the single-call path: no medians/spread/agreement to compute.
  if (samples.length === 1) {
    if (results.length < k) {
      adj.push({
        rule: "scoring-samples-degraded",
        detail: `Only 1 of ${k} scoring samples succeeded; this run is effectively single-sample (no median smoothing or agreement check was applied).`,
      });
    }
    return { elicited: samples[0], sources: results[0].sources, model: results[0].model, usage, agreement: null };
  }

  if (results.length < k) {
    adj.push({
      rule: "scoring-samples-degraded",
      detail: `${results.length} of ${k} scoring samples succeeded; medians and the agreement check used the ${results.length} survivors.`,
    });
  }

  // Rank samples by pre-gate overall; the MEDIAN-OVERALL sample supplies all non-criteria
  // prose (and its cited web sources) so summary/narrative/market/etc. stay mutually
  // consistent. `results[i]` and `samples[i]` share an index, so carry it through.
  const ranked = samples
    .map((s, i) => ({ s, i, overall: preGateOverall(s) }))
    .sort((a, b) => a.overall - b.overall);
  const mid = ranked[Math.floor(ranked.length / 2)];
  const medianSample = mid.s;

  // Per-criterion median band-score + middle-sample band + flagged spread. Criteria are
  // keyed by name (the schema guarantees each of the 10 names exactly once per sample).
  const SPREAD_FLAG = 10;
  const mergedCriteria = medianSample.criteria.map((mc) => {
    const perSample = samples
      .map((s) => s.criteria.find((c) => c.name === mc.name))
      .filter((c): c is ValidationElicited["criteria"][number] => !!c);
    const scores = perSample.map((c) => bandScore(c.band));
    const med = median(scores);
    // The reported band is the MIDDLE sample's band for this criterion (ranked by score).
    const bandRanked = [...perSample].sort((a, b) => bandScore(a.band) - bandScore(b.band));
    const midBand = bandRanked[Math.floor(bandRanked.length / 2)].band;
    const spread = Math.max(...scores) - Math.min(...scores);
    // band = middle sample's band; score = median of band-scores (finalize honors a
    // pre-set score over re-deriving it from the band, so the two can legitimately
    // differ on an even survivor count without the band lying about the number).
    const out: ValidationElicited["criteria"][number] & { spread?: number; score?: number } = {
      ...mc,
      band: midBand,
      score: Math.round(med),
    };
    if (spread > SPREAD_FLAG) {
      out.spread = spread;
      adj.push({
        rule: "criterion-sample-disagreement",
        detail: `The ${results.length} scoring samples disagreed materially on "${mc.name}" (band-scores spanned ${spread} points, ${Math.min(
          ...scores
        )}–${Math.max(...scores)}); the reported band is the median. Treat this criterion as less certain.`,
      });
    }
    return out;
  });

  const elicited: ValidationElicited = { ...medianSample, criteria: mergedCriteria };

  // Overall agreement across the k samples (max−min of pre-gate overalls).
  const overalls = ranked.map((r) => r.overall);
  const agreement: ScoringAgreement = { spread: Math.max(...overalls) - Math.min(...overalls) };

  return { elicited, sources: results[mid.i].sources, model: results[mid.i].model, usage, agreement };
}

// ---- sycophancy firewall: the claims-audit pre-pass -------------------------------

const ClaimsAuditElicitSchema = z.object({
  brief: z.string().min(40),
  claims: z.array(ClaimSchema).catch([]),
});

/**
 * Rewrite the idea statement + founder-supplied context into a neutral third-person
 * CLAIMS BRIEF plus a typed claim ledger: every claim classified as self_fact (founder
 * about themselves — authoritative) or market_assumption (founder about customers/
 * competitors/market — corroborate before it moves a band) and Mom-Test-tiered by the
 * support offered for it. The scoring pass judges this audit; the original statement
 * is reference only.
 */
async function generateClaimsAudit(
  ctx: GenContext
): Promise<{ audit: ClaimsAudit; model: string; usage: { prompt_tokens: number; completion_tokens: number; cost: number } }> {
  const { data, model, usage } = await generateStructured(ClaimsAuditElicitSchema, {
    role: "writing",
    grounded: false,
    maxTokens: 1400,
    temperature: 0.1,
    system:
      "You rewrite startup pitches into neutral third-person claims briefs for an analyst, then type each " +
      "claim. Strip ALL enthusiasm, superlatives, and persuasion ('revolutionary', 'massive', 'game-changing', " +
      "first-person passion). The 'brief' lists what is actually being claimed, flatly and completely: the " +
      "proposed product/mechanism, the target customer, the problem asserted, any asserted market/competitor/" +
      'pricing facts (prefix unverified ones with "Founder asserts:"), and any founder capabilities/assets ' +
      "mentioned. Do not add claims, do not evaluate, do not soften or sharpen — neutral restatement only. " +
      "Keep it under 180 words.\n" +
      "Then extract 'claims': every distinct factual claim as { text, kind, tier }.\n" +
      'kind: "self_fact" = a founder statement about THEMSELVES (skills, network, capital, time, intent); ' +
      '"market_assumption" = a statement about customers, competitors, pricing, or the market.\n' +
      "tier = the Mom-Test evidence tier of the SUPPORT OFFERED for the claim, not its plausibility: " +
      "1 = money or behavior actually changed hands/happened (paying users, a signed pilot, built workarounds); " +
      "2 = a costly commitment (significant time, reputation, a scheduled pilot); " +
      "3 = a specific past fact or complaint; " +
      '4 = compliments, hypotheticals, or generic enthusiasm ("50 people said they loved it" is tier 4). ' +
      "A bare assertion with no support offered is tier 4 for market claims, tier 3 for plain self-facts.",
    prompt: `Rewrite the following as a neutral third-person claims brief, then extract the typed claim ledger.

IDEA STATEMENT:
"""
${ctx.idea.title}
${ctx.idea.prompt}
"""
${ctx.founderFit?.trim() ? `\nFOUNDER'S SELF-DESCRIPTION:\n"""\n${ctx.founderFit.trim()}\n"""\n` : ""}${
      ctx.context?.trim() ? `\nFOUNDER'S ADDED CONTEXT:\n"""\n${ctx.context.trim()}\n"""\n` : ""
    }
Return JSON: {"brief": string, "claims": [{"text": string, "kind": "self_fact"|"market_assumption", "tier": 1|2|3|4}]}`,
  });
  return { audit: data, model, usage };
}

// ---- band → score recompute + gates ------------------------------------------------

type FinalizeOpts = {
  goal: string | null;
  corpus: EvidenceCorpus | null;
  sources: Source[];
  claimsAudit: ClaimsAudit | null;
  adjustments: SystemAdjustment[];
  /** k-sample overall agreement (max−min of the k pre-gate overalls); null for k=1. */
  agreement: ScoringAgreement;
};

const byName = (criteria: ValidationCriterion[], name: string) =>
  criteria.find((c) => c.name === name);

/**
 * Turn the elicited (band-scored, verdict-less) result into the stored artifact:
 * 1. map each band to a numeric score (BAND_SCORE);
 * 2. apply pre-average clamps (Vitamin → Demand Strength; unverified Why Now → Market Timing);
 * 3. weighted average (base weights × per-goal vector), then the overall caps
 *    (no-edge, goal-fit) and per-goal verdict bands;
 * 4. verdict gates (fatal criterion, GO demand/founder-fit floors) + yoke flag;
 * 5. deterministic confidence (degraded-corpus cap, zero-web-sources flag, competitor lint);
 * 6. derived sub-scores (demand.strength, validations roll-ups) + revenue-math lint;
 * 7. INSUFFICIENT EVIDENCE when confidence < 35.
 * Every rule that fires appends a visible system_adjustment.
 */
function finalizeValidation(elicited: ValidationElicited, opts: FinalizeOpts): Validation {
  const adj = opts.adjustments;

  // 1. bands → numbers (stored per criterion so radar/recompute/UI keep working).
  // The k-sample merge may pre-set `score` (median of the k band-scores) and `spread`
  // (the flagged sample disagreement) on a criterion — honor a pre-set score over
  // re-deriving it from the band, and carry the spread through to the stored artifact.
  const criteria: ValidationCriterion[] = elicited.criteria.map((c) => {
    const pre = c as typeof c & { score?: number; spread?: number };
    return {
      ...c,
      score: typeof pre.score === "number" ? pre.score : bandScore(c.band),
      ...(typeof pre.spread === "number" ? { spread: pre.spread } : {}),
    };
  });

  const ds = byName(criteria, "Demand Strength");
  const wtp = byName(criteria, "Willingness to Pay");
  const psf = byName(criteria, "Problem-Solution Fit");
  const timing = byName(criteria, "Market Timing");
  const cp = byName(criteria, "Competitive Position");
  const moat = byName(criteria, "Differentiation / Moat");
  const founderFit = byName(criteria, "Founder Fit");
  const goalFit = byName(criteria, "Goal Fit");

  // 2a. gate (d): Vitamin clamps Demand Strength BEFORE averaging
  if (elicited.narrative?.verdict === "Vitamin" && ds && ds.score > GATES.vitaminDemandClamp) {
    adj.push({
      rule: "vitamin-demand-clamp",
      detail: `Narrative verdict is "Vitamin" but Demand Strength was banded ${ds.band} (${ds.score}); clamped to ${GATES.vitaminDemandClamp} before averaging — a nice-to-have cannot carry a strong demand score.`,
    });
    ds.score = GATES.vitaminDemandClamp;
  }

  // 2b. unverified Why Now: no search trend AND no momentum → Market Timing clamped
  const whyNowVerified = !!(elicited.market?.search_trend?.note || elicited.market?.momentum);
  if (!whyNowVerified && timing && timing.score > GATES.timingUnverifiedClamp) {
    adj.push({
      rule: "why-now-unverified",
      detail: `Market Timing was banded ${timing.band} (${timing.score}) but no search trend or category momentum was found; clamped to ${GATES.timingUnverifiedClamp} — a "Why Now" needs a verifiable enabling change.`,
    });
    timing.score = GATES.timingUnverifiedClamp;
  }

  // 3a. weighted average: base weights × per-goal vector (lib/scoring.ts)
  let num = 0;
  let den = 0;
  for (const c of criteria) {
    const w = criterionWeight(c.name, opts.goal);
    num += w * Math.max(0, Math.min(100, c.score));
    den += w;
  }
  let score = den > 0 ? Math.round(num / den) : 0;
  const uncapped = score;

  // 3b. gate (c): no-edge cap — proven demand with no edge can't approach GO
  if (cp && moat && Math.min(cp.score, moat.score) < GATES.noEdgeMin && score > GATES.noEdgeCap) {
    adj.push({
      rule: "no-edge-cap",
      detail: `min(Competitive Position ${cp.score}, Differentiation / Moat ${moat.score}) is below ${GATES.noEdgeMin}; overall capped at ${GATES.noEdgeCap} (uncapped: ${uncapped}) — proven demand without an edge is a me-too.`,
    });
    score = GATES.noEdgeCap;
  }

  // 3c. gate (e): goal-fit cap — records the uncapped score for goal-conditional rendering
  if (goalFit && goalFit.score < GATES.goalFitMin && score > GATES.goalFitCap) {
    adj.push({
      rule: "goal-fit-cap",
      detail: `Goal Fit ${goalFit.score} is below ${GATES.goalFitMin}; overall capped at ${GATES.goalFitCap} for the "${opts.goal ?? "unsure"}" goal. Uncapped score: ${uncapped} — the idea may be that strong for a goal it actually fits.`,
    });
    score = GATES.goalFitCap;
  }

  // 3d. per-goal verdict bands
  const bands = verdictBands(opts.goal);
  let verdict: Validation["verdict"] =
    score >= bands.go ? "GO" : score >= bands.maybe ? "MAYBE" : "NO-GO";

  // 4a. gate (a): a fatal criterion caps the verdict at MAYBE
  const fatal = criteria.filter((c) => c.score <= GATES.fatalCriterion);
  if (fatal.length && verdict === "GO") {
    verdict = "MAYBE";
    adj.push({
      rule: "fatal-criterion",
      detail: `${fatal.map((c) => `${c.name} (${c.band}, ${c.score})`).join(", ")} at or below ${GATES.fatalCriterion}; verdict capped at MAYBE — strengths elsewhere cannot buy back a fatal flaw.`,
    });
  }

  // 4b. gate (b): GO requires real demand AND a founder who can execute
  if (verdict === "GO" && ds && ds.score < GATES.goDemandMin) {
    verdict = "MAYBE";
    adj.push({
      rule: "go-demand-floor",
      detail: `GO requires Demand Strength ≥ ${GATES.goDemandMin}; it is ${ds.score}. Verdict capped at MAYBE.`,
    });
  }
  if (verdict === "GO" && founderFit && founderFit.score < GATES.goFounderFitMin) {
    verdict = "MAYBE";
    adj.push({
      rule: "go-founder-fit-floor",
      detail: `GO requires Founder Fit ≥ ${GATES.goFounderFitMin}; it is ${founderFit.score}. Verdict capped at MAYBE.`,
    });
  }

  // 4c. gate (f): yoke flag — the three formerly-yoked criteria moving as one block
  const yoked = [ds, wtp, psf].filter((c): c is ValidationCriterion => !!c);
  if (yoked.length === 3 && yoked.every((c) => c.score >= GATES.yokeMin)) {
    const scores = yoked.map((c) => c.score);
    if (Math.max(...scores) - Math.min(...scores) <= GATES.yokeSpread) {
      adj.push({
        rule: "suspected-yoked-scoring",
        detail: `Demand Strength, Willingness to Pay, and Problem-Solution Fit all ≥ ${GATES.yokeMin} and within ${GATES.yokeSpread} points of each other — these are orthogonal constructs; treat the demand row with suspicion (one observation may have swept all three).`,
      });
    }
  }

  // 5. deterministic confidence (with degraded-corpus cap + silent-zero flags)
  let confidence = computeConfidence(opts.corpus, opts.sources, elicited.confidence, adj);

  // 5-agreement: k-sample overall agreement adjusts confidence. Tight agreement across
  // the samples (max−min of pre-gate overalls ≤ 5) is corroboration → +15 (cap 100);
  // wide disagreement (> 12) means the score is noisy → −10 (floor 0). k=1 → null → skip.
  if (opts.agreement) {
    const sp = opts.agreement.spread;
    if (sp <= 5) {
      const before = confidence;
      confidence = Math.min(100, confidence + 15);
      adj.push({
        rule: "sample-agreement-high",
        detail: `The scoring samples agreed tightly (overall spread ${sp.toFixed(1)} ≤ 5); confidence +15 (${before} → ${confidence}).`,
      });
    } else if (sp > 12) {
      const before = confidence;
      confidence = Math.max(0, confidence - 10);
      adj.push({
        rule: "sample-agreement-low",
        detail: `The scoring samples disagreed on the overall (spread ${sp.toFixed(1)} > 12); confidence −10 (${before} → ${confidence}) — treat this verdict as noisy and re-run.`,
      });
    }
  }

  // 5b. consistency lint: <2 named competitors → confidence -10
  const namedCompetitors =
    elicited.market?.competitors?.filter((c) => c.name?.trim()).length ?? 0;
  if (namedCompetitors < 2) {
    confidence = Math.max(0, confidence - 10);
    adj.push({
      rule: "few-competitors",
      detail: `Only ${namedCompetitors} named competitor${namedCompetitors === 1 ? "" : "s"} in the market read (2+ expected — even "no competitors" needs the adjacent incumbents named); confidence -10.`,
    });
  }

  // 5c. lint: "no reliable source found" inside an explanation banded ≥ 70
  for (const c of criteria) {
    if (c.score >= 70 && /no reliable source found/i.test(c.explanation)) {
      adj.push({
        rule: "unsourced-high-band",
        detail: `"${c.name}" is banded ${c.band} (${c.score}) while its explanation admits "no reliable source found" — treat this band as optimistic.`,
      });
    }
  }

  // 5d. lint: an explanation admits an unverified/founder-asserted claim while banded
  // above C — the prompt instructs a cap at C for founder assets absent from the
  // founder profile, and ≤ one band step for uncorroborated founder market-claims.
  for (const c of criteria) {
    if (c.score > bandScore("C") && /unverified founder claim|founder-asserted/i.test(c.explanation)) {
      adj.push({
        rule: "unverified-founder-claim",
        detail: `"${c.name}" rests on an unverified founder claim (a capability/asset absent from the founder profile, or an uncorroborated founder-asserted market claim) yet is banded ${c.band} (${c.score}) — treat this band as optimistic and confirm the claim (or add it to the founder profile).`,
      });
    }
  }

  // 6a. revenue-math lint: reach × capture × price must ≈ obtainable_revenue
  const demand = elicited.demand ? { ...elicited.demand } : undefined;
  if (demand?.math) {
    const reach = parseFigure(demand.math.reachable);
    const capture = parseShare(demand.math.capture);
    let price = parseFigure(demand.math.price);
    // The headline is annual but models often price per month despite the prompt —
    // annualize instead of "correcting" a right answer down by 12x.
    if (price != null && /\/\s*mo\b|per\s*month|monthly|\/month/i.test(demand.math.price)) {
      price *= 12;
    }
    const stated = parseFigure(demand.obtainable_revenue);
    if (reach != null && capture != null && price != null && stated != null && stated > 0) {
      const computed = reach * capture * price;
      const ratio = computed / stated;
      if (computed > 0 && (ratio > 2 || ratio < 0.5)) {
        const rewritten = fmtMoney(computed);
        adj.push({
          rule: "revenue-math-rewrite",
          detail: `The stated obtainable revenue (${demand.obtainable_revenue}) diverges >2x from its own math (${demand.math.reachable} × ${demand.math.capture} × ${demand.math.price} ≈ ${rewritten}/yr); headline rewritten to the computed product.`,
        });
        demand.obtainable_revenue = `${rewritten}/yr`;
        // The sensitivity strip was anchored to the discredited headline — rescale it
        // by the same correction so the report can't show two contradictory figures.
        if (demand.sensitivity) {
          const rescale = (v: string) => {
            const n = parseFigure(v);
            return n != null ? `${fmtMoney(n * ratio)}/yr` : "";
          };
          demand.sensitivity = {
            conservative: demand.sensitivity.conservative ? rescale(demand.sensitivity.conservative) : "",
            base: `${rewritten}/yr`,
            optimistic: demand.sensitivity.optimistic ? rescale(demand.sensitivity.optimistic) : "",
          };
        }
      }
    }
  }

  // 6b. derived sub-scores — computed, not re-elicited, so they can never contradict
  // the criteria they summarize (rationales reuse the criterion explanations).
  const marketScore =
    timing && cp ? Math.round((timing.score + cp.score) / 2) : (timing ?? cp)?.score ?? 0;
  const validations: Validation["validations"] = {
    problem: { score: ds?.score ?? 0, rationale: ds?.explanation ?? "" },
    solution: { score: psf?.score ?? 0, rationale: psf?.explanation ?? "" },
    market: {
      score: marketScore,
      rationale: [timing?.explanation, cp?.explanation].filter(Boolean).join(" "),
    },
  };

  // 7. confidence gates the verdict: below the floor, a letter grade would be a guess
  if (confidence < GATES.insufficientEvidenceConfidence) {
    adj.push({
      rule: "insufficient-evidence",
      detail: `Computed confidence ${confidence} is below ${GATES.insufficientEvidenceConfidence}; the verdict is INSUFFICIENT EVIDENCE (the weighted score ${score} is still shown). Corpus: ${opts.corpus?.items.length ?? 0} items; cited web sources: ${opts.sources.length}.`,
    });
    verdict = "INSUFFICIENT EVIDENCE";
  }

  return {
    ...elicited,
    verdict,
    score,
    confidence,
    criteria,
    validations,
    demand: demand
      ? { ...demand, strength: demandStrengthLabel(ds?.score ?? 0) }
      : undefined,
    system_adjustments: adj,
    claims_audit: opts.claimsAudit ?? undefined,
    goal_scored: normalizeGoal(opts.goal),
  };
}

// ---- figure parsing for the revenue-math lint ---------------------------------------

// Pull the numeric value(s) out of a short money/count figure like "$120K–360K/yr",
// "5,000", "~$1.2M". Ranges collapse to their midpoint. Returns null when nothing
// parseable is found (the lint then stays silent — never guess).
function parseFigure(s: string | undefined | null): number | null {
  if (!s) return null;
  // Suffix must be attached to the number and end the token — otherwise the first
  // letter of a following noun reads as a multiplier ("5,000 merchants" → 5 billion).
  const matches = [...s.matchAll(/\$?(\d[\d,]*(?:\.\d+)?)([kmb])?(?![a-z0-9])/gi)]
    .map((m) => {
      const n = parseFloat(m[1].replace(/,/g, ""));
      const suffix = m[2]?.toLowerCase();
      const mult = suffix === "k" ? 1e3 : suffix === "m" ? 1e6 : suffix === "b" ? 1e9 : 1;
      return n * mult;
    })
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!matches.length) return null;
  return (matches[0] + matches[matches.length - 1]) / 2; // single value or range midpoint
}

// A capture/conversion share like "~3%", "5-10%", or "0.05" → a 0-1 fraction.
function parseShare(s: string | undefined | null): number | null {
  if (!s) return null;
  if (s.includes("%")) {
    // Only the figure(s) attached to the % sign — "3% of the 5,000 reachable" must
    // not midpoint into a 2500% share.
    const m = s.match(/(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*%/);
    if (!m) return null;
    const lo = parseFloat(m[1]);
    const hi = m[2] ? parseFloat(m[2]) : lo;
    const frac = (lo + hi) / 2 / 100;
    return frac > 1 ? null : frac; // >100% is never interpretable — stay silent
  }
  const n = parseFigure(s);
  if (n == null) return null;
  if (n <= 1) return n; // already a fraction
  return null; // a bare count/figure isn't interpretable as a share — stay silent
}

function fmtMoney(n: number): string {
  if (n >= 1e9) return `$${trimZero((n / 1e9).toFixed(1))}B`;
  if (n >= 1e6) return `$${trimZero((n / 1e6).toFixed(1))}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}
const trimZero = (s: string) => s.replace(/\.0$/, "");

// ---- demand-signal enrichment --------------------------------------------------------

type DemandSignal = {
  evidence_id: string;
  quote: string;
  tag: string;
  source?: "reddit" | "hn";
  url?: string;
  community?: string;
  score?: number;
  num_comments?: number;
  created_utc?: number;
  wtp_signal?: boolean;
};

// Map each signal's evidence_id onto the corpus item and copy the REAL link +
// engagement metadata into the artifact (so the UI needs no corpus join). Signals
// citing ids that don't exist in the corpus are dropped entirely, and a quote the
// model paraphrased (not a substring of the fetched text) falls back to the fetched
// excerpt — the UI renders these in quotation marks, so they must be verbatim.
const normQuote = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

function enrichDemandSignals(signals: DemandSignal[], corpus: EvidenceCorpus | null): DemandSignal[] {
  const out: DemandSignal[] = [];
  for (const s of signals) {
    const item = corpus?.items.find((i) => i.id === s.evidence_id);
    if (!item) continue;
    const q = normQuote(s.quote ?? "");
    const verbatim =
      !!q && (normQuote(item.quote).includes(q) || (!!item.title && normQuote(item.title).includes(q)));
    out.push({
      ...s,
      quote: verbatim ? s.quote : item.quote,
      source: item.source,
      url: item.url,
      community: item.community,
      score: item.score,
      num_comments: item.num_comments,
      created_utc: item.created_utc,
      wtp_signal: item.wtp_signal,
    });
  }
  return out;
}

/**
 * Deterministic confidence, replacing the model's self-report:
 * - corpus contribution (0-60): 40 × min(relevant items, 15)/15 where relevant means
 *   relevance ≥ 2, +10 if the evidence spans ≥ 3 distinct communities, +10 if it
 *   contains ≥ 2 willingness-to-pay items — CAPPED at GATES.degradedCorpusConfidenceCap
 *   when the relevance ranking degraded (every item defaulted to relevance 1 — the
 *   "relevant" count is then meaningless, not a demand finding);
 * - web-grounding contribution (0-25): 25 × min(distinct cited sources, 10)/10 — a
 *   grounded call returning ZERO sources gets a loud flag (probable plugin regression)
 *   instead of silently scoring low;
 * - the model's self-report contributes at most 15 (self-report/100 × 15).
 * Clamped to 0-100. Fired rules append to `adj`. When audience_online === "low" the
 * corpus/web split is reweighted 45/40 (from 60/25) — see the body.
 */
function computeConfidence(
  corpus: EvidenceCorpus | null,
  sources: Source[],
  selfReport: number | undefined,
  adj: SystemAdjustment[]
): number {
  // When corpus.stats.audience_online === "low" (the buyer doesn't hang out on HN/Reddit),
  // a thin corpus is EXPECTED, not a demand finding — reweight the corpus 60→45 and web
  // 25→40 so the report leans on web/review sources instead of penalizing demand. The
  // corpus sub-weights (40 / 10 / 10) and the degraded cap scale by the same factor.
  const lowAudience = corpus?.stats.audience_online === "low";
  const corpusMax = lowAudience ? 45 : 60;
  const webMax = lowAudience ? 40 : 25;
  const cScale = corpusMax / 60; // 0.75 when low, else 1
  const relevant = corpus?.items.filter((i) => i.relevance >= 2).length ?? 0;
  const communities = corpus?.stats.communities.length ?? 0;
  const wtp = corpus?.items.filter((i) => i.wtp_signal).length ?? 0;
  let corpusPart =
    cScale * (40 * (Math.min(relevant, 15) / 15) + (communities >= 3 ? 10 : 0) + (wtp >= 2 ? 10 : 0));
  if (corpus?.stats.degraded) {
    const cap = GATES.degradedCorpusConfidenceCap * cScale;
    corpusPart = Math.min(corpusPart, cap);
    adj.push({
      rule: "degraded-corpus",
      detail: `The evidence relevance ranking failed and every item was kept at a default relevance — the corpus contribution to confidence is capped at ${Math.round(cap)}/${corpusMax}. Refresh the evidence to get a real ranking.`,
    });
  }
  if (lowAudience) {
    adj.push({
      rule: "offline-audience-reweight",
      detail: `This idea's buyer doesn't typically discuss the problem on Reddit/Hacker News (audience_online = low), so a thin forum corpus is expected. Confidence weighting shifted toward web/review sources (corpus max ${corpusMax}, web max ${webMax}) rather than penalizing demand for the thin corpus.`,
    });
  }
  const webPart = webMax * (Math.min(sources.length, 10) / 10);
  if (sources.length === 0) {
    adj.push({
      rule: "zero-web-sources",
      detail:
        "The grounded scoring call returned ZERO cited web sources — likely a web-search-plugin regression (e.g. exa routing), not an evidence finding. Web-sourced figures in this report are unverified; treat confidence as understated and re-run.",
    });
  }
  const selfPart = (Math.max(0, Math.min(100, selfReport ?? 0)) / 100) * 15;
  return Math.round(Math.max(0, Math.min(100, corpusPart + webPart + selfPart)));
}
