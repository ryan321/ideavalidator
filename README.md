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

1. Describe an idea on the home page → creates an idea (version 1) and opens its workspace.
2. Click **Generate** on any tab, or **Generate all** to run the full suite (validation → market →
   financials → plan → brand → logo → marketing → pitch). Later stages reuse earlier results.
3. **Print / PDF** exports the active version's full report. `/calculators` has the 9 calculators.

## Versions & iteration

An idea is a container for **versions** (v1, v2, …), each with its own statement, artifacts, and
cached score. The version bar lets you switch between them; the best score is starred.

- **✎ Refine manually** — edit the statement → saves a new version to analyze.
- **✨ Suggest improvement** — the AI reads the current version's low scores + top risks and proposes
  a sharper statement (with rationale); accept it to create a version and validate.
- **⟳ Auto-iterate** — a hill-climb loop: validate + market-scan each candidate, refine to attack the
  weakest scores, repeat until it hits a target score or a max-round cap (defaults 80 / 5, editable).
  Runs client-side with a live log; the best version is highlighted at the end.

## How it works

- `lib/ai/` — OpenRouter client, per-stage model routing, structured-output + web-grounding helper.
- `lib/generators/` — one module per artifact (prompt + Zod schema + runner), plus `refine.ts`.
- `lib/db.ts` — SQLite: ideas → versions → artifacts (artifacts keyed by version), with a migration.
- `app/api/generate/[kind]` runs a generator for a version; `app/api/versions` + `.../refine` handle
  versioning and AI refinement proposals.
- `components/report/` — the visualization components (radar, charts, signal cards, risk matrix, …).
- Persisted artifacts are validated against the current schema on render; stale ones prompt a regen.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design and
[docs/IDEAPROOF_FEATURES.md](docs/IDEAPROOF_FEATURES.md) for the feature reference this clones.

## Notes

- Data lives in `data/ideavalidator.db` (gitignored). Delete it to reset.
- Generation cost depends on the models you route to; grounded steps (validation, market) call the
  web-search plugin and cost a bit more.
