# IdeaValidator

A **local, single-user** startup-idea validator. Describe an idea and your goal (side hustle →
venture scale), get a grounded, scored GO/MAYBE/NO-GO report — demand, obtainable revenue, market
& competition, money, risks, and a plan — then iterate the idea statement until it clears the bar.

Everything runs on your machine and is stored in a local SQLite file. AI runs through
[OpenRouter](https://openrouter.ai/) (one key → Claude / GPT / Gemini / Grok), with live web-search
grounding. Demand evidence is **fetched, not asserted**: the app searches the Hacker News and
Reddit APIs itself, so every quote, link, and vote count in the report is verifiably real.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind v4 · SQLite (better-sqlite3) · OpenRouter (OpenAI SDK).

## Setup

```bash
npm install
cp .env.example .env.local      # then edit .env.local
```

Add your OpenRouter key to `.env.local`:

```
OPENROUTER_API_KEY=sk-or-...    # https://openrouter.ai/keys
```

Optional — connect Reddit for the evidence pipeline (without it, evidence comes from Hacker News
only and the report shows a "Reddit not connected" hint). Create a free "script" app at
<https://www.reddit.com/prefs/apps> and add:

```
REDDIT_CLIENT_ID=...
REDDIT_CLIENT_SECRET=...
```

Optional — override the per-role models (defaults are sensible; paste current slugs from
<https://openrouter.ai/models> if any 404):

```
MODEL_SCORING=anthropic/claude-sonnet-4.6       # validation, refine
MODEL_WRITING=google/gemini-3-flash-preview     # evidence queries + ranking, chat
```

## Run

```bash
npm run dev      # http://localhost:3000
```

1. Describe an idea on the home page → creates an idea (version 1) and opens its workspace.
2. **Validate** — one comprehensive grounded pass: the app fetches an evidence corpus (real
   Reddit/HN posts, each tiered by what it actually shows — T1 money/behavior … T4 compliment),
   the model bands 10 criteria goal-NEUTRALLY against a frozen anchor panel, and the system maps
   bands to scores, weights them for your goal, and applies non-compensatory gates (a fatal flaw
   can kill the verdict; see docs/EVALUATION.md). The report leads with the **kill-test** — the
   riskiest assumption and the cheapest ≤1-week way to test it, with pre-registered pass/kill
   thresholds — then the verdict, obtainable revenue, market, money, risks, and plan. Confidence
   is computed from the evidence, not self-reported — and when it's too low, the verdict is
   INSUFFICIENT EVIDENCE instead of a guess.
3. Iterate: refine manually, let the AI suggest a sharper version, respond to the validator with
   context, or auto-iterate toward a target score. Each try is a new version you can compare.
4. **Decide** — mark the winning version. **Print / PDF** exports the active version's report.

## The evidence pipeline

Before each validation, `lib/evidence/` builds a corpus for the version:

- a fast model turns the idea statement into 4–8 keyword queries (pain phrases, competitor
  alternatives, willingness-to-pay phrases);
- the queries fan out to the HN Algolia API and the Reddit search API (OAuth client-credentials,
  skipped gracefully when creds are absent);
- results are deduped, relevance-ranked (one fast-model batch call), flagged for
  willingness-to-pay language, and stored per version as numbered items `[E1..En]`.

The validation prompt includes the corpus and the model must cite demand signals by id; the server
rewrites every citation's URL/engagement from the corpus and **drops signals citing unknown ids**,
so an invented link can never render. The report's Evidence section shows the full corpus with a
refresh button, and model-synthesized figures (TAM/SAM/SOM, trends, competitors) are labeled
"model estimate — see sources".

## How it works

- `lib/ai/` — OpenRouter client (structured output + web-grounding), per-role model routing.
- `lib/evidence/` — query generation, HN + Reddit search, dedupe/rank, corpus types.
- `lib/generators/` — the validation generator (prompt + Zod schema), `refine.ts` (statement
  refinement, fed a corpus digest), `ask.ts` (Q&A about the analysis).
- `lib/db.ts` — SQLite: ideas → versions → artifacts + evidence (both keyed by version).
- `app/api/` — `generate/[kind]` runs validation (background-job capable); `versions` + `.../refine`
  + `.../evidence` handle versioning, refinement proposals, and evidence refresh.
- `components/report/` — the report visuals (radar, factor bars, market sizing, risk matrix,
  evidence panel, …). Persisted artifacts are schema-checked on render; stale ones prompt a regen.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design.

## Calibration harness

`npm run calibrate -- --yes` scores 14 known-outcome fixture ideas (Airbnb-2008-style winners,
Juicero/Quibi-style failures, tarpits, absurdities) and asserts each lands in its expected verdict
band; `npm run variance -- --yes` measures run-to-run score SD (pinned evidence) and prints the
`MEASURED_SCORE_SD` to set in `lib/scoring.ts` (it drives auto-iterate's acceptance margin). Both
spend OpenRouter credit and require `--yes`.

## Notes

- Data lives in `data/ideavalidator.db` (gitignored). Delete it to reset.
- Cost depends on the models you route to; the grounded validation pass calls the web-search
  plugin (10 results) and costs the most. Evidence queries/ranking use the cheap writing model.
