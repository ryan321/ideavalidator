/** Shared marketing copy so landing and pricing stay aligned. */

/** Concrete deliverables in a validation pass (checkmark list). */
export const WHAT_YOU_GET = [
  "GO / MAYBE / NO-GO scored against your goal",
  "Demand analysis (how badly people want this)",
  "Willingness-to-pay read",
  "Competition review",
  "Obtainable revenue estimate",
  "Risk map (what can kill it)",
  "Buyer profile: who to sell to and where",
  "Real-world test plan (who to talk to, pass/fail)",
  "Social media search (Reddit, forums, and live web signals)",
  "Evidence-backed claims with sources",
  "Iterate: rewrite the pitch and re-score",
  "Variations: try different angles side by side",
  "Multiple full reports as the idea evolves",
  "Chat with the review: dig into scores, risks, and next steps",
] as const;

/** Landing-only process steps (pricing stays lean and does not repeat these). */
export const HOW_IT_WORKS_STEPS = [
  {
    n: "01",
    title: "Describe the idea",
    body: "What you're offering, who it's for, and why now, plus your goal so GO means the right thing for you.",
  },
  {
    n: "02",
    title: "Unlock & get a hard score",
    body: "One payment opens a full pass on that idea. You get an evidence-backed GO / MAYBE / NO-GO, not a pep talk.",
  },
  {
    n: "03",
    title: "Keep working it",
    body: "Rewrite the pitch, try a different angle, chat with the review, and re-score until the answer is clear.",
  },
] as const;
