# IdeaValidator — Architecture

A **local, single-user** idea validator (originally inspired by
[IdeaProof.io](https://ideaproof.io/), see [IDEAPROOF_FEATURES.md](./IDEAPROOF_FEATURES.md)) — no
SaaS machinery (no auth, credits, billing, multi-tenancy). The app is **validation-only**: it
answers "is there real, paying demand for this idea, relative to MY goal?" and helps iterate the
idea statement until the answer is good — it does not generate launch collateral.

---

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 16 (App Router) + React 19 + TypeScript** | One process does UI + server API routes; runs locally with `npm run dev`. |
| Styling | **Tailwind v4** | One shared design vocabulary across the report surfaces. |
| AI gateway | **OpenRouter** via the `openai` SDK | One key → Claude / GPT / Gemini / Grok. Per-role model routing is a one-line model string. |
| Grounding | **OpenRouter web plugin** (`plugins: [{ id: 'web' }]`) | Cited web results with no extra API key; `max_results` is set per call (validation uses 10). |
| Evidence | **Direct HN Algolia + Reddit API fetches** | Demand quotes/links are fetched by us, not asserted by the model — verifiably real. |
| Storage | **SQLite** (`better-sqlite3`) | Single-file, synchronous, no server. Ideas → versions → artifacts + evidence as JSON. |
| Structured output | **Zod schemas** + json_object mode | Every generation returns typed JSON with one self-repair retry. |
| PDF export | Browser print stylesheet | One-click report export without heavy deps. |

All AI calls happen **server-side** (API routes) so the OpenRouter key never reaches the browser.

---

## The journey

An **idea** is a container for **versions** (v1, v2, …) of its statement. Two stages:

1. **Validate** — one comprehensive grounded pass per version produces the `validation` artifact
   (the only artifact kind): verdict + 9 scored criteria, demand → willingness-to-pay → obtainable
   revenue, market & competition, money, risks, plan. The founder iterates: manual refine, AI
   "suggest a sharper version" (`refine.ts`), "respond to the validator" with authoritative
   context, or an auto-iterate hill-climb toward a target score.
2. **Decide** — mark the winning version; the others stay as research.

Scoring is **band-elicited, code-computed** (full rationale in [EVALUATION.md](./EVALUATION.md) —
authoritative). The model scores each of the 9 criteria goal-neutrally as a coarse letter band
(A+…F, rationale written first) against a frozen anchor panel; code maps bands to numbers,
weights them with an explicit per-criterion map modulated by the founder's goal, and applies
non-compensatory gates (fatal-criterion cap, GO demand/founder-fit floors, no-edge cap, Vitamin
demand clamp, goal-fit cap, unverified-Why-Now clamp). Verdict thresholds are **per-goal**
(e.g. venture GO ≥ 78, side hustle GO ≥ 66), with a fourth verdict — **INSUFFICIENT EVIDENCE** —
when computed confidence falls below the floor. Every fired rule lands on the artifact as a
visible `system_adjustment`. A sycophancy firewall (a fast-model pass rewrites the pitch into a
neutral claims brief the scorer judges) and a pre-scoring pre-mortem round out the pass. All
constants live in `lib/scoring.ts`; the UI imports the same module to publish the active
weights, bands, and gates ("How this is scored").

---

## The evidence pipeline (`lib/evidence/`)

The report's social proof is REAL fetched data. Flow, per version, before the validation LLM call
(`getEvidence(versionId) ?? collectEvidence(versionId)`):

1. **queries.ts** — the fast model turns the idea statement + goal into 4–8 keyword queries
   (pain phrases, competitor/alternative, willingness-to-pay), with a naive keyword fallback if
   that call fails. A fixed WTP phrase list ("i'd pay", "happily pay", …) flags items later.
2. **hn.ts / reddit.ts** — each query fans out (`Promise.allSettled`) to the HN Algolia API
   (stories + comments, free, no auth) and the Reddit search API (OAuth2 client-credentials from
   `REDDIT_CLIENT_ID/SECRET`; skipped gracefully when absent, surfaced as a "Reddit not connected"
   hint). Permalinks are constructed from API fields — never model output. 8s timeouts; failures
   collect into `stats.errors`, never throw.
3. **rank.ts** — dedupe by url, one fast-model batch call rates each item's relevance 0–3 vs the
   statement, drop 0s, sort (WTP first, then relevance / engagement / recency), keep top ~30,
   assign stable ids `E1..En`.
4. The corpus persists in the `evidence` table (version-keyed) and is injected into the validation
   prompt as numbered items with source/community/engagement/date/url.

**Trust boundary:** the model must cite demand signals by `evidence_id` only. After generation the
server rewrites each signal's url/source/engagement from the corpus and **drops any signal citing
an unknown id** — a model-invented link can never render. **Confidence is computed**, not
self-reported: corpus contribution (0–60, from relevant-item count + community spread + WTP count)
+ web-citation contribution (0–25) + at most 15 from the model's self-report (see
`computeConfidence` in `lib/generators/index.ts`).

The UI labels provenance honestly: fetched items get "Fetched · Reddit/Hacker News" badges with
real vote/comment counts; model-synthesized figures (TAM/SAM/SOM, search trend, momentum,
competitors) are tagged "model estimate — see sources". A collapsible Evidence section shows the
whole corpus (WTP items pinned first), collection stats/errors, and a refresh button
(`POST /api/versions/[id]/evidence`). `refine.ts` receives a compact corpus digest so refinements
attack weaknesses with real quotes.

---

## Model routing (`lib/ai/models.ts`)

| Role | Default model | Used by |
|------|---------------|---------|
| `scoring` | `anthropic/claude-sonnet-4.6` | validation, refine (calibration-critical) |
| `writing` | `google/gemini-3-flash-preview` | evidence queries + ranking, analysis Q&A chat (cheap/fast) |

All overridable via `MODEL_SCORING` / `MODEL_WRITING`. See [MODELS.md](./MODELS.md).

---

## Directory layout

```
app/
  page.tsx                        # idea list / new-idea input
  idea/[id]/page.tsx              # idea workspace (versions, report, iterate)
  api/
    ideas/route.ts                # list/create ideas
    ideas/[id]/route.ts           # idea + versions + artifacts + evidence; PATCH/DELETE
    generate/[kind]/route.ts      # run the validation generator (background-job capable)
    versions/route.ts             # create a version
    versions/[id]/route.ts        # delete a version
    versions/[id]/refine/route.ts # AI refinement proposal
    versions/[id]/ask/route.ts    # Q&A about the analysis
    versions/[id]/evidence/route.ts # re-collect the evidence corpus
lib/
  ai/
    client.ts                     # OpenRouter client: structured output, web plugin, usage
    models.ts                     # role -> model routing
  evidence/
    types.ts                      # EvidenceItem / EvidenceCorpus
    queries.ts                    # fast-model query generation + WTP phrase list
    hn.ts                         # HN Algolia search
    reddit.ts                     # Reddit OAuth client-credentials search
    rank.ts                       # dedupe + relevance ranking + E-ids
    index.ts                      # collectEvidence + prompt block + refine digest
  generators/
    validation.ts                 # the one generator: prompt + Zod schema
    anchors.ts                    # frozen calibration vignettes (the anchor panel)
    refine.ts                     # statement-refinement proposals
    ask.ts                        # grounded Q&A over the artifacts
    shared.ts                     # GenContext, goal rubrics, competition guidance
    index.ts                      # runGenerator: evidence injection, signal rewrite,
                                  # score + confidence recompute
  db.ts                           # better-sqlite3 setup + queries
  scoring.ts                      # ALL scoring constants: band map, weights, per-goal
                                  # verdict bands, gates, measured score SD
components/
  IdeaWorkspace.tsx               # the workspace: versions, iterate, report shell
  artifacts.tsx                   # ValidationView (the report)
  report/                         # radar, factor bars, market sizing, risk matrix,
                                  # scorecard, evidence panel
docs/
```

---

## Data model (SQLite, `data/ideavalidator.db`)

```
ideas      ( id, title, prompt, goal, goal_detail, stage, chosen_version_id, founder_fit, created_at )
versions   ( id, idea_id, n, statement, label, origin, parent_id, rationale, context, score, revenue, created_at )
artifacts  ( id, version_id, kind='validation', data_json, sources_json, model, cost, tokens, created_at )
evidence   ( version_id PK, data /* EvidenceCorpus JSON */, created_at )
usage_log  ( one row per LLM call — the source of truth for spend )
messages   ( version-keyed Q&A chat )
jobs       ( version_id+kind → running/done/error, so long analyses survive navigation )
```

Artifacts and evidence are version-keyed; deleting an idea/version cascades. Persisted artifacts
are validated against the current Zod schema on render — stale ones prompt a regenerate instead of
crashing.

---

## Config / secrets (`.env.local`)

```
OPENROUTER_API_KEY=sk-or-...               # required
OPENROUTER_APP_URL=http://localhost:3000   # optional, attribution headers
MODEL_SCORING / MODEL_WRITING              # optional model overrides
REDDIT_CLIENT_ID / REDDIT_CLIENT_SECRET    # optional — enables Reddit evidence
```
