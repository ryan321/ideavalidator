import { z } from "zod";
import type { ModelRole } from "../ai/models";
import type { ArtifactKind } from "../db";

// Context handed to every generator: the idea plus any already-generated artifacts,
// so downstream modules (brand, marketing, pitch) stay coherent with validation/market.
export type GenContext = {
  idea: { title: string; prompt: string };
  prior: Partial<Record<ArtifactKind, unknown>>;
  /** Founder clarifications/corrections for this version (the "respond to the validator" feature). */
  context?: string | null;
};

export type Generator<T = unknown> = {
  kind: ArtifactKind;
  label: string;
  blurb: string;
  role: ModelRole;
  grounded: boolean;
  /** Artifact kinds whose output improves this one if already generated. */
  uses?: ArtifactKind[];
  schema: z.ZodType<T>;
  system: string;
  buildPrompt: (ctx: GenContext) => string;
  maxTokens?: number;
};

// Helper: compactly serialize prior artifacts for prompt context.
export function priorContext(ctx: GenContext, kinds: ArtifactKind[]): string {
  const parts: string[] = [];
  for (const k of kinds) {
    if (ctx.prior[k]) {
      parts.push(`### ${k} (already generated)\n${JSON.stringify(ctx.prior[k])}`);
    }
  }
  return parts.length
    ? `\n\nGround your answer in these already-generated artifacts. REUSE their concrete values verbatim where relevant — the same TAM/SAM/SOM figures, the same CAC/LTV, the same named competitors, persona, and pricing. Do NOT contradict or re-estimate any number that already appears below:\n${parts.join("\n\n")}`
    : "";
}

export function ideaHeader(ctx: GenContext): string {
  return `Idea: "${ctx.idea.title}"\n\nDescription: ${ctx.idea.prompt}`;
}

// Authoritative founder clarifications, injected into analysis prompts when present.
export function founderContext(ctx: GenContext): string {
  const c = ctx.context?.trim();
  if (!c) return "";
  return `\n\nFOUNDER CONTEXT — the founder reviewed a prior analysis and is clarifying or pushing back. Treat the following as AUTHORITATIVE and correct earlier mistakes accordingly (e.g. if it says certain "competitors" aren't real competitors, re-evaluate the competition criterion in that light). Address these points directly and acknowledge them in the summary:\n"""\n${c}\n"""`;
}
