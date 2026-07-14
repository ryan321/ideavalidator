import type { HelpCatalog } from "../types";

export const helpEn: HelpCatalog = {
  sections: [
    {
      id: "start",
      title: "Getting started",
      blurb: "From first idea to a full validation pass.",
      entrySlug: "getting-started",
    },
    {
      id: "billing",
      title: "Billing & campaigns",
      blurb: "What you pay for, what burns a report, and what to do when you run out.",
      entrySlug: "campaigns-and-pricing",
    },
    {
      id: "scoring",
      title: "Scores & verdicts",
      blurb: "What the stamp means and how to read the report.",
      entrySlug: "verdicts",
    },
    {
      id: "studio",
      title: "Working in the studio",
      blurb: "Ask, re-score, angles, and kill-tests without wasting runs.",
      entrySlug: "iterate",
    },
    {
      id: "account",
      title: "Account & language",
      blurb: "Locale, privacy, and reaching the team.",
      entrySlug: "language",
    },
  ],
  faq: [
    { q: "Does chat use a full report?", slug: "iterate" },
    { q: "What did my campaign unlock?", slug: "campaigns-and-pricing" },
    { q: "What does GO / MAYBE / NO-GO mean?", slug: "verdicts" },
    { q: "I can't run another analysis", slug: "cant-run-analysis" },
    { q: "Why did my score change after a re-run?", slug: "why-score-changed" },
  ],
  articles: [
    {
      slug: "getting-started",
      section: "start",
      title: "Validate your first idea",
      summary:
        "Create an account, describe the idea, unlock a campaign, and get a grounded score.",
      eyebrow: "Start here",
      tags: ["first", "signup", "begin", "unlock", "onboarding"],
      blocks: [
        {
          type: "p",
          text: "Validorian is a business validation studio. You describe an idea against your goal, then get an evidence-backed GO / MAYBE / NO-GO with market, money, risks, and a next test. Not a pep talk.",
        },
        { type: "h2", text: "The path" },
        {
          type: "ol",
          items: [
            "Create a free account and open the studio.",
            "Describe what you're offering, who it's for, and why now. Set your goal (side hustle, lifestyle, venture, or unsure) so the bar for GO matches you.",
            "When you're ready to score, unlock a full campaign on that idea (one price per idea; see Pricing for the current amount).",
            "Read the stamp and the decision surface first, then dig into market, money, and evidence as needed.",
            "Iterate: rewrite the pitch, try a different angle, ask questions on the review, or run a real-world kill-test.",
          ],
        },
        {
          type: "callout",
          text: "Chat with the review never burns a scored report. Full re-scores and deep analyses use the campaign allotment.",
        },
        { type: "h2", text: "What you get in a full pass" },
        {
          type: "ul",
          items: [
            "Verdict and score (GO / MAYBE / NO-GO) with confidence and goal-relative bands",
            "Demand, willingness to pay, competition, and obtainable revenue",
            "Risk map and pre-mortem",
            "Buyer profile and channels",
            "Real-world test plan (kill-test) with pass/fail bars",
            "Evidence from public sources (posts, reviews, issues) with links",
            "Room to iterate: new versions, angles, and unlimited questions on that idea's review",
          ],
        },
        {
          type: "p",
          text: "A full pass can take a few minutes — real web search and scoring, not an instant guess.",
        },
      ],
    },
    {
      slug: "campaigns-and-pricing",
      section: "billing",
      title: "Campaigns and pricing",
      summary: "One price per idea; what unlocks and what counts as a full report.",
      eyebrow: "Billing",
      tags: ["pay", "price", "unlock", "subscription", "cost", "money", "stripe", "29"],
      blocks: [
        {
          type: "p",
          text: "Account is free. A campaign pass unlocks a full validation path on one idea: scored reports (up to the included cap, default 10 full analyses), wedges, kill-test kit, competitor intel, and unlimited chat on that idea. No subscription.",
        },
        { type: "h2", text: "What burns a report slot" },
        {
          type: "table",
          headers: ["Action", "Uses a full scored report?"],
          rows: [
            ["Ask / chat about the review", "No"],
            ["Read or expand the report", "No"],
            ["New version + re-score", "Yes"],
            ["Deep validation", "Yes (heavier run)"],
            ["Angle / wedge tournament (each scored entrant)", "Yes, per analysis"],
            ["Interview kit or intel pack", "No (needs unlock, not a report slot)"],
          ],
        },
        {
          type: "ul",
          items: [
            "Only full scored analyses burn a report slot",
            "When the included reports are used up, chat and existing reports stay open",
            "A different idea needs its own campaign pass",
          ],
        },
        {
          type: "callout",
          text: "See Pricing for the live price and FAQ. Billing issues: help@validorian.com.",
        },
      ],
    },
    {
      slug: "cant-run-analysis",
      section: "billing",
      title: "I can't run another analysis",
      summary:
        "Campaign locked, reports used up, or the button is disabled for another reason.",
      eyebrow: "Troubleshooting",
      tags: ["exhausted", "locked", "blocked", "can't score", "disabled", "cap"],
      blocks: [
        {
          type: "p",
          text: "If Validate, re-score, or deep validation is blocked, check these in order.",
        },
        {
          type: "ol",
          items: [
            "Campaign locked: this idea was never unlocked. Open unlock / Pricing for that idea.",
            "Reports complete: you used the full scored analyses included in the pass. Chat and reading stay open. Start a new idea to validate something different.",
            "Work still running: wait for the current analysis to finish.",
            "No material change: if you only want to understand the current report, use Ask (no rescore) instead of burning another run.",
          ],
        },
        {
          type: "callout",
          text: "Still stuck? Email help@validorian.com with your account email and the idea title.",
        },
      ],
    },
    {
      slug: "verdicts",
      section: "scoring",
      title: "GO, MAYBE, and NO-GO",
      summary: "What each stamp means and what to do next.",
      eyebrow: "Verdicts",
      tags: ["stamp", "maybe", "nogo", "no-go", "insufficient", "pass", "fail"],
      blocks: [
        {
          type: "p",
          text: "The stamp is the call. The number supports it, but the stamp answers whether to proceed under the goal you set.",
        },
        {
          type: "ul",
          items: [
            "GO: evidence supports pursuing this framing for your goal. Build and test with intent. Open the plan when you're ready.",
            "MAYBE: mixed or borderline. Improve the idea, prove a kill-test, or change the angle before going all-in.",
            "NO-GO: as written, weak for your goal. Pivot hard or stop. Don't polish a fatal mismatch.",
            "INSUFFICIENT: confidence is too low to grade honestly. Clarify the statement, add context, or re-run after better evidence.",
          ],
        },
        {
          type: "callout",
          text: "Side hustle and venture raise are not graded the same. A score that clears GO for one goal may sit in MAYBE for another.",
        },
        {
          type: "p",
          text: "UI labels can appear in your language (for example Korean stamps). Scoring still uses the same GO / MAYBE / NO-GO rules underneath.",
        },
      ],
    },
    {
      slug: "reading-the-report",
      section: "scoring",
      title: "Reading your report",
      summary:
        "How to scan the decision surface, brief, market, competition, money, risks, plan, and evidence.",
      eyebrow: "The report",
      tags: ["ui", "sections", "brief", "market", "competition", "money", "risks", "plan", "evidence"],
      blocks: [
        {
          type: "p",
          text: "If you only skim once: stamp, why this score, open questions, then the kill-test. Expand chapters only when you need depth.",
        },
        {
          type: "ol",
          items: [
            "Stamp and score: goal fit and why this score (drags and levers).",
            "Brief: painkiller vs vitamin, strengths, open questions.",
            "Market: sizing (TAM/SAM/SOM), timing, and where buyers are.",
            "Competition: who you're up against, their pricing, and your edge.",
            "Money: unit economics and projections (estimates, not promises).",
            "Risks: matrix and pre-mortem before you ignore the red cells.",
            "Plan: gated until GO or a kill-test pass justifies a build path.",
            "Evidence: the corpus behind the demand read (receipts, not decoration).",
          ],
        },
        {
          type: "callout",
          text: "In the studio, chapters stay collapsed so the decision leads. Expand only what you need.",
        },
        {
          type: "p",
          text: "Need to share it? Use Download PDF to export the full report — every section expanded and sources included — to keep or send on.",
        },
      ],
    },
    {
      slug: "how-scoring-works",
      section: "scoring",
      title: "How scoring works",
      summary:
        "Criteria, weights, and gates. Optional reading if a badge or adjustment confuses you.",
      eyebrow: "Under the hood",
      tags: ["criteria", "weights", "gates", "bands", "system adjustments", "trust"],
      blocks: [
        {
          type: "p",
          text: "You do not need this page to use Validorian. Open it when a scoring note, borderline badge, or clamp looks mysterious.",
        },
        {
          type: "p",
          text: "In plain terms: the model writes a short rationale and a letter grade per factor. Software turns those grades into numbers, weights them for your goal, and applies hard rules so one fatal flaw cannot be averaged away by strengths elsewhere.",
        },
        { type: "h2", text: "The ten criteria" },
        {
          type: "ul",
          items: [
            "Demand Strength, Willingness to Pay, Problem-Solution Fit",
            "Retention & Recurrence, Market Timing, Competitive Position",
            "Differentiation / Moat, Acquisition Ease, Founder Fit, Goal Fit",
          ],
        },
        { type: "h2", text: "What you should trust" },
        {
          type: "ul",
          items: [
            "Fetched evidence (posts, reviews) with real links and vote counts",
            "Gates and clamps listed under scoring notes when they fire",
            "Borderline badges when the score sits near a GO or MAYBE line (re-runs can flip)",
          ],
        },
        {
          type: "p",
          text: "Market sizing figures and some competitor notes are model estimates from search. Check sources before you bet the company.",
        },
      ],
    },
    {
      slug: "why-score-changed",
      section: "scoring",
      title: "Why did my score change?",
      summary: "Re-runs, goal changes, new framing, and normal scoring noise.",
      eyebrow: "Troubleshooting",
      tags: ["variance", "different", "flip", "borderline", "noise", "rerun"],
      blocks: [
        {
          type: "ul",
          items: [
            "You changed the idea statement, goal, or founder context: the score should change.",
            "Borderline scores: the product marks when you sit within run-to-run noise of a threshold. A re-run can land on the other side without meaning the system is broken.",
            "New evidence or a kill-test result: field data can move demand and verdict honestly.",
            "Deep validation: a heavier pass can adjust confidence and notes; treat it as a second look, not a different product.",
          ],
        },
        {
          type: "callout",
          text: "If the framing is unchanged and the jump looks wild, email help@validorian.com with the idea title and versions.",
        },
      ],
    },
    {
      slug: "iterate",
      section: "studio",
      title: "Iterate without wasting runs",
      summary: "Ask, new versions, angles, and when to re-score.",
      eyebrow: "Studio loop",
      tags: ["ask", "chat", "version", "angle", "alpha", "wedge", "rescore", "run"],
      blocks: [
        {
          type: "p",
          text: "A run (or full scored report) is a deep analysis that burns campaign allotment. Use Ask when you only want to understand the current review.",
        },
        { type: "h2", text: "What burns a report?" },
        {
          type: "table",
          headers: ["Action", "Uses a full scored report?"],
          rows: [
            ["Ask (chat about this analysis)", "No"],
            ["New version + re-score", "Yes"],
            ["Compare angles / wedge tournament", "Yes, per scored angle"],
            ["Deep validation", "Yes"],
            ["Kill-test kit, intel, reading the report", "No"],
          ],
        },
        { type: "h2", text: "Ask (no rescore)" },
        {
          type: "p",
          text: "Talk through the current report: scores, competitors, risks. Does not create a version and does not use a full analysis.",
        },
        { type: "h2", text: "New version" },
        {
          type: "p",
          text: "Change the statement, goal, or context, then re-score. Use after a real change to the framing or evidence, not after every curiosity.",
        },
        { type: "h2", text: "Compare angles" },
        {
          type: "p",
          text: "An angle (sometimes called an alpha or wedge) is a different edge or positioning of the same core idea. Tournaments score a few of those edges head-to-head on the same evidence. Each scored entrant uses a report slot, so pick deliberately.",
        },
      ],
    },
    {
      slug: "kill-test",
      section: "studio",
      title: "Kill-tests and interviews",
      summary: "The cheapest real-world proof before you build.",
      eyebrow: "Field work",
      tags: ["interview", "mom test", "buyer", "pass", "fail", "field"],
      blocks: [
        {
          type: "p",
          text: 'A MAYBE or NO-GO is often not "try harder in the deck." It is "talk to buyers with a pre-registered pass/fail bar."',
        },
        {
          type: "ul",
          items: [
            "Riskiest assumption: what the corpus did not settle",
            "Cheapest test (about a week or less) with a channel",
            "Pass and kill thresholds written before you see results",
            "Interview kit: who to talk to and Mom-Test style questions (past behavior and facts, not compliments about your idea)",
          ],
        },
        {
          type: "p",
          text: "Record the result and re-score so the verdict updates from field data, not hope.",
        },
      ],
    },
    {
      slug: "deep-validation",
      section: "studio",
      title: "Deep validation",
      summary: "When the heavier pass is worth a report slot.",
      eyebrow: "Advanced",
      tags: ["deep", "bull", "bear", "cove", "expensive"],
      blocks: [
        {
          type: "p",
          text: "Deep validation is an optional heavier analysis (independent cases, extra checks). It uses a full scored report and costs more compute than a standard pass.",
        },
        {
          type: "ul",
          items: [
            "Use it when the idea is serious and you want a second, tougher look",
            "Skip it for early drafts and cheap experiments",
            "It does not replace a kill-test with real buyers",
          ],
        },
      ],
    },
    {
      slug: "language",
      section: "account",
      title: "Language and AI output",
      summary: "UI language vs report prose language.",
      eyebrow: "Locale",
      tags: ["i18n", "korean", "translate", "globe", "locale"],
      blocks: [
        {
          type: "p",
          text: "The globe switcher sets UI chrome: nav, buttons, section titles, verdict stamps, and labels. You can search languages by name or code (for example Korean, 한국어, or ko).",
        },
        {
          type: "p",
          text: "AI-written body text (summaries, competitor notes, open questions) follows the language active when you generate or re-score. Old English reports stay English until you re-run under the new locale.",
        },
        {
          type: "ul",
          items: [
            "Switch language any time from the header",
            "Machine codes in stored data (verdicts, criterion names) stay English for scoring consistency",
          ],
        },
      ],
    },
    {
      slug: "privacy",
      section: "account",
      title: "Privacy and your ideas",
      summary: "Who sees what you put in the studio.",
      eyebrow: "Trust",
      tags: ["private", "data", "security", "share", "secret"],
      blocks: [
        {
          type: "p",
          text: "Ideas and reports in your account are private by default. They are not published on a public feed.",
        },
        {
          type: "ul",
          items: [
            "You control the account that owns each idea",
            "API keys, if you create them, only access ideas for that key or account model",
            "We use model providers to score and write reports: do not paste secrets you cannot afford to send to processing systems",
            "Delete account tools remove your data per the product's account flow",
          ],
        },
        {
          type: "callout",
          text: "Questions about data handling: help@validorian.com.",
        },
      ],
    },
    {
      slug: "get-help",
      section: "account",
      title: "Get help from the team",
      summary: "How to reach us and what to include.",
      eyebrow: "Humans",
      tags: ["email", "support", "contact", "bug", "human"],
      blocks: [
        {
          type: "p",
          text: "For product issues, billing, or a stuck campaign, email help@validorian.com. Support and Contact both go to the same inbox for now.",
        },
        {
          type: "ul",
          items: [
            "Include your account email and the idea title if relevant",
            "Screenshots help for UI bugs",
            "Never send passwords",
          ],
        },
      ],
    },
  ],
};
