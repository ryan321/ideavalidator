// The calibration fixture suite: 14 ideas with KNOWN outcomes, each stated the way a
// founder would have pitched it AT THE TIME (period-appropriate language, no company
// names for the winners) plus an expected verdict band for its goal. calibrate.ts
// runs the full suite; variance.ts re-runs the 3 marked `variance: true`.
//
// Expectations are TIERS derived from verdict + score (see tierOf in harness.ts):
//   NO_GO(0) < MAYBE_LOW(1) < MAYBE_HIGH(2) < GO(3)
// A fixture passes when min ≤ actual tier ≤ max.

export type GoalBucket = "lifestyle" | "side_hustle" | "venture" | "unsure";

export const TIERS = ["NO_GO", "MAYBE_LOW", "MAYBE_HIGH", "GO"] as const;
export type Tier = (typeof TIERS)[number];

export type Fixture = {
  id: string;
  title: string;
  statement: string;
  goal: GoalBucket;
  founderFit?: string;
  /** Lowest acceptable tier (winners must clear it). */
  min?: Tier;
  /** Highest acceptable tier (failures/garbage must stay under it). */
  max?: Tier;
  /** Why this expectation — printed on failure. */
  why: string;
  /** Part of the 3-fixture variance suite (scripts/variance.ts). */
  variance?: boolean;
};

export const FIXTURES: Fixture[] = [
  // ---- 4 retrospective winners (stated as-of founding year) ----------------------
  {
    id: "winner-airbnb-2008",
    title: "Air mattress marketplace (2008)",
    statement:
      "It is 2008. We run a website where people rent out air mattresses and spare rooms in their own " +
      "apartments to conference travelers when hotels are sold out. The site handles online payment and " +
      "shows host profiles with photos and guest reviews; hosts earn money from space they already have, " +
      "travelers get a cheaper and more local stay.",
    goal: "venture",
    founderFit:
      "Two design-school graduates and a systems engineer. They hosted three paying guests on air " +
      "mattresses in their own apartment during a sold-out design conference and covered their rent with it.",
    min: "MAYBE_HIGH",
    why: "Venture GO despite 'strangers sleeping on air mattresses sounds crazy' — behavior beats opinion.",
    variance: true,
  },
  {
    id: "winner-devpay-2010",
    title: "Developer-first card payments API (2010)",
    statement:
      "It is 2010. Seven lines of code to accept card payments on a website: a developer-first payments " +
      "API with instant self-serve onboarding, replacing the merchant accounts, gateway contracts, and " +
      "weeks of paperwork that online businesses endure today. Priced as a simple percentage per transaction.",
    goal: "venture",
    founderFit:
      "Two brothers, strong engineers, dropped out of MIT and Harvard; already built and sold one small " +
      "startup; deeply embedded in the developer community that lives this pain.",
    min: "MAYBE_HIGH",
    why: "Venture winner: acute developer pain, demonstrated workarounds, counter-positioned against banks.",
  },
  {
    id: "winner-creator-email-2013",
    title: "Email marketing for professional bloggers (2013)",
    statement:
      "It is 2013. Email marketing software built specifically for professional bloggers and course " +
      "creators: tag-based subscriber segmentation, simple landing pages, and automation sequences priced " +
      "$29-79/mo — sold as the purpose-built alternative to generic newsletter tools that treat a " +
      "creator's audience like a corporate mailing list.",
    goal: "lifestyle",
    founderFit:
      "A blogger who makes a full-time living selling design ebooks and courses to his own email list; " +
      "knows hundreds of creator peers by name; has shipped small SaaS products before.",
    min: "MAYBE_HIGH",
    why: "Bootstrapped lifestyle winner: existing budget line, insider founder, reachable niche.",
  },
  {
    id: "winner-statement-converter",
    title: "PDF bank-statement to CSV converter",
    statement:
      "A web tool that converts PDF bank statements into clean CSV/Excel files, priced per conversion " +
      "or $30/mo, sold through search to bookkeepers and small-business accountants who today re-key " +
      "statement lines by hand at month-end.",
    goal: "side_hustle",
    founderFit:
      "A working software engineer building nights and weekends; comfortable with SEO, parsing, and " +
      "running small paid web tools.",
    min: "MAYBE_HIGH",
    why: "Strong side hustle: documented recurring pain, existing willingness to pay, search-intent channel.",
  },

  // ---- 4 known failures ------------------------------------------------------------
  {
    id: "failure-juicero-2016",
    title: "Wifi cold-press juicer with subscription packs (2016)",
    statement:
      "A $400 countertop wifi-connected cold-press juicer that squeezes our proprietary subscription " +
      "packs of pre-chopped organic produce into a fresh glass of juice, with QR-code freshness " +
      "verification on every pack.",
    goal: "venture",
    founderFit:
      "A serial consumer-products founder with prior hardware experience and strong venture-capital " +
      "relationships.",
    max: "MAYBE_LOW",
    why: "Juicero: the paid mechanism adds nothing over hands squeezing the bag — WTP is fatal.",
  },
  {
    id: "failure-quickbite-2019",
    title: "Mobile-only premium short-form streaming (2019)",
    statement:
      "A $5-8/month mobile-only streaming service of premium, Hollywood-produced original shows cut " +
      "into 5-10 minute episodes designed for commutes and waiting rooms, launching with A-list talent " +
      "and studio-grade budgets.",
    goal: "venture",
    founderFit:
      "A legendary film-studio executive and a former big-tech CEO; able to raise over a billion " +
      "dollars pre-launch and sign top-tier talent.",
    max: "MAYBE_LOW",
    why: "Quibi: timing F (free short video owned the behavior) — pedigree and capital can't buy timing.",
  },
  {
    id: "failure-metoo-crm",
    title: "Easier CRM for small businesses",
    statement:
      "A CRM for small businesses that is easier to use than Salesforce and HubSpot — contacts, deals, " +
      "and pipelines with a cleaner interface at a lower price.",
    goal: "venture",
    max: "MAYBE_LOW",
    why: "Me-too clone: proven demand, zero edge — the no-edge cap should hold it at/under the MAYBE floor.",
    variance: true,
  },
  {
    id: "failure-movie-subscription-2017",
    title: "Unlimited cinema subscription (2017)",
    statement:
      "A $9.95/month subscription that lets members watch one movie per day in any theater. We buy each " +
      "ticket at full retail price and bet on breakage, moviegoing data, and future studio partnership " +
      "revenue to close the gap.",
    goal: "venture",
    max: "MAYBE_LOW",
    why: "MoviePass: unit economics structurally negative — heavy users are the ones who join.",
  },

  // ---- 3 tarpits / mediocre ----------------------------------------------------------
  {
    id: "tarpit-friend-app",
    title: "App for making friends in your city",
    statement:
      "A mobile app for meeting new friends in your city — swipe-style matching by shared interests, " +
      "plus AI-suggested meetup activities and group events.",
    goal: "unsure",
    max: "MAYBE_LOW",
    why: "Classic tarpit: universal compliments, no willingness to pay, brutal two-sided cold start.",
  },
  {
    id: "tarpit-habit-tracker",
    title: "AI habit tracker",
    statement:
      "A habit-tracking app that uses AI to send personalized motivational nudges at the moments you " +
      "are most likely to slip, freemium with a $5/mo premium tier.",
    goal: "side_hustle",
    max: "MAYBE_HIGH",
    why: "Saturated vitamin category with famous churn; should not clear the GO bar even for a side hustle.",
    variance: true,
  },
  {
    id: "mediocre-trip-planner",
    title: "AI travel-itinerary planner",
    statement:
      "An AI travel-itinerary planner that builds a day-by-day trip plan from your budget, dates, and " +
      "interests, priced $9 per trip or $29/year.",
    goal: "lifestyle",
    max: "MAYBE_HIGH",
    why: "Mediocre: crowded free alternatives (guides, ChatGPT, TripIt), episodic use, weak WTP — not a GO.",
  },

  // ---- 3 garbage / absurd -------------------------------------------------------------
  {
    id: "garbage-bottled-air",
    title: "Premium bottled mountain air",
    statement:
      "Premium bottled mountain air harvested in the Rocky Mountains, sold as a wellness product at " +
      "$49 per canister with a subscription discount for monthly deliveries.",
    goal: "side_hustle",
    max: "NO_GO",
    why: "Absurd premise: the demand row should be F across the board — no benefit-of-the-doubt band.",
  },
  {
    id: "garbage-staircase-gym",
    title: "Staircase-only gym franchise",
    statement:
      "A gym franchise containing nothing but staircases: members pay $79/month to climb real stairs " +
      "of varying steepness and length, with a leaderboard and monthly stair-climbing tournaments.",
    goal: "venture",
    max: "NO_GO",
    why: "Free substitutes are literally everywhere (stairs); no criterion should rescue it.",
  },
  {
    id: "garbage-pet-rock-box",
    title: "Pet rock subscription box",
    statement:
      "A monthly subscription box that delivers a new decorative pet rock with seasonal accessories " +
      "and an adoption certificate, $25/month.",
    goal: "side_hustle",
    max: "NO_GO",
    why: "Novelty gag with no recurring pain; a subscription multiplies the absurdity.",
  },
];

export const VARIANCE_FIXTURES = FIXTURES.filter((f) => f.variance);
