import { z } from "zod";
import type { ModelRole } from "../ai/models";
import type { ArtifactKind } from "../db";

// Context handed to every generator: the idea plus any already-generated artifacts,
// so downstream modules (brand, marketing, pitch) stay coherent with validation/market.
export type GenContext = {
  idea: { title: string; prompt: string };
  prior: Partial<Record<ArtifactKind, unknown>>;
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
  return parts.length ? `\n\nUse this existing context for coherence:\n${parts.join("\n\n")}` : "";
}

export function ideaHeader(ctx: GenContext): string {
  return `Idea: "${ctx.idea.title}"\n\nDescription: ${ctx.idea.prompt}`;
}
