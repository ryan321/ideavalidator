import { generateStructured } from "../ai/client";
import {
  Artifact,
  ArtifactKind,
  getArtifacts,
  getIdea,
  saveArtifact,
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

/** Run one generator for an idea, persist the artifact, and return it. */
export async function runGenerator(
  ideaId: string,
  kind: ArtifactKind
): Promise<Artifact> {
  const idea = getIdea(ideaId);
  if (!idea) throw new Error("Idea not found");

  const def = GENERATORS[kind];
  if (!def) throw new Error(`Unknown generator: ${kind}`);

  const prior: GenContext["prior"] = {};
  for (const a of getArtifacts(ideaId)) prior[a.kind] = a.data;

  const ctx: GenContext = {
    idea: { title: idea.title, prompt: idea.prompt },
    prior,
  };

  const { data, sources, model } = await generateStructured(def.schema, {
    role: def.role,
    grounded: def.grounded,
    maxTokens: def.maxTokens,
    system: def.system,
    prompt: def.buildPrompt(ctx),
  });

  return saveArtifact(ideaId, kind, data, sources, model);
}
