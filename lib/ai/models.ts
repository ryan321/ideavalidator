// Per-role model routing — mimics IdeaProof's "best model for each job".
// Every role is overridable via env so you can paste current slugs from
// https://openrouter.ai/models without touching code.

// Roles (see docs/MODELS.md): scoring = accuracy/calibration-critical (validation, refine);
// writing = cheap/fast JSON + prose (evidence queries + ranking, the analysis Q&A chat).
export type ModelRole = "scoring" | "writing";

const DEFAULTS: Record<ModelRole, string> = {
  scoring: "anthropic/claude-sonnet-4.6",
  // gemini-2.5-flash intermittently truncates complex JSON; 3-flash is reliable.
  writing: "google/gemini-3-flash-preview",
};

const ENV_KEYS: Record<ModelRole, string> = {
  scoring: "MODEL_SCORING",
  writing: "MODEL_WRITING",
};

export function resolveModel(role: ModelRole): string {
  return process.env[ENV_KEYS[role]]?.trim() || DEFAULTS[role];
}
