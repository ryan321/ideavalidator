// The frozen anchor panel: known-outcome reference ideas, each with a 2-3 criterion
// band callout, injected into the validation system prompt. The model scores every
// idea RELATIVE to these — anchored comparison manufactures real spread where a bare
// rubric produces a ~76 huddle. Do not edit casually: changing an anchor recalibrates
// every future score (treat this string as frozen; version changes deliberately).

export const ANCHOR_PANEL = `=== CALIBRATION ANCHORS — score RELATIVE to these known-outcome references ===
For every criterion, ask "is this idea's evidence stronger or weaker than the relevant anchor's?"
before you choose a band. These anchors span the whole scale — most real ideas sit between them,
and most real ideas have at least one criterion in the C range or below.

1. AIRBNB (as pitched, 2008 — "strangers sleeping on air mattresses", widely called crazy; venture GO):
   Demand Strength B+ (people actually booked during sold-out conferences — behavior, not compliments),
   Differentiation / Moat A- (counter-positioning vs hotels: incumbents structurally could not copy it),
   Market Timing A- (recession pushed hosts to monetize spare rooms; online payments + profiles matured).
   Lesson: "sounds crazy" is not a demand criterion; observed behavior is.

2. JUICERO ($400 wifi juicer for subscription bags; funded, dead): Willingness to Pay F (hands squeeze
   the bags for free — the paid mechanism added nothing over the alternative), Problem-Solution Fit D
   (a Vitamin dressed as hardware), Demand Strength D (no one exhibited the pain before the product).
   Lesson: capital raised and polish are not evidence of demand.

3. ME-TOO GENERIC CRM ("a CRM for small businesses, but easier"): Demand Strength A- (decades of
   profitable incumbents prove people pay), Willingness to Pay A-, but Competitive Position C-
   (satisfied, entrenched incumbents; high switching costs) and Differentiation / Moat F ("easier UX"
   fails the benefit+barrier test). Lesson: proven demand with no edge triggers the no-edge cap —
   it is the doorstep of MAYBE, never GO.

4. QUIBI ($1.75B, shut in 6 months): Market Timing F (bet on paid, mobile-only, short premium video
   exactly when TikTok/YouTube owned that behavior for free), Willingness to Pay D- (no evidenced
   willingness to pay for short clips), Differentiation / Moat D ("premium content + pedigree" is
   unclassifiable as a power). Lesson: pedigree and capital cannot buy timing.

5. PRODUCTIZED DENTAL BOOKKEEPING (a solid, boring services-productized business; lifestyle GO):
   Demand Strength B (practices demonstrably pay for bookkeeping today), Willingness to Pay B+
   ($500-1500/mo line item already exists), Differentiation / Moat C- (little defensibility),
   Founder Fit A- for an accountant who knows dental workflows. Lesson: unsexy + existing budget
   line + fitting founder = a strong lifestyle answer despite a weak moat.

6. RESTAURANT DISCOVERY APP (the classic tarpit — loved in surveys, dead in the market, many times):
   Demand Strength C- (endless compliments, zero changed behavior; Yelp/Google are "good enough"),
   Willingness to Pay F (neither diners nor restaurants sustainably pay), Acquisition Ease D
   (two-sided cold start against free defaults). Lesson: "everyone I ask loves it" is the tarpit
   signature, not validation.

7. BOTTLED MOUNTAIN AIR (novelty gag): Demand Strength F, Willingness to Pay F, Problem-Solution
   Fit F. Lesson: an absurd premise gets F across the demand row — there is no "benefit of the
   doubt" band.

8. NICHE SHOPIFY REVIEWS-MIGRATION APP (strong side hustle: one documented merchant complaint,
   solved for $15/mo): Demand Strength B (merchants post the exact pain, with workarounds, in
   Shopify forums), Acquisition Ease B+ (app-store channel with existing purchase intent and a
   budget line), Founder Fit B+ for a working Shopify dev. Lesson: small, reachable, already-paying
   demand beats a grand vision for a side-hustle goal.
=== END CALIBRATION ANCHORS ===`;
