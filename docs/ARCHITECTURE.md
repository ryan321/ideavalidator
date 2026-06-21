# IdeaValidator — Architecture & Build Plan

A **local, single-user** version of [IdeaProof.io](https://ideaproof.io/) for validating your own
ideas. No SaaS machinery (no auth, credits, billing, multi-tenancy). See
[IDEAPROOF_FEATURES.md](./IDEAPROOF_FEATURES.md) for the feature reference this clones.

Decisions (locked 2026-06-21): **local web app · OpenRouter · live web grounding · full suite.**

---

## Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | **Next.js 15 (App Router) + TypeScript** | One process does UI + server API routes; runs locally with `npm run dev`. |
| Styling | **Tailwind CSS** | Fast, good for the visual deliverables (reports, brand boards). |
| AI gateway | **OpenRouter** via the `openai` SDK | One key → Claude / GPT / Gemini / Grok. Per-stage model routing is a one-line model string. |
| Grounding | **OpenRouter web plugin** (`plugins: [{ id: 'web' }]`) | Live, cited web results with no extra API key. Tavily/Exa optional upgrade for targeted source scraping. |
| Storage | **SQLite** (`better-sqlite3`) | Single-file, synchronous, no server. Stores ideas + generated artifacts as JSON. |
| Structured output | **Zod schemas** + OpenRouter structured outputs | Every generator returns typed JSON, not prose to parse. |
| PDF export | Browser print stylesheet first; Puppeteer later | One-click investor PDF without heavy deps up front. |

All AI calls happen **server-side** (API routes) so the OpenRouter key never reaches the browser.

---

## Model routing (`lib/ai/models.ts`)

Mimics IdeaProof's "best model per stage." All swappable in one file.

| Role | Default model | Used by |
|------|---------------|---------|
| `reasoning` | `anthropic/claude-opus-4` | Validation scoring, business plan, brand strategy |
| `research` | web-plugin on any model (or `:online`) | Market analysis, demand/competitor grounding |
| `fast` | `google/gemini-2.5-flash` | Extraction, idea cleanup, name generation |
| `image` | image-capable model (or SVG via text model) | Logo / visual identity |

Each generator declares which role it needs; the client resolves role → model id.

---

## Directory layout

```
app/
  page.tsx                  # idea list / new-idea input
  idea/[id]/page.tsx        # idea dashboard (tabs per artifact)
  api/
    ideas/route.ts          # CRUD ideas
    generate/[kind]/route.ts# run a generator (validation, market, plan, ...)
  calculators/page.tsx      # the 9 free calculators
lib/
  ai/
    client.ts               # OpenRouter client (openai SDK)
    models.ts               # role -> model routing
    grounding.ts            # web-plugin helper
  generators/               # one module per artifact
    validation.ts           # prompt + Zod schema + runner
    market.ts
    plan.ts
    brand.ts
    logo.ts
    marketing.ts
    pitch.ts
  db.ts                     # better-sqlite3 setup + queries
components/                 # report cards, score gauge, brand board, etc.
docs/
```

---

## Data model (SQLite)

```
ideas        ( id, title, prompt, created_at )
artifacts    ( id, idea_id, kind, data_json, model, created_at )
```

`kind` ∈ { validation, market, plan, brand, logo, marketing, pitch }. One row per generated
artifact; re-running replaces/append-versions. The dashboard reads all artifacts for an idea.

---

## Generators (the suite)

Each is a typed function `run(idea, ctx) → ArtifactData`, a prompt, and a Zod schema:

1. **Validation** — 50+ criteria → viability score 0–100, confidence, GO/NO-GO, strengths,
   weaknesses, risks, suggestions, **cited sources** (grounded). *Built first — proves the pattern.*
2. **Market analysis** — TAM/SAM/SOM, competitor table + SWOT, ICP, pricing. (grounded)
3. **Business plan** — 8 sections (exec summary, model, GTM, financials, risk, …).
4. **Brand strategy** — archetype (12 Jungian), mission/vision, UVP, voice.
5. **Logo & visual identity** — SVG logo concepts, color palette (hex), typography pairing.
6. **Marketing suite** — ad creatives per platform, email sequences, UGC scripts.
7. **Pitch deck** — slide-by-slide investor deck.

Validation/market consume grounding; the rest consume prior artifacts as context (e.g. brand
reads the validation + market results) so the outputs are coherent across the suite.

## Calculators (no AI — pure formulas)

ROI, CAC, LTV, Runway, Valuation, Break-Even, Market Size, Funding, Equity/Cap Table.
Plain React widgets; cheapest, highest-trust features.

---

## Build order

1. Scaffold + Tailwind + env.
2. OpenRouter client + models + grounding helper.
3. SQLite + Idea model + dashboard shell.
4. **Validation engine end-to-end** (vertical slice: input → grounded report → rendered + stored).
5. Market → plan → brand → logo → marketing → pitch (reuse the slice pattern).
6. Calculators.
7. PDF export + polish + README.

---

## Config / secrets

`.env.local`:
```
OPENROUTER_API_KEY=sk-or-...        # required
OPENROUTER_APP_URL=http://localhost:3000   # optional, for OpenRouter attribution headers
```
No other secrets needed for v1 (web grounding rides on the OpenRouter key).
