import { generateStructured } from "../ai/client";
import {
  Artifact,
  ArtifactKind,
  getArtifacts,
  getIdea,
  getVersion,
  logUsage,
  saveArtifact,
  setVersionRevenue,
  setVersionScore,
} from "../db";
import { Generator, GenContext, steerContext } from "./shared";
import { validationGenerator } from "./validation";
import { marketGenerator } from "./market";
import { financialsGenerator } from "./financials";
import { planGenerator } from "./plan";
import { brandGenerator } from "./brand";
import { logoGenerator } from "./logo";
import { marketingGenerator } from "./marketing";
import { customerPitchGenerator } from "./customer_pitch";
import { pitchGenerator } from "./pitch";
import { outreachGenerator } from "./outreach";

export const GENERATORS: Record<ArtifactKind, Generator> = {
  validation: validationGenerator,
  market: marketGenerator,
  financials: financialsGenerator,
  plan: planGenerator,
  brand: brandGenerator,
  logo: logoGenerator,
  marketing: marketingGenerator,
  customer_pitch: customerPitchGenerator,
  pitch: pitchGenerator,
  outreach: outreachGenerator,
};

// Display/run order for the dashboard.
export const KIND_ORDER: ArtifactKind[] = [
  "validation",
  "market",
  "financials",
  "plan",
  "brand",
  "logo",
  "customer_pitch",
  "pitch",
  "marketing",
  "outreach",
];

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
  };

  // Steer is appended generically so it works for every generator without each
  // one having to opt in.
  const { data, sources, model, usage } = await generateStructured(def.schema, {
    role: def.role,
    grounded: def.grounded,
    maxTokens: def.maxTokens,
    system: def.system,
    // pass the current draft of this kind so a steer is a targeted edit, not a regen
    prompt: def.buildPrompt(ctx) + steerContext(ctx, prior[kind]),
  });

  // Cache the headline validation score + obtainable-revenue forecast onto the version.
  if (kind === "validation") {
    const v = data as { score?: number; demand?: { obtainable_revenue?: string } };
    if (typeof v?.score === "number") setVersionScore(versionId, v.score);
    if (v?.demand?.obtainable_revenue) setVersionRevenue(versionId, v.demand.obtainable_revenue);
  }

  logUsage({ ideaId: version.idea_id, versionId, kind, model, usage });
  return saveArtifact(versionId, kind, data, sources, model, usage);
}
