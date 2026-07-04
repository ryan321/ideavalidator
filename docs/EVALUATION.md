# IdeaValidator — Evaluation Framework

The durable reference for **how this tool scores an idea**: what each criterion measures, how
bands become numbers, where the founder's goal enters, which code-level gates can kill a verdict,
and why the framework is built this way. Companion to [ARCHITECTURE.md](./ARCHITECTURE.md) (the
plumbing) and [MODELS.md](./MODELS.md) (per-role model routing).

Status: **Wave 1** of a three-wave redesign is the implemented baseline described here. The
[roadmap](#roadmap--waves-2-and-3) lists what Waves 2 and 3 add.

---

## Design principles

1. **Separate measurement from valuation.** Criteria scores measure what the evidence shows,
   goal-neutrally. The founder's goal enters only through explicit per-goal weight vectors,
   verdict bands, and a Goal Fit gate — all applied in code. Goal-contaminated criteria destroy
   comparability between runs and between ideas.
2. **Non-compensatory where reality is non-compensatory.** The weighted mean stays as the
   readable backbone, but code-level gates (fatal-criterion cap, demand floor, no-edge cap,
   goal-mismatch cap, confidence floor) make "all-85 demand + Founder Fit 20 = GO" impossible.
   A fatal flaw must be able to kill a verdict.
3. **Every invariant the prompt states, the code enforces.** Vitamin caps Demand Strength,
   revenue math must multiply, competitor count feeds confidence, thin-corpus dimensions score
   lower. `enrichDemandSignals` proved the pattern; the gates and lint extend it. Prompt-only
   rules are decorative.
4. **Scores are anchored comparisons, not vibes.** The judge scores against a frozen panel of
   known-outcome anchor ideas, writes rationale first, emits coarse bands (F..A+), and code maps
   bands to 0–100. Never force a distribution — histogram/SD monitoring is a drift alarm only.
5. **Reliability bounds validity.** Measure test–retest noise, display scores as bands
   (68 ± measured SD), and never let any loop accept a delta smaller than the measured noise.
6. **Founder assertions are typed evidence, not truth.** Authoritative about their own skills,
   network, capital, and intent; hypotheses about customers, competitors, and willingness to
   pay. Untiered enthusiasm can never raise a score. (Full Mom-Test tier ledger lands in Wave 2.)
7. **The deliverable is a decision plus the cheapest way to change it.** Every verdict should
   ship with the riskiest assumption, a ≤1-week kill-test routed to the corpus communities, and
   "what evidence would flip this" — re-validation ingests observed results, not re-argument.
   (The `next_test` block is Wave 2; Wave 1 lays the scoring ground it depends on.)
8. **Uncertainty is legible and load-bearing.** Confidence gates the verdict (a fourth
   INSUFFICIENT EVIDENCE state), silent-zero failure modes become loud flags, and disagreement
   is surfaced instead of averaged away.
9. **Weight tracks evidence-groundability and empirical predictiveness — and the weights are
   published in the UI.** Demand and WTP heaviest; novelty, pedigree, plan polish, and TAM size
   near zero. No hidden multipliers.
10. **Optimize the idea, not the grader.** The refine loop never sees the scoring rubric
    verbatim, may not invent founder capabilities, and its real output is a claims-diff — the
    score alone is never the loop's deliverable.

---

## The 9 criteria (Wave 1 definitions)

Two presentation groups (demand / build) survive **as UI grouping only** — weighting is a
per-criterion map (below), not group membership.

| # | Criterion | Group | Measures |
|---|-----------|-------|----------|
| 1 | Demand Strength | demand | How badly the target customer wants this, from corpus evidence |
| 2 | Willingness to Pay | demand | How readily they pay, and how much |
| 3 | Problem-Solution Fit | demand | Evidence that THIS solution mechanism delivers the outcome |
| 4 | Market Timing | demand | A verified "why now" — the specific enabling change |
| 5 | Competitive Position | demand | Market-structure openness, independent of the founder |
| 6 | Differentiation / Moat | build | The founder's specific edge, classified as a 7 Powers type |
| 7 | Acquisition Ease | build | Market channel structure only |
| 8 | Founder Fit | build | Skills, domain insight, capital, distribution access |
| 9 | Goal Fit | build | Effort/time/capital fit against the declared goal |

**Demand Strength** — evidenced pain intensity from the fetched HN/Reddit corpus and cited web
sources. Profitable incumbents are *evidence routing* for this criterion (see de-yoking below),
never an automatic floor. A `narrative.verdict === "Vitamin"` clamps it to ≤ 50 in code.

**Willingness to Pay** — pricing power evidenced by WTP-flagged corpus items, incumbent price
points, and real spend on alternatives. Hypothetical "I would pay" statements are weak signals.

**Problem-Solution Fit** — *solution-shape* evidence: competitor adoption of the **same
mechanism**, reviews praising the outcome, founder pilot results. A novel unproven mechanism
caps at C-/C regardless of how bad the pain is. This criterion is deliberately no longer swept
along with Demand Strength/WTP (see [de-yoking](#de-yoking-and-redefinitions)).

**Market Timing** — the model must name the specific enabling change (tech cost curve, platform,
regulation, behavior shift) and cite a retrieved source. "Nobody thought of it" scores low. Code
clamps Timing to ≤ 55 when both `market.search_trend` and `market.momentum` are empty (Why Now
unverified).

**Competitive Position** — market-structure openness **only**: incumbent customer satisfaction,
switching costs, fragmentation, underserved segments. Explicitly independent of the founder's
edge — the same market read for every founder.

**Differentiation / Moat** — the founder's specific edge, classified into one of Helmer's
7 Powers: scale economies, network effects, counter-positioning, switching costs, brand,
cornered resource, process power. Unclassifiable claims ("first-mover", "better UX", "our AI")
band D or F via the benefit+barrier test. At idea stage only **counter-positioning** and
**cornered resource** can band A — network effects are a route to verify, not an asset you have.

**Acquisition Ease** — market channel structure only: is the category understood, does a budget
line exist, sales-cycle length, channel saturation, and a price-point dead-zone check (too
expensive for self-serve, too cheap for sales). The founder's warm channel access does **not**
belong here — it moves to Founder Fit.

**Founder Fit** (renamed from *Feasibility*) — skills, domain insight, capital, **and**
distribution/warm-channel access. The one criterion scored from the founder's self-description;
correspondingly gated (GO requires Founder Fit ≥ 40) rather than trusted at high weight.

**Goal Fit** — the *only* criterion where effort/time/capital mismatch against the declared goal
appears. `goalContext` (`lib/generators/shared.ts`) instructs the model to reflect mismatch ONLY
here and in `goal_fit_note`; every other criterion measures goal-neutrally. The goal re-enters
through weights, verdict bands, and the Goal Fit gate — in code, where it is visible and
consistent.

Wave 2 adds a 10th criterion, **Retention & Recurrence** (natural problem cadence, compounding
value) — see the roadmap.

### De-yoking and redefinitions

The pre-Wave-1 prompt contained a rule that profitable incumbents force Demand Strength, WTP,
*and* Problem-Solution Fit to 80+ together — a single observation moving ~38% of the weighted
overall as one block, putting every me-too idea at the GO doorstep. Wave 1:

- **Removes Problem-Solution Fit from the sweep.** Incumbent profitability proves the problem
  pays, not that this solution fits it.
- **Rewrites the rule as evidence routing, never a floor:** "anchor Demand Strength and WTP to
  that evidence — typically B+ to A- depending on incumbent health/growth."
- **Orthogonalizes Competitive Position vs Moat** (market structure vs founder edge) and deletes
  the old `COMPETITION_GUIDANCE` instruction to reflect the founder's alpha in both — the same
  construct was being counted twice at near-perfect correlation.
- **Yoke detector in code:** if Demand Strength, WTP, and Problem-Solution Fit all land ≥ 80 and
  within 5 points of each other, a `system_adjustments` note flags suspected yoked scoring.

---

## Scoring mechanics

### Band emission → code mapping

The model never emits a 0–100 number per criterion. For each criterion it writes the
**rationale first** (evidence for/against, anchor comparisons), **then** a coarse band. Code
(`lib/generators/index.ts`) maps bands to numbers and stores the derived numeric score on each
criterion, so the radar chart, recompute, and UI keep working unchanged:

| Band | A+ | A | A- | B+ | B | B- | C+ | C | C- | D+ | D | D- | F |
|------|----|----|----|----|----|----|----|----|----|----|----|----|---|
| Score | 95 | 90 | 85 | 78 | 72 | 66 | 60 | 55 | 48 | 42 | 36 | 30 | 15 |

Rationale-before-band kills intra-call anchoring (the first score dragging the other eight);
coarse bands exist because LLM judges cannot discriminate 74 vs 78 but can discriminate 13
labeled bands. The band→number map lives in `lib/scoring.ts` with every other constant.

### Anchor panel

`ANCHOR_PANEL` (`lib/generators/anchors.ts`) is a **frozen** string of ~8 short vignettes
spanning the outcome range, each with a 2–3 criterion band callout, injected into the validation
system prompt as calibration references. The model scores **relative to these**, not in a
vacuum:

- **Airbnb at its 2008 pitch** — venture GO despite sounding crazy (demand evidenced by behavior,
  counter-positioning vs hotels).
- **Juicero** — Vitamin; Willingness to Pay F (the bag squeezes fine by hand).
- **A me-too generic CRM** — proven demand, no edge → the no-edge cap territory.
- **Quibi** — capital and pedigree don't rescue unverified timing/demand.
- **A solid boring lifestyle business** — services productized; strong WTP, deliberately no moat.
- **A tarpit** — "app to discover restaurants": evergreen founder appeal, graveyard of attempts.
- **Bottled mountain air** — the absurdity anchor; F bands exist and get used.
- **A strong side-hustle example** — small obtainable revenue that genuinely fits the goal.

The panel is frozen so scores stay comparable across runs; it changes only deliberately, with a
calibration re-run (see [harness](#calibration-harness)).

### Weights and per-goal vectors

Effective weight = base weight × goal multiplier. All constants are exported from
`lib/scoring.ts` and **published in the UI** — the founder sees exactly what their goal
emphasizes.

| Criterion | Base | venture | side_hustle | lifestyle | unsure |
|-----------|------|---------|-------------|-----------|--------|
| Demand Strength | 1.6 | — | — | — | — |
| Willingness to Pay | 1.5 | — | — | ×1.7 | — |
| Problem-Solution Fit | 1.2 | — | — | — | — |
| Market Timing | 1.1 | ×1.3 | — | — | — |
| Competitive Position | 1.1 | — | — | — | — |
| Differentiation / Moat | 1.0 | ×1.5 | ×0.6 | ×0.5 | — |
| Acquisition Ease | 1.1 | — | ×1.4 | — | — |
| Founder Fit | 1.2 | — | ×1.5 | ×1.4 | — |
| Goal Fit | 0.8 | — | ×1.2 | — | — |

("—" = ×1.0, i.e. the base weight applies.)

Overall = round(Σ w·s / Σ w) over the 9 criteria, computed server-side; the model's own headline
score is discarded, as before.

### Per-goal verdict bands

Fixed 70/45 bands contradicted the goal-relative promise — a profitable niche is a lifestyle GO
and a venture NO-GO. Bands are now per-goal (in `lib/scoring.ts`):

| Goal | GO ≥ | MAYBE ≥ |
|------|------|---------|
| venture | 78 | 50 |
| side_hustle | 66 | 45 |
| lifestyle | 68 | 45 |
| unsure | 72 | 47 |

### Non-compensatory gates and `system_adjustments`

The recompute applies gates **after** the weighted mean. Every gate that fires appends
`{ rule, detail }` to a `system_adjustments` array stored on the artifact data and rendered in
the report — the founder always sees *why* a number was capped, and learns the difference
between "bad idea" and "wrong goal".

| Gate | Rule | Effect |
|------|------|--------|
| (a) Fatal criterion | any criterion ≤ 25 | verdict capped at MAYBE, naming the criterion |
| (b) Demand + founder floor | GO requires Demand Strength ≥ 55 AND Founder Fit ≥ 40 | otherwise capped at MAYBE |
| (c) No-edge cap | min(Competitive Position, Moat) < 35 | overall score capped at 55 |
| (d) Vitamin clamp | `narrative.verdict === "Vitamin"` | Demand Strength clamped to ≤ 50 **before** averaging |
| (e) Goal-mismatch cap | Goal Fit < 40 | overall capped at 55; the uncapped score is recorded in `system_adjustments` so the UI can render goal-conditional verdicts ("would be 78 for a lifestyle goal") |
| (f) Yoke flag | Demand Strength, WTP, Problem-Solution Fit all ≥ 80 and within 5 points | adjustment note: suspected yoked scoring |
| Why-Now clamp | `search_trend` and `momentum` both empty | Market Timing clamped to ≤ 55 (Why Now unverified) |

Gate thresholds live in `lib/scoring.ts` alongside the weights and bands.

### INSUFFICIENT EVIDENCE

A fourth verdict state beside GO / MAYBE / NO-GO. Set **server-side** when computed confidence
< 35 — the Zod enum and UI include it, and the numeric score stays visible (grayed context, not
hidden). A 22-confidence GO and a 90-confidence GO must not render identically; below the floor,
the honest verdict is "we don't know yet", pointing at the missing evidence component.

### Confidence

Confidence remains deterministic (`computeConfidence` in `lib/generators/index.ts`), replacing
the model's self-report:

- **Corpus part (0–60):** 40 × min(relevant items, 15)/15 (relevance ≥ 2 from the fast-model
  rating in `lib/evidence/rank.ts`), +10 if evidence spans ≥ 3 communities, +10 if ≥ 2
  WTP-flagged items.
- **Web part (0–25):** 25 × min(distinct cited sources, 10)/10.
- **Self-report part (0–15):** model self-report /100 × 15.

Wave 1 closes the two silent-zero failure modes:

- **Rank degradation is loud.** When `rank.ts` falls back (relevance rating unavailable), the
  corpus sets `stats.degraded = true`; the corpus contribution to confidence is capped and a
  visible note explains that relevance is unverified — instead of a silent near-zero that reads
  as "no demand".
- **Zero web sources is a red flag, not a low score.** A grounded call returning zero web
  sources adds a loud `system_adjustments` entry (possible search-plugin regression) instead of
  silently scoring confidence low. An infrastructure failure must never masquerade as a market
  finding.

### Derived sub-scores (one source of truth)

The report previously elicited four parallel demand measurements that could contradict each
other ("Demand Strength 72" beside "demand: Weak"). Wave 1 derives them in code from the
criteria, in the same shape the UI already renders:

- `demand.strength` = Strong if Demand Strength ≥ 70, Moderate if ≥ 45, else Weak.
- `validations.problem` = Demand Strength; `validations.solution` = Problem-Solution Fit;
  `validations.market` = mean(Market Timing, Competitive Position). Rationales reuse the
  corresponding criterion explanations.

These fields are removed from the Zod schema and prompt — the model no longer re-elicits them,
so they cannot disagree with the criteria.

### Consistency lint

Post-processing in `runGenerator` (next to `enrichDemandSignals`), each finding appended to
`system_adjustments`:

- **Revenue math must multiply.** Parse `demand.math` (reach × capture × price) against
  `obtainable_revenue`; if numerically parseable and diverging > 2×, rewrite
  `obtainable_revenue` to the computed product and note the correction.
- **< 2 named competitors** → confidence −10 (two real competitors is the retrieval floor).
- **"No reliable source found"** appearing in a criterion explanation whose band maps ≥ 70 →
  flag note (the rationale and the band contradict each other).

The report's credibility anchor is visible arithmetic; one detectable contradiction costs more
trust than ten harsh scores.

---

## Sycophancy firewall

Two prompt-level defenses run on every validation:

1. **Claims brief pre-pass.** Before the scoring call, a fast-model pass (`writing` role)
   rewrites the idea statement + founder context into a neutral, third-person **CLAIMS BRIEF**:
   enthusiasm and superlatives stripped, claims listed flatly ("Founder asserts X; no evidence
   provided"). The scorer prompt presents the brief as the **primary object** and the original
   statement as reference only. This blunts sycophancy toward the asker's framing and verbosity
   bias (padded pitches outscoring terse identical ones) in one ~$0.01 step.
2. **Pre-mortem before bands.** A `pre_mortem` schema field: 3–5 bullets written **before** any
   criterion is scored — "18 months later this failed because…". Scores must be consistent with
   the pre-mortem; it renders in the Risks section. Prospective hindsight measurably improves
   failure-reason identification and forces the ~90% base rate into view before grading starts.

The anchor panel is the third leg: a pinned me-too baseline and a garbage anchor mean flattery
has to beat named references, not an empty room.

---

## Loop integrity

Three loops consume scores: manual refine / AI-suggest, respond-and-revalidate, and auto-iterate
(greedy hill-climb toward a target score). Uncontrolled, a hill-climb over a re-rolled corpus
with single-sample acceptance is **noise-harvesting** — order statistics manufacture
"improvement" while nothing true is learned. Rules:

1. **Corpus pinning.** Within a hill-climb, new AI versions inherit the parent's saved corpus
   (via `saveEvidence`) so rounds compare like against like; the final winner gets one
   fresh-corpus confirmation run.
2. **Noise-margin acceptance.** Adopt a new version only when
   `newScore ≥ best + max(3, 1.5 × measured SD)` — never accept a delta smaller than test–retest
   noise (SD from the variance study, below).
3. **Champion confirmation.** A would-be winner is re-validated once; adopt the **min** of the
   two scores (regression-to-the-mean insurance).
4. **Rubric hiding + founder-asset ban.** The refiner never sees the scoring rubric verbatim (it
   gets critiques, not the scoring function) and is forbidden — in the prompt *and* by a
   validation-side backstop — from asserting founder capabilities or assets absent from the
   founder profile. Uncorroborated founder-asset claims cap the affected criterion at 55 and
   spawn a clarifying question.
5. **Confidence comparability.** Auto-iterate refuses to compare versions whose confidence
   differs by > 20 — a score bought by evidence disappearing is not an improvement.
6. **Audit trail (Wave 2).** Intermediate versions are archived instead of deleted, with a
   statement-diff + per-criterion delta table; rounds where > 70% of the gain came from
   judgment-only criteria are flagged. The loop's real output is a claims-diff ("the new
   statement now ASSUMES X"), not a bigger number.

---

## Calibration harness

Nothing about 70/45-style thresholds means anything without a base rate, and a silent model bump
can shift the whole distribution 10 points unnoticed. The harness makes the judge itself a
tested artifact:

- **Variance study** (`scripts/variance.ts`): 3 fixed statements × 5 runs; per-criterion and
  overall SD, verdict flip rate. The measured SD feeds the UI band display (**68 ± 4**, not a
  false-precision 68), "borderline" labels near verdict thresholds, and the loop's acceptance
  margin. Reliability bounds validity — measure the noise before trusting any delta.
- **Fixture + garbage suite:** 12–18 frozen ideas — retrospective winners stated as-of-founding-
  year, obvious NO-GOs, me-too traps, at least one per goal bucket, **and a garbage set**
  (bottled mountain air, a staircase-for-stairs, a known tarpit like "app to discover
  restaurants", a Juicero clone) the tool must provably flunk.
- **`npm run calibrate`** (~$5 — the script prints its estimate and requires `--yes`): runs the suite, asserts band membership per
  fixture, and fails if garbage scores above its ceiling. Run on **every prompt or model
  change** — `MODEL_SCORING` resolves at runtime, so an env edit is a judge change.
- **Drift monitoring:** a trailing histogram of real scores as an alarm only — sigma < 12 or a
  pinned mean signals a prompt/model regression. **Never** force a distribution or quota; quotas
  manufacture fake spread, anchors manufacture real spread.

---

## Roadmap — Waves 2 and 3

**Wave 2 — "From grade to decision"** (~a week, up to ~2× per-run cost):

- `next_test` block rendered above the score: riskiest assumption (one the corpus does NOT
  already prove), cheapest test (≤ 1 week, ≤ $100, routed to `corpus.stats.communities` — "post
  in r/freight_brokers, DM the 8 corpus authors"), pre-registered pass/kill thresholds, and
  `would_flip` in both directions. MAYBE must name the ONE criterion whose resolution exits the
  band.
- Lever tags on every criterion (positioning | evidence | execution | exogenous) with a one-line
  action; evidence-lever criteria route to `next_test` and are off-limits to refine.
- Founder-input split: `facts_to_confirm` (authoritative — own skills/network/capital/intent) vs
  `assumptions_to_test` (customers/competitors/market — corroborated, marked
  "founder-asserted, unverified", ≤ ~10-point movement on assertion alone), replacing the
  blanket AUTHORITATIVE `founderContext`.
- Mom-Test evidence-tier ledger over corpus + founder claims (T1 money/behavior, T2 costly
  commitment, T3 specific past fact, T4 compliments/hypotheticals ≈ zero weight; "50 people said
  they loved it" auto-flags T4).
- **Retention & Recurrence** as the 10th criterion (problem cadence, compounding value);
  unit-economics language folded into WTP.
- `audience_online` high/medium/low from query generation: when low, thin corpus is EXPECTED —
  confidence reweights web 25→40 / corpus 60→45 and adds G2/Capterra-targeted queries (fixes the
  coverage artifact that punishes ideas whose buyers don't post on HN/Reddit).
- k=3 self-consistency scoring samples with per-criterion medians; spread > 10 renders a
  low-confidence flag on that criterion; inter-run agreement feeds confidence.
- `revalidateWithAlpha` merges the alpha into the statement so evidence queries target the
  pivot; version archiving with diff trail; local percentile ("scored higher than N% of ideas
  validated here") + histogram drift alarm in-app.

**Wave 3 — "Judging depth and auditability"** (larger build; ~3–4× cost, only for deep-validation
mode, iterate winners, and final GOs):

- Adversarial bull/bear dual-pass in fresh contexts, reconciled by a judge with "the side citing
  retrieved evidence wins" (a single "be balanced" call structurally cannot produce spread).
- CoVe-style factored verification of the 5–10 load-bearing claims on a fast model
  (supported / contradicted / not-in-evidence; unsupported claims discount toward the base-rate
  prior).
- Second-family cheap judge as an occasional audit (every 3rd iterate round + fixture runs),
  **surfacing** per-criterion divergence > 15, never averaging it — it doubles as the held-out
  Goodhart auditor for the loop.
- Tarpit/graveyard library (~15 known clusters; a match requires naming prior attempts and
  scoring the differentiated insight), SISP detection (technology-first pitch, no named
  sufferer → caps Problem-Solution Fit), schlep-heaviness must not lower demand (may raise Moat
  via counter-positioning), idea-provenance intake (organic vs whiteboard) feeding Founder Fit.
- Verbalized probabilities for forecast-shaped criteria (Why Now, Competitive Position) — elicit
  P(defined event) alongside the band, making the tool's track record auditable later.

Order rationale: Wave 1 is nearly free and removes the failure modes that would corrupt any
later investment (a Goodharted loop and a compressed scale poison added judging depth); Wave 2
changes what the product *is* (decision + kill-test, not grade) using Wave 1's measured noise;
Wave 3 buys discrimination quality per dollar only once the scale, gates, and loop integrity
exist to preserve it.

---

## Why — research grounding per major choice

**Why bands + anchors instead of 0–100 elicitation.** The pre-redesign judge clustered around
~76 — the textbook signature of central-tendency compression, sycophancy, and intra-call
anchoring. The LLM-judge literature's highest value-for-cost fixes are anchor exemplars in the
prompt (pushing judge–human correlation past ~0.89) and coarse grades mapped to numbers in code:
models cannot discriminate 74 vs 78 but can discriminate 13 band labels. Forced distributions
were explicitly rejected — stack-ranking failure modes transfer; quotas manufacture fake spread,
anchors manufacture real spread.

**Why demand and WTP carry the most weight — and a gate, not just a weight.** Absence of real
demand is the #1 root cause of startup failure (CB Insights: 42% "no market need"; 43% poor PMF
in the 2024 shutdown cohort), and no other factor rescues it — hence gate (b), not just a 1.6
multiplier. Simon-Kucher: 72% of innovations miss financial targets, mostly for skipping the WTP
conversation; monetization moves profit ~4× more than acquisition (ProfitWell) — hence WTP at
1.5 base and ×1.7 for lifestyle goals.

**Why competition is evidence routing, not a penalty — and why the edge is checked separately.**
Competition is largely a false-negative signal: 85% of unicorns had competitors, pioneers fail
at 47% vs 8% for followers (Golder–Tellis), and only ~19% of failures cite being outcompeted.
What discriminates is differentiation (70% of unicorns highly differentiated vs ~40% baseline) —
hence profitable incumbents anchor Demand/WTP upward while the **no-edge cap** (gate c) and the
7 Powers benefit+barrier test do the discriminating. The 7 Powers classification turns moat from
adjective-grading into a falsifiable check and supplies the low-band vocabulary a compressed
grader lacks.

**Why a verified Why-Now.** Timing tops Bill Gross's cross-factor analysis (42%, above team,
idea, model, and funding) and is Sequoia's signature question — yet LLMs assert "now is the
perfect moment" for anything AI-adjacent, so the criterion demands a cited enabling change and
code clamps it when `search_trend`/`momentum` are empty.

**Why Founder Fit (and the rename).** Domain experience is the best-evidenced founder-side
predictor (NBER census-scale data; mean top-0.1% founder age 45), and founder-specific channel
access is one of the few team factors with a causal mechanism — so warm channels move from
Acquisition Ease into Founder Fit, and "Feasibility" (which read as "is it buildable") is
renamed to what it actually measures.

**Why goal-neutral criteria with goal weights in code.** The construct-validity critique showed
goal-baked criteria destroy comparability while Goal Fit carried only ~9% of a goal-blind 70/45
verdict — the promise of goal-relativity was delivered nowhere structural. Per-goal vectors and
bands make "profitable niche = venture NO-GO but lifestyle GO" arithmetic instead of hope, and
gate (e) renders the distinction visibly instead of punishing the idea.

**Why the sycophancy firewall.** LLMs overpredict startup success from founder-framed claims
(sycophancy; Sharma et al.), padded pitches outscore terse identical ones (verbosity bias), and
pre-mortem prompting improves failure-reason identification by ~30% in the classic study. One
cheap restatement pass plus a pre-mortem field attacks all three at once.

**Why the calibration harness is a differentiator, not overhead.** The competitor research found
zero independent benchmarks in the category: an HN-tested validator scored *everything* 75/100
including bottled mountain air; IdeaProof's "89% accuracy" is undefined; review content is
almost entirely competitor SEO. The white space nobody occupies is audited score distributions,
test–retest honesty, falsifiable kill-tests, and a garbage suite the tool provably flunks — the
harness is the product answering the post-"shit on a stick" trust deficit every founder carries.

**Why loop integrity before judging depth.** Every critique and the reward-hacking literature
converged: the old loop max-sampled a noisy re-rolled measurement (order statistics manufacture
improvement) while the refiner saw exactly which numbers to attack and could invent unverifiable
alpha. Corpus pinning, noise-margin acceptance, champion confirmation, and the founder-asset ban
convert "raise the number by rewording" into "raise the number by learning" — and until that
holds, any added judging quality would be optimized against, not benefited from.

---

## Where the constants live

| Thing | Location |
|-------|----------|
| Band→number map, base weights, per-goal vectors, verdict bands, gate thresholds | `lib/scoring.ts` (single exported module; UI imports and publishes) |
| Anchor panel | `lib/generators/anchors.ts` (`ANCHOR_PANEL`, frozen) |
| Recompute, gates, confidence, derived sub-scores, consistency lint | `lib/generators/index.ts` |
| Criterion definitions, band emission format, pre-mortem | `lib/generators/validation.ts` (system prompt + Zod schema) |
| Goal rubrics, `goalContext`, `COMPETITION_GUIDANCE`, founder profile | `lib/generators/shared.ts` |
| Claims-brief pre-pass | validation pipeline, `writing` role (`lib/ai/models.ts`) |
| Variance study / calibration suite | `scripts/variance.ts`, `npm run calibrate` |

Changing any scoring constant or prompt is a **judge change**: re-run `npm run calibrate` and
eyeball the drift histogram before trusting new scores against old ones.
