# IdeaValidator

A **local, single-user** startup-idea validator inspired by [IdeaProof.io](https://ideaproof.io/) —
without the SaaS layer (no accounts, credits, or billing). Describe an idea, get a grounded, scored
GO/NO-GO report, then generate a full launch kit on demand: market analysis, business plan, brand
strategy, logo + visual identity, a marketing suite, and a pitch deck. Plus 9 startup calculators.

Everything runs on your machine and is stored in a local SQLite file. AI runs through
[OpenRouter](https://openrouter.ai/) (one key → Claude / GPT / Gemini / Grok), with live web-search
grounding so claims are backed by real sources.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · SQLite (better-sqlite3) · OpenRouter (OpenAI SDK).

## Setup

```bash
npm install                     # already done if you scaffolded here
cp .env.example .env.local      # then edit .env.local
```

Add your OpenRouter key to `.env.local`:

```
OPENROUTER_API_KEY=sk-or-...    # https://openrouter.ai/keys
```

Optionally override the per-stage models (defaults are sensible; paste current slugs from
<https://openrouter.ai/models> if any 404):

```
MODEL_REASONING=anthropic/claude-opus-4.8
MODEL_RESEARCH=anthropic/claude-sonnet-4.6
MODEL_FAST=google/gemini-2.5-flash
MODEL_IMAGE=google/gemini-2.5-flash-image-preview
```

## Run

```bash
npm run dev      # http://localhost:3000
```

1. Describe an idea on the home page → creates an idea and opens its workspace.
2. Click **Generate** on any tab, or **Generate all** to run the full suite (validation → market →
   plan → brand → logo → marketing → pitch). Later stages reuse earlier results for coherence.
3. **Print / PDF** exports the full stacked report. `/calculators` has the 9 calculators.

## How it works

- `lib/ai/` — OpenRouter client, per-stage model routing, structured-output + web-grounding helper.
- `lib/generators/` — one module per artifact (prompt + Zod schema + runner) and a registry.
- `lib/db.ts` — SQLite storage for ideas and their generated artifacts.
- `app/api/generate/[kind]` — runs a generator and persists the artifact.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design and
[docs/IDEAPROOF_FEATURES.md](docs/IDEAPROOF_FEATURES.md) for the feature reference this clones.

## Notes

- Data lives in `data/ideavalidator.db` (gitignored). Delete it to reset.
- Generation cost depends on the models you route to; grounded steps (validation, market) call the
  web-search plugin and cost a bit more.
