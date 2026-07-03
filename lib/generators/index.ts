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
import { Generator, GenContext, steerContext } from "./shared";
import { validationGenerator } from "./validation";

export const GENERATORS: Record<ArtifactKind, Generator> = {
  validation: validationGenerator,
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
  if (kind === "validation") {
    corpus = getEvidence(versionId) ?? (await collectEvidence(versionId));
  }

  // Steer is appended generically so it works for every generator without each
  // one having to opt in.
  const { data, sources, model, usage } = await generateStructured(def.schema, {
    role: def.role,
    grounded: def.grounded,
    webMaxResults: def.webMaxResults,
    maxTokens: def.maxTokens,
    system: def.system,
    // pass the current draft of this kind so a steer is a targeted edit, not a regen
    prompt:
      def.buildPrompt(ctx) +
      (corpus ? evidencePromptBlock(corpus) : "") +
      steerContext(ctx, prior[kind]),
  });

  // Cache the headline validation score + obtainable-revenue forecast onto the version.
  if (kind === "validation") {
    const v = data as {
      score?: number;
      verdict?: string;
      confidence?: number;
      criteria?: { group?: string; score?: number }[];
      demand?: { obtainable_revenue?: string };
      market?: { demand_signals?: DemandSignal[] };
    };
    // The model's free-form overall score clusters (~76) and ignores how the idea
    // actually changed. Recompute it as a demand-weighted average of the 9 criteria
    // so it tracks the analysis and moves when the founder improves a weak area.
    if (Array.isArray(v.criteria) && v.criteria.length >= 5) {
      let num = 0;
      let den = 0;
      for (const c of v.criteria) {
        const w = c.group === "demand" ? 1.4 : 1;
        const s = typeof c.score === "number" ? Math.max(0, Math.min(100, c.score)) : 0;
        num += w * s;
        den += w;
      }
      const derived = Math.round(num / den);
      v.score = derived;
      v.verdict = derived >= 70 ? "GO" : derived >= 45 ? "MAYBE" : "NO-GO";
    }
    if (typeof v?.score === "number") setVersionScore(versionId, v.score);
    if (v?.demand?.obtainable_revenue) setVersionRevenue(versionId, v.demand.obtainable_revenue);

    // Rewrite demand signals from the corpus (real url/engagement) and drop any
    // signal citing an unknown id — a model-invented link can never render.
    if (v.market?.demand_signals) {
      v.market.demand_signals = enrichDemandSignals(v.market.demand_signals, corpus);
    }
    // The model's confidence self-report is vibes; replace it with a number
    // computed from the evidence it was actually given (mirrors the score recompute).
    v.confidence = computeConfidence(corpus, sources, v.confidence);
  }

  logUsage({ ideaId: version.idea_id, versionId, kind, model, usage });
  return saveArtifact(versionId, kind, data, sources, model, usage);
}

type DemandSignal = {
  evidence_id: string;
  quote: string;
  tag: string;
  source?: string;
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
 *   contains ≥ 2 willingness-to-pay items;
 * - web-grounding contribution (0-25): 25 × min(distinct cited sources, 10)/10;
 * - the model's self-report contributes at most 15 (self-report/100 × 15).
 * Clamped to 0-100.
 */
function computeConfidence(
  corpus: EvidenceCorpus | null,
  sources: Source[],
  selfReport: number | undefined
): number {
  const relevant = corpus?.items.filter((i) => i.relevance >= 2).length ?? 0;
  const communities = corpus?.stats.communities.length ?? 0;
  const wtp = corpus?.items.filter((i) => i.wtp_signal).length ?? 0;
  const corpusPart =
    40 * (Math.min(relevant, 15) / 15) + (communities >= 3 ? 10 : 0) + (wtp >= 2 ? 10 : 0);
  const webPart = 25 * (Math.min(sources.length, 10) / 10);
  const selfPart = (Math.max(0, Math.min(100, selfReport ?? 0)) / 100) * 15;
  return Math.round(Math.max(0, Math.min(100, corpusPart + webPart + selfPart)));
}
