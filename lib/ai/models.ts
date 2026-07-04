// Per-role model routing — mimics IdeaProof's "best model for each job".
// Every role is overridable via env so you can paste current slugs from
// https://openrouter.ai/models without touching code.

// Roles (see docs/MODELS.md): scoring = accuracy/calibration-critical (validation, refine);
// writing = cheap/fast JSON + prose (evidence queries + ranking, the analysis Q&A chat);
// audit = a SECOND, genuinely different model FAMILY used as a cross-family Goodhart check —
// it scores the same prompt+corpus, and the divergence is SURFACED (never averaged into the
// score). Default is a different family from the anthropic scorer (google gemini); override to
// gpt/grok/etc. to keep it a distinct family if the scoring model changes.
export type ModelRole = "scoring" | "writing" | "audit";

const DEFAULTS: Record<ModelRole, string> = {
  scoring: "anthropic/claude-sonnet-4.6",
  // gemini-2.5-flash intermittently truncates complex JSON; 3-flash is reliable.
  writing: "google/gemini-3-flash-preview",
  // Second-family audit judge — a different family from the scorer on purpose.
  audit: "google/gemini-3-flash-preview",
};

const ENV_KEYS: Record<ModelRole, string> = {
  scoring: "MODEL_SCORING",
  writing: "MODEL_WRITING",
  audit: "MODEL_AUDIT",
};

export function resolveModel(role: ModelRole): string {
  return process.env[ENV_KEYS[role]]?.trim() || DEFAULTS[role];
}
