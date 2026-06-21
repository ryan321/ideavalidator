# IdeaProof.io — Feature Capture

> Reference doc for building a personal version of [IdeaProof.io](https://ideaproof.io/).
> Captures what the product does, how it works, and which pieces matter for a self-hosted clone.
> Researched 2026-06-21.

---

## 1. What it is

IdeaProof is an AI-powered platform that takes a one-sentence startup idea (or a URL) and
returns a **validation report** plus a suite of launch-ready business materials. The pitch is
"idea → launch-ready in ~30 minutes, for €20–100, instead of 3–6 months and €10k+ of agency work."

The core loop: **describe an idea → multi-model AI analysis → scored GO/NO-GO report → optionally
generate market analysis, business plan, brand, logo, marketing, and pitch deck.**

Headline claims (their marketing, not verified): 46,000+ ideas validated, 89% alignment with
founder-verified outcomes, 4.8/5 rating, results in ~120 seconds.

---

## 2. Core user flow (the 10 steps)

| # | Step | ~Time | Credits |
|---|------|-------|---------|
| 1 | Describe idea (one sentence or URL; platform auto-extracts context) | 20s | — |
| 2 | Multi-model AI analysis | 60s | — |
| 3 | **Validation report** (the core deliverable) | 40s | 40 |
| 4 | Market analysis (TAM/SAM/SOM, competitors) | — | 100 |
| 5 | Business plan (8-section, investor-ready) | — | 100 |
| 6 | Brand strategy (archetype, mission, voice) | — | 50 |
| 7 | Logo & visual identity | — | 150 |
| 8 | Marketing suite (ads, email, UGC) | — | 250 |
| 9 | Pitch deck + landing page | — | 120 |
| 10 | Ship | — | — |

Progress is saved at each checkpoint so the user can stop and resume.

---

## 3. Feature breakdown

### 3.1 Validation Engine (the heart of the product)
- Analyzes the idea across **50+ validation criteria** spanning market demand, feasibility, and competition.
- Outputs:
  - **Viability score** 0–100 with a confidence %.
  - **GO / NO-GO verdict.**
  - **Strengths, weaknesses, risk flags.**
  - **Actionable improvement suggestions.**
  - **Risk-mitigation strategies.**
- Each claim is **cited to a source** (for investor credibility).
- Matches the idea against known **failure patterns** (see Failure Atlas below).

### 3.2 Market & Competitor Analysis
- TAM / SAM / SOM calculations.
- Competitive landscape mapping + competitor SWOT.
- Target-audience demographics / ICP.
- Pricing-strategy recommendations.
- Real-time trend data.

### 3.3 Business Plan Generator
- 8-section investor-ready plan: executive summary, business model, GTM strategy,
  financial projections / revenue model, risk analysis, contingency planning.

### 3.4 Brand Strategy & Identity
- Brand archetype (12 Jungian options).
- Mission / vision statements, unique value proposition.
- Brand voice + messaging guidelines.

### 3.5 Logo & Visual Identity
- AI-generated logo concepts.
- Color palette with hex codes.
- Typography / font pairing.
- Responsive landing-page mockups (desktop + mobile).

### 3.6 Marketing & Ad Creatives Suite
- Platform-optimized ad creatives for Meta, Google, LinkedIn, TikTok, YouTube, Instagram.
- Conversion-optimized landing-page copy.
- Email nurturing sequences (welcome / value / hard-offer).
- UGC video scripts with platform-specific hooks.

### 3.7 Pitch Deck + Landing Page
- Generated investor deck and a shippable landing page.

---

## 4. AI architecture (how it works under the hood)

**Multi-model orchestration** — routes each stage to the model best suited for it, with
automatic fallback if one fails (this is their main "reduces hallucination" selling point):

| Model | Role |
|-------|------|
| Claude (Anthropic) | Deep reasoning |
| GPT (OpenAI) | Web research |
| Gemini (Google) | Fast extraction |
| Grok (xAI) | Cross-validation / cross-check |

**Process:** demand analysis → competitor footprint scan → pricing benchmarks → weighted
viability score, with every claim cited.

> Note: model versions cited on their site (e.g. "Claude 3.5 Sonnet", "GPT-4 Turbo", "Gemini 3 Pro")
> are dated/inconsistent marketing copy. For a build today, default to the latest frontier models
> (e.g. Claude Opus 4.x). See [docs/PERSONAL_BUILD.md] notes below.

---

## 5. Data sources

- **Live web scraping** from ~8 sources: Reddit, X/Twitter, Product Hunt, G2, App Store, Upwork, YouTube, LinkedIn.
- Aggregated "50+ authoritative sources" for market data.
- **Ideas Database:** 3,200+ pre-validated ideas across 30 industries, browsable by industry / ICP / traction stage.
- **Failure Atlas:** 1,000+ startup post-mortems with root-cause analysis; ideas are matched against these patterns.
- Knowledge Hub covering SaaS, B2B SaaS, Fintech, AI/ML, Marketplaces, E-commerce, HealthTech, EdTech, PropTech, CleanTech.

---

## 6. Supporting tools

**13 AI generators** (credit cost): Startup Idea Generator (10), Idea Validator (35),
Market Analysis (100), Brand Strategy (50), Logo Generator (150), Visual Identity (150),
Marketing Suite (250), Ad Creatives (250), Email Sequences (250), UGC Scripts (250),
Business Name Generator (5), Lean Canvas Builder (15), Business Plan Generator (100).

**9 free calculators** (no AI, pure formulas): ROI, CAC, LTV, Runway, Valuation,
Break-Even, Market Size, Funding, Equity/Cap Table.

These calculators are the cheapest, highest-trust features to clone — pure math, no LLM cost.

---

## 7. Monetization model (credits)

- **Free tier:** 90 credits at signup (~2 validations), no card required.
- **One-time credit packs** (12-month validity):
  - Starter €19.99 → 150 credits (1 validation + market analysis)
  - Builder €49.99 → 700 credits (2 validations, 1 plan, brand + marketing)
  - Founder €99.99 → 1,500 credits (5 validations, 3 market analyses, 2 plans, full brand & marketing)
- Credit costs per action are listed in §2 / §6.
- Deliverables export to **investor-ready PDF** in one click; users retain 100% ownership;
  platform claims it never trains on user idea content.

---

## 8. Target audience

Solo founders, co-founder teams, pre-seed/seed founders, founders without consulting budget,
and non-technical founders who need rapid market research.

---

## 9. Notes for a *personal* version

Scoping guidance — what actually matters if you're building this for yourself rather than as a SaaS:

**Build the core, skip the storefront.** The entire credit system, billing, multi-tier pricing,
and "10,000+ users" social proof are SaaS-business scaffolding. For personal use, drop all of it.

**MVP = the validation engine only (§3.1).** One input box → one scored report. Everything else
(brand, logo, marketing, pitch deck) is downstream content generation you can add incrementally.

**Suggested phased build:**
- **Phase 1 — Validator:** idea input → single LLM call (or a small chain) → structured JSON report
  (score, verdict, strengths, weaknesses, risks, suggestions). Render as a page + PDF export.
- **Phase 2 — Grounding:** add real data so the report isn't pure model speculation —
  web search + a few targeted scrapes (Reddit/Product Hunt/HN demand signals, competitor lookup).
  Cite sources. This is what separates a real validator from a "ChatGPT prompt."
- **Phase 3 — Market analysis:** TAM/SAM/SOM + competitor table.
- **Phase 4 — Calculators:** trivial, pure-formula React/CLI widgets; high value, zero LLM cost.
- **Phase 5 — Content generators:** business plan, brand, marketing copy (straightforward
  prompt-per-artifact once the validation context exists).

**Simplifications for a personal build:**
- Single frontier model instead of 4-model orchestration. Orchestration is mostly a marketing
  differentiator; a strong single model + web search covers it. Add a second model only as a
  cross-check on the final score if you want the "reduce hallucination" property.
- No credit metering — just call the API directly.
- Local storage / single-user; no auth needed.
- The "Failure Atlas" and "Ideas Database" can start as a small curated list or be skipped;
  the failure-pattern matching can be folded into the validation prompt.

**Open design questions to decide before building:**
- Delivery surface: CLI, local web app, or hosted? (repo name `ideavalidator` suggests an app.)
- Which model(s) and whether to wire in live web search for grounding.
- Report format: interactive web page, Markdown, and/or PDF export.
- How much real data vs. pure model reasoning — the single biggest quality lever.

---

## Sources

- [IdeaProof.io homepage](https://ideaproof.io/)
- [IdeaProof.io blog](https://ideaproof.io/blog)
- [AlternativeTo — IdeaProof](https://alternativeto.net/software/ideaproof-io/about/)
- [WorthBuild — 2026 idea-validation tools comparison](https://worthbuild.io/blog/best-startup-idea-validation-tools-2026-comparison)
- [dang.ai — IdeaProof listing](https://dang.ai/tool/ai-idea-validation-market-analysis-ideaproof-io)
