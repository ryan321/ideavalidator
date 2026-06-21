// Per-stage model routing — mimics IdeaProof's "best model for each job".
// Every role is overridable via env so you can paste current slugs from
// https://openrouter.ai/models without touching code.

export type ModelRole = "reasoning" | "research" | "fast" | "image";

const DEFAULTS: Record<ModelRole, string> = {
  reasoning: "anthropic/claude-opus-4.8",
  research: "anthropic/claude-sonnet-4.6",
  fast: "google/gemini-2.5-flash",
  image: "google/gemini-2.5-flash-image-preview",
};

const ENV_KEYS: Record<ModelRole, string> = {
  reasoning: "MODEL_REASONING",
  research: "MODEL_RESEARCH",
  fast: "MODEL_FAST",
  image: "MODEL_IMAGE",
};

export function resolveModel(role: ModelRole): string {
  return process.env[ENV_KEYS[role]]?.trim() || DEFAULTS[role];
}
