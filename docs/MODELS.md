# Model Selection Guide

How to choose and swap the LLMs this app uses, per stage. Living doc — update the picks as you try
models. Catalog + benchmark research done **2026-06-22** against OpenRouter's live model list; prices and
preview slugs change, so re-check `https://openrouter.ai/api/v1/models` before relying on a number.

> The whole point of this doc: validation/refine **scoring** is the product, and for scoring **calibration
> (honesty) beats raw IQ**. Several cheap "smart" models hallucinate 90%+ and will inflate scores / invent
> evidence — fast and wrong. Spend where it matters (scoring), go cheap everywhere else.

---

## TL;DR — recommended config

| Role | Stages | Pick | $/Mtok (in/out) | Budget alt |
|------|--------|------|-----------------|------------|
| **scoring** | validation, refine | `anthropic/claude-sonnet-4.6` | 3 / 15 | `google/gemini-3.5-flash` (1.5/9) |
| **research** | market | `google/gemini-3-flash-preview` | 0.5 / 3 | `openai/gpt-5-mini` (0.25/2) |
| **writing** | plan, brand, marketing, pitch, financials, logo | `google/gemini-2.5-flash` | 0.3 / 2.5 | `deepseek/deepseek-v4-pro` (0.43/0.87, verbose) |

vs. today's **all-Opus-4.8** ($5/$25): a full 8-artifact run drops from **~$0.55–0.70 → ~$0.13–0.15**
(~4–6× cheaper), and the auto-iterate loop (validation+market every round) saves the most.

Run validation + refine at **max reasoning effort** whatever model you pick, and keep the one self-repair retry.

---

## How routing works today & how to swap models

Per-stage routing lives in [lib/ai/models.ts](../lib/ai/models.ts). Every role is **env-overridable**, so you
can experiment without touching code — set the var in `.env.local` and restart `npm run dev`.

**Current code** has 4 roles, and almost every generator uses `reasoning`:

| Env var | Role | Used by |
|---------|------|---------|
| `MODEL_REASONING` | reasoning | validation, refine, financials, plan, brand, logo, marketing, pitch |
| `MODEL_RESEARCH` | research | market |
| `MODEL_FAST` | fast | (defined, currently unused) |
| `MODEL_IMAGE` | image | (defined, currently unused — logo is text-SVG) |

So **today** the cheapest quick win is just two env vars — point `MODEL_REASONING` at a cheaper model and
`MODEL_RESEARCH` at the grounded pick:

```bash
# .env.local  (coarse: one model for everything except market)
MODEL_REASONING=anthropic/claude-sonnet-4.6
MODEL_RESEARCH=google/gemini-3-flash-preview
```

**Recommended refactor** (finer control + most of the savings): split `reasoning` into `scoring` (validation,
refine) and `writing` (the rest). That needs a small change — rename the role in `models.ts`, flip the
`role:` field in the 9 generator files + `refine.ts`, and add `MODEL_SCORING` / `MODEL_WRITING` env vars.
Then:

```bash
MODEL_SCORING=anthropic/claude-sonnet-4.6
MODEL_RESEARCH=google/gemini-3-flash-preview
MODEL_WRITING=google/gemini-2.5-flash
```

---

## Per-role detail & rationale

### scoring — validation, refine (accuracy-critical)
The validator's value is **honest, conservative scoring**; refine must reason about *why* a criterion is low.
Calibration > raw reasoning here.

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

### research — market analysis (grounded, live web search)
Bottleneck is honest synthesis of many retrieved snippets into structured JSON + long context.

- **`google/gemini-3-flash-preview`** ($0.5/$3) — best grounded-synthesis value: 1M context, top
  Google-Search grounding, strong knowledge accuracy; its ungrounded hallucination weakness is moot with
  web access on. Default.
- **`openai/gpt-5-mini`** ($0.25/$2) — cheapest reasoning-capable option with reliable JSON; smaller 400K
  context, slightly weaker synthesis. Good for high-volume.
- **`google/gemini-3.1-pro-preview`** ($2/$12) — best long-context retrieval (MRCR 1M ~85%) + calibration;
  use when honest, deep synthesis matters most.
- The OpenRouter **web plugin is model-agnostic** — you do *not* need a search-tuned model; skip
  `gpt-4o-search-preview` (older GPT-4o-class, worse value). **Avoid Grok here** (worst citation-fabrication
  in journalism tests).

### writing — plan, brand, marketing, pitch, financials, logo (cheap is fine)
Instruction-following, on-brand voice, and JSON reliability — not deep reasoning.

- **`google/gemini-2.5-flash`** ($0.3/$2.5) — cheapest reliable workhorse; "complete, accurate, compliant
  outputs without extra prompting," very dependable JSON. Default for the bulk of calls.
- **`google/gemini-3-flash-preview`** ($0.5/$3) — a notch more quality (Arena Creative Writing ~1461,
  "~85% of Pro at 40% of cost"); use if copy quality matters more than the last penny.
- **`google/gemini-3.5-flash`** ($1.5/$9) — near-Pro format/persona adherence; reserve for highest-stakes
  brand/pitch only.
- For brand/marketing *voice* specifically, `openai/gpt-4.1-mini` ($0.4/$1.6) is noted strong and is a good
  provider-diversification hedge. Ultra-budget: `deepseek/deepseek-v4-pro` ($0.43/$0.87) — great value but
  **verbose** (cap `max_tokens`). **Avoid `deepseek-v3.2`** for this app — its JSON mode "may return empty
  content," a real risk for Zod-validated output.

### logo — keep SVG-via-text (do NOT switch to an image model)
A logo is a *simple* single SVG mark — the easy tier where cheap reasoning-capable models succeed.
- Use the **`writing` model** (Gemini writes clean SVG; Gemini Pro/Flash topped Simon Willison's SVG benchmark).
  `z-ai/glm-5` ($0.6/$1.92) is the cheap-SVG champ by lineage (GLM-4.6 was 2nd of 9 frontier models) but
  unverified at v5 — use Gemini if you want only-verified.
- **Don't use an image model** (`gemini-*-flash-image`, `gpt-5-image-mini`): they return **raster PNG**, not
  editable vectors — you'd lose infinite scaling / CSS recoloring / tiny files and need a lossy trace step.
  Only consider one if you later want photoreal brand *imagery* rather than a clean mark.

---

## Pricing menu (curated candidates, json+tools, 2026-06-22)

Prices are $/Mtok input / output. Full live list: `curl https://openrouter.ai/api/v1/models`.

| Model | in | out | ctx | Good for | Notes |
|-------|----|----|-----|----------|-------|
| anthropic/claude-opus-4.8 | 5 | 25 | 1M | (overkill) | current default; drop it |
| anthropic/claude-sonnet-4.6 | 3 | 15 | 1M | **scoring** | best calibration |
| anthropic/claude-haiku-4.5 | 1 | 5 | 200K | writing | cheap Claude |
| google/gemini-3.1-pro-preview | 2 | 12 | 1M | scoring/research | strong + calibrated |
| google/gemini-3.5-flash | 1.5 | 9 | 1M | **scoring (budget)** | reasons + calibrated |
| google/gemini-3-flash-preview | 0.5 | 3 | 1M | **research / writing** | best value all-rounder |
| google/gemini-2.5-flash | 0.3 | 2.5 | 1M | **writing** | reliable workhorse |
| google/gemini-3.1-flash-lite | 0.25 | 1.5 | 1M | writing (cheapest) | format-adherent |
| openai/gpt-5.1 | 1.25 | 10 | 400K | scoring | strong reasoning |
| openai/gpt-5.4-mini | 0.75 | 4.5 | 400K | scoring (cheap) | low halluc w/ reasoning |
| openai/gpt-5-mini | 0.25 | 2 | 400K | research (budget) | cheap, reliable JSON |
| openai/gpt-4.1-mini | 0.4 | 1.6 | 1M | writing (brand voice) | persuasive copy |
| x-ai/grok-4.3 | 1.25 | 2.5 | 1M | (writing only) | avoid for scoring/research |
| deepseek/deepseek-v4-pro | 0.43 | 0.87 | 1M | writing (ultra-budget) | verbose; AVOID scoring (94% halluc) |
| deepseek/deepseek-v3.2 | 0.23 | 0.34 | 131K | — | JSON mode can return empty; avoid |
| qwen/qwen3.7-plus | 0.32 | 1.28 | 1M | writing | cheapest reasoning-capable |
| qwen/qwen3-235b-a22b-thinking-2507 | 0.1 | 0.1 | 262K | writing (experiment) | absurdly cheap |
| z-ai/glm-5 | 0.6 | 1.92 | 203K | logo / writing | strong SVG lineage |
| moonshotai/kimi-k2.5 | 0.38 | 2.02 | 262K | writing (experiment) | not top-ranked in value sweep |
| mistralai/mistral-medium-3.1 | 0.4 | 2 | 131K | writing | provider hedge |

**Best raw quality-per-dollar overall (frontier sweep):** `deepseek/deepseek-v4-pro` (AA Index 44 @ $0.43/$0.87,
AA's June-2026 value winner) and `google/gemini-3-flash-preview` (#1 price-rank, "most intelligent for its
price") — but remember V4-Pro's hallucination rules it out of scoring/research; it's a *writing*-tier value play.

---

## Experimenting over time

- Change a model = edit the `MODEL_*` var in `.env.local`, restart dev. No code change.
- Grounding (`market`, `validation`) rides OpenRouter's **model-agnostic web plugin**, so any pick stays grounded.
- To A/B a model on quality: create an idea, **Generate all** (or run the auto-iterate loop) on model A, then
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
