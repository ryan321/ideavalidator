# Model Selection Guide

How to choose and swap the LLMs this app uses, per role. Living doc — update the picks as you try
models. Catalog + benchmark research done **2026-06-22** against OpenRouter's live model list; prices and
preview slugs change, so re-check `https://openrouter.ai/api/v1/models` before relying on a number.

> The whole point of this doc: validation/refine **scoring** is the product, and for scoring **calibration
> (honesty) beats raw IQ**. Several cheap "smart" models hallucinate 90%+ and will inflate scores / invent
> evidence — fast and wrong. Spend where it matters (scoring), go cheap everywhere else.

---

## TL;DR — recommended config (premier, 2026-07-04)

| Role | Used by | Pick | $/Mtok (in/out) | Budget alt |
|------|---------|------|-----------------|------------|
| **scoring** | validation (grounded), refine, deep-mode bull/bear/reconcile | `anthropic/claude-opus-4.8` | 5 / 25 | `anthropic/claude-sonnet-5` (3/15, intro 2/10) |
| **writing** | evidence queries + ranking, analysis Q&A chat, deep-mode CoVe | `google/gemini-3-flash-preview` | 0.5 / 3 | keep — the cheap high-volume role |
| **audit** | the second-family Goodhart check (deep mode, every-3rd iterate round, calibrate) | `openai/gpt-5.1` | ~1.25 / 10 | `x-ai/grok-4.3` (any distinct family) |

**k = `SCORING_SAMPLES` = 2.** k-sample self-consistency exists to average out a *noisy* judge; Opus is a
strong single-sample scorer, so 2 cuts run-to-run noise without k=3's cost. Use 3 with a weaker/cheaper
scorer, 1 for single-sample.

**Why this shape.** Scoring **is** the product, so spend there: Opus 4.8 gives the best calibration and the
sharpest bull/bear/reconcile. Writing is high-volume and mechanical (queries, relevance/tier judgments) — a
fast Flash is correct, not a compromise. The **audit** role must be a **different model FAMILY** from
`scoring` (it catches scorer-specific Goodharting); GPT-5.1 was chosen over Gemini 3.1 Pro after a live probe:
**Gemini Pro fell back to prose under `json_object` mode** (the long-JSON flakiness that also dogs Flash),
while GPT-5.1 returned clean JSON. It also makes the pipeline **three distinct families** — Anthropic scorer +
Google CoVe + OpenAI audit — for maximum independence.

**Cost.** A standard validation was ~$0.13 on Sonnet 4.6; on Opus 4.8 at k=2 it's ~$0.20–0.30, a *deep* run
(bull + bear + reconcile + CoVe + audit) ~$0.60–0.90. Deep mode is opt-in / reserved for auto-iterate winners.

**Re-calibrate after any scoring-model or k change** — the 0-100 scale is tuned per model. Run
`npm run calibrate` (band assertions) and `npm run variance` (updates `MEASURED_SCORE_SD`).

Run validation + refine at **max reasoning effort** whatever model you pick, and keep the one self-repair retry.

---

## How routing works today & how to swap models

Per-role routing lives in [lib/ai/models.ts](../lib/ai/models.ts). Every role is **env-overridable**, so you
can experiment without touching code — set the var in `.env.local` and restart `npm run dev`.

The code has 3 roles:

| Env var | Role | Used by |
|---------|------|---------|
| `MODEL_SCORING` | scoring | validation (the one grounded pass), refine, deep-mode bull/bear/reconcile |
| `MODEL_WRITING` | writing | evidence query generation, evidence relevance ranking, the "Ask about this analysis" chat, deep-mode CoVe verification |
| `MODEL_AUDIT` | audit | the second-family audit judge (deep mode always; every 3rd auto-iterate round; per-fixture in `npm run calibrate`) |

```bash
# .env.local
MODEL_SCORING=anthropic/claude-opus-4.8
MODEL_WRITING=google/gemini-3-flash-preview
MODEL_AUDIT=openai/gpt-5.1        # must be a DIFFERENT family from MODEL_SCORING
SCORING_SAMPLES=2
```

---

## Per-role detail & rationale

### scoring — validation, refine (accuracy-critical)
The validator's value is **honest, conservative scoring**; refine must reason about *why* a criterion is low.
Calibration > raw reasoning here. Validation is also the app's one **grounded** call (the OpenRouter web
plugin is model-agnostic, so any pick stays grounded — you do *not* need a search-tuned model).

- **`anthropic/claude-sonnet-4.6`** ($3/$15) — best-calibrated model of 2026 (~38% AA-Omniscience hallucination,
  less than half of GPT-5.x; #1 on BullshitBench v2, "skeptic by default"). Still **½ of Opus**. Default pick.
- **`google/gemini-3.5-flash`** ($1.5/$9) — cheapest model that reasons reliably *and* stays calibrated
  (hallucination ~61% vs 91% for Gemini 3 Flash); ~5× under Opus. Best budget scoring pick.
- **`google/gemini-3.1-pro-preview`** ($2/$12) — strongest reasoning-per-dollar (GPQA ~94%, calibrated ~50%),
  ~6× under Opus; reach pick if you want more reasoning than 3.5 Flash.
- Cheaper-still, acceptable: `openai/gpt-5.4-mini` ($0.75/$4.5, GPT-5-thinking family has low hallucination
  with reasoning on). `grok-4.3` reasons fine but trails on strict rubric-following (IFEval 86.9%).
- **Avoid for scoring:** `deepseek/deepseek-v4-pro` (~94% hallucination → inflates scores, invents evidence),
  `google/gemini-3-flash-preview` (~91%). Note: validation runs **grounded** (web search), which cuts
  hallucination 73–86%, so these are *less* dangerous for validation than for the **ungrounded** refine step —
  refine is where calibration matters most.

### writing — evidence queries + ranking, analysis Q&A chat (cheap is fine)
Instruction-following and JSON reliability — not deep reasoning. The evidence calls are small (a query
list, a batch of 0–3 relevance ratings); the chat answers from the already-generated analysis.

- **`google/gemini-3-flash-preview`** ($0.5/$3) — current default. Reliable structured-JSON output and a
  solid conversational answerer for the chat. Use this.
- **`google/gemini-2.5-flash`** ($0.3/$2.5) — cheaper, but ⚠️ **observed live to intermittently emit a
  partial JSON object and stop** (finish=stop) on complex schemas. The evidence schemas are simple, so
  it's an acceptable budget pick here — expect the occasional repair retry.
- Ultra-budget: `deepseek/deepseek-v4-pro` ($0.43/$0.87) — great value but **verbose** (cap `max_tokens`).
  **Avoid `deepseek-v3.2`** for this app — its JSON mode "may return empty content," a real risk for
  Zod-validated output.

### audit — the second-family Goodhart check (surfaced, never averaged)
The audit judge scores the *same* prompt + corpus with a **different model family** and the tool
surfaces where it diverges from the primary scorer by more than 15 points per criterion — it never
changes the score or verdict. Because a scorer's biases are family-specific, the only requirement is
that `MODEL_AUDIT` be a **genuinely different family** from `MODEL_SCORING`; raw accuracy matters less
than independence. Cost is one banded pass, so a cheap family is fine.

- **`google/gemini-3-flash-preview`** ($0.5/$3) — default; a cheap, distinct family from the anthropic
  scorer. (Its high solo hallucination doesn't inflate scores here — the audit output is *diffed*, not
  trusted, and it can't move the verdict.)
- If you switch the scorer to a Google model, move the audit to `openai/gpt-5.4-mini` or `x-ai/grok-4.3`
  so the two stay cross-family.

---

## Pricing menu (curated candidates, json+tools, 2026-06-22)

Prices are $/Mtok input / output. Full live list: `curl https://openrouter.ai/api/v1/models`.

| Model | in | out | ctx | Good for | Notes |
|-------|----|----|-----|----------|-------|
| anthropic/claude-opus-4.8 | 5 | 25 | 1M | (overkill) | former default; drop it |
| anthropic/claude-sonnet-4.6 | 3 | 15 | 1M | **scoring** | best calibration |
| anthropic/claude-haiku-4.5 | 1 | 5 | 200K | writing | cheap Claude |
| google/gemini-3.1-pro-preview | 2 | 12 | 1M | scoring | strong + calibrated |
| google/gemini-3.5-flash | 1.5 | 9 | 1M | **scoring (budget)** | reasons + calibrated |
| google/gemini-3-flash-preview | 0.5 | 3 | 1M | **writing** | best value all-rounder |
| google/gemini-2.5-flash | 0.3 | 2.5 | 1M | **writing** | reliable workhorse |
| google/gemini-3.1-flash-lite | 0.25 | 1.5 | 1M | writing (cheapest) | format-adherent |
| openai/gpt-5.1 | 1.25 | 10 | 400K | scoring | strong reasoning |
| openai/gpt-5.4-mini | 0.75 | 4.5 | 400K | scoring (cheap) | low halluc w/ reasoning |
| openai/gpt-5-mini | 0.25 | 2 | 400K | writing (budget) | cheap, reliable JSON |
| openai/gpt-4.1-mini | 0.4 | 1.6 | 1M | writing | persuasive copy |
| x-ai/grok-4.3 | 1.25 | 2.5 | 1M | (writing only) | avoid for scoring; worst citation-fabrication |
| deepseek/deepseek-v4-pro | 0.43 | 0.87 | 1M | writing (ultra-budget) | verbose; AVOID scoring (94% halluc) |
| deepseek/deepseek-v3.2 | 0.23 | 0.34 | 131K | — | JSON mode can return empty; avoid |
| qwen/qwen3.7-plus | 0.32 | 1.28 | 1M | writing | cheapest reasoning-capable |
| qwen/qwen3-235b-a22b-thinking-2507 | 0.1 | 0.1 | 262K | writing (experiment) | absurdly cheap |
| z-ai/glm-5 | 0.6 | 1.92 | 203K | writing | cheap provider hedge |
| moonshotai/kimi-k2.5 | 0.38 | 2.02 | 262K | writing (experiment) | not top-ranked in value sweep |
| mistralai/mistral-medium-3.1 | 0.4 | 2 | 131K | writing | provider hedge |

**Best raw quality-per-dollar overall (frontier sweep):** `deepseek/deepseek-v4-pro` (AA Index 44 @ $0.43/$0.87,
AA's June-2026 value winner) and `google/gemini-3-flash-preview` (#1 price-rank, "most intelligent for its
price") — but remember V4-Pro's hallucination rules it out of scoring; it's a *writing*-tier value play.

---

## Experimenting over time

- Change a model = edit the `MODEL_*` var in `.env.local`, restart dev. No code change.
- Grounding (validation) rides OpenRouter's **model-agnostic web plugin**, so any pick stays grounded.
- To A/B a model on quality: create an idea, **Validate** it (or run the auto-iterate loop) on model A, then
  swap the env var and regenerate / run a second idea — compare scores, calibration, and whether competitors/
  figures are real. The validation score + "older format" schema-guard make regressions obvious.
- Watch for: empty/invalid JSON (schema-repair retries in logs), inflated scores (calibration regression),
  fabricated competitors/figures (grounding/honesty regression). Those are the signals a cheaper model is too cheap.

---

## Sources (2026)

Artificial Analysis (per-model pages, Intelligence Index, price-value ranks, AA-Omniscience hallucination) ·
anyapi.ai / codingfleet hallucination-index 2026 & BullshitBench v2 · benchlm.ai instruction-following &
"Best LLM for Writing 2026" · Simon Willison's Nov-2025 SVG benchmark · Columbia Journalism Review citation
test (Grok) · OpenRouter model catalog API. Several exact IFEval/IFBench numbers were unpublished at research
time — treat Intelligence-Index/hallucination figures as directional, and re-verify current preview slugs.
