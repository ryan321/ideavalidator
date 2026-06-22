import { generateStructured } from "../ai/client";
import {
  Artifact,
  ArtifactKind,
  getArtifacts,
  getIdea,
  getVersion,
  logUsage,
  saveArtifact,
  setVersionScore,
} from "../db";
import { Generator, GenContext } from "./shared";
import { validationGenerator } from "./validation";
import { marketGenerator } from "./market";
import { financialsGenerator } from "./financials";
import { planGenerator } from "./plan";
import { brandGenerator } from "./brand";
import { logoGenerator } from "./logo";
import { marketingGenerator } from "./marketing";
import { pitchGenerator } from "./pitch";

export const GENERATORS: Record<ArtifactKind, Generator> = {
  validation: validationGenerator,
  market: marketGenerator,
  financials: financialsGenerator,
  plan: planGenerator,
  brand: brandGenerator,
  logo: logoGenerator,
  marketing: marketingGenerator,
  pitch: pitchGenerator,
};

// Display/run order for the dashboard.
export const KIND_ORDER: ArtifactKind[] = [
  "validation",
  "market",
  "financials",
  "plan",
  "brand",
  "logo",
  "marketing",
  "pitch",
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
  kind: ArtifactKind
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
  };

  const { data, sources, model, usage } = await generateStructured(def.schema, {
    role: def.role,
    grounded: def.grounded,
    maxTokens: def.maxTokens,
    system: def.system,
    prompt: def.buildPrompt(ctx),
  });

  // Cache the headline validation score onto the version for the switcher / iteration.
  if (kind === "validation") {
    const score = (data as { score?: number })?.score;
    if (typeof score === "number") setVersionScore(versionId, score);
  }

  logUsage({ ideaId: version.idea_id, versionId, kind, model, usage });
  return saveArtifact(versionId, kind, data, sources, model, usage);
}
