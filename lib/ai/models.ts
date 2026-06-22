// Per-stage model routing — mimics IdeaProof's "best model for each job".
// Every role is overridable via env so you can paste current slugs from
// https://openrouter.ai/models without touching code.

// Roles (see docs/MODELS.md): scoring = accuracy/calibration-critical (validation, refine);
// research = grounded web synthesis (market); writing = cheap long-form + JSON (everything else).
export type ModelRole = "scoring" | "research" | "writing";

const DEFAULTS: Record<ModelRole, string> = {
  scoring: "anthropic/claude-sonnet-4.6",
  research: "google/gemini-3-flash-preview",
  writing: "google/gemini-2.5-flash",
};

const ENV_KEYS: Record<ModelRole, string> = {
  scoring: "MODEL_SCORING",
  research: "MODEL_RESEARCH",
  writing: "MODEL_WRITING",
};

export function resolveModel(role: ModelRole): string {
  return process.env[ENV_KEYS[role]]?.trim() || DEFAULTS[role];
}
