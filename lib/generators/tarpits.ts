// Known "tarpit" idea clusters — patterns that look easy and universally appealing,
// so everyone builds them, but where distribution/retention/economics quietly kill
// almost all attempts. A tarpit match is NOT an auto-fail: the prompt requires the
// model to name prior attempts it found and score the founder's DIFFERENTIATED INSIGHT.
// Absent a real insight, the demand-side criteria (Demand Strength, Problem-Solution
// Fit) and Differentiation / Moat should band low, with a note in their explanations.
//
// Each line: the pattern + why it's a tarpit. Kept concise — this is injected verbatim
// into the validation SYSTEM prompt, so terseness matters.
export const TARPIT_LIBRARY: string[] = [
  "Discovery/recommendation apps (\"an app to find restaurants / friends / events / hikes\") — evergreen founder appeal, but supply and habit never form; a graveyard of attempts.",
  "Social network for X (a niche's own Facebook/community app) — chicken-and-egg cold start; the audience already congregates in existing platforms they won't leave.",
  "Generic two-sided marketplaces with no wedge — you must light BOTH sides on fire at once with no unfair supply, and incumbents already aggregate the liquidity.",
  "\"Uber for X\" on-demand services — real-world ops, thin margins, and no network effect unless density is local and defensible; most X's don't have Uber's frequency.",
  "Thin AI wrappers with no proprietary data or workflow lock-in — the model provider can absorb the feature and everyone ships the same demo in a weekend.",
  "Meal / recipe planners — beloved to build, near-zero WTP, brutal retention; free incumbents and \"I'll just wing it\" are the real competitors.",
  "Habit trackers / self-improvement apps — download spike then churn; the behavior change, not the app, is the hard part, and users blame themselves not you.",
  "Local-events / \"what's happening near me\" apps — perpetual cold-start, stale listings, and eventbrite/facebook/google already own the query.",
  "\"Slack/Notion but for [vertical]\" — horizontal incumbents extend down-market faster than you can build the vertical depth that would justify switching.",
  "Crypto/web3 for mainstream consumers — the wallet/onboarding tax and volatility repel the non-crypto users the pitch depends on.",
  "Ad-supported consumer content apps — you need enormous scale before ad revenue clears, and distribution (not the product) is the entire game.",
  "Productivity / to-do apps — the most-built category in software; switching costs are near zero and the market is saturated with excellent free tools.",
  "Group-decision apps (\"where should we eat / when should we meet\") — used once, shared to a group that never installs it, and the friction beats the payoff.",
  "Nearby-people / proximity social apps — safety, liquidity, and cold-start problems that only a handful of well-funded players ever solved, briefly.",
  "Universal-inbox / aggregator apps (one app for all your messages/notifications/subscriptions) — platforms actively fight the integrations and API access you depend on.",
];

/**
 * The tarpit / SISP / schlep block injected into the validation SYSTEM prompt. It lists
 * the known tarpits and states the RULES the model must follow (match ≠ auto-fail;
 * require prior attempts + differentiated insight; SISP caps Problem-Solution Fit at C;
 * schlep cuts the other way). The stored `tarpit`/`sisp` fields carry the finding out.
 */
export function tarpitPromptBlock(): string {
  const lib = TARPIT_LIBRARY.map((t) => `- ${t}`).join("\n");
  return (
    "\n\nKNOWN TARPITS — idea patterns that look easy and universally appealing, so everyone builds them, " +
    "but where distribution, retention, and economics quietly kill almost every attempt:\n" +
    lib +
    "\nTARPIT RULE (a match is NOT an auto-fail — but it RAISES the bar): if this idea matches a tarpit pattern " +
    "above, you MUST (1) name specific PRIOR ATTEMPTS at this pattern that you found via web search (real companies " +
    "that tried it and how they fared), and (2) judge the founder's DIFFERENTIATED INSIGHT — the specific, non-obvious " +
    "reason THIS attempt escapes the graveyard (an unfair distribution advantage, proprietary supply/data, a genuine " +
    "counter-position). Absent a real differentiated insight, Demand Strength, Problem-Solution Fit, and Differentiation / " +
    "Moat should band LOW and you should say so plainly in those explanations. When the idea matches, set the stored " +
    "\"tarpit\" object: { matched: true, pattern (which tarpit, one phrase), prior_attempts (the real prior attempts you " +
    "found + outcomes), differentiated_insight (the founder's real escape hatch, or \"none found\" if there isn't one) }. " +
    "If it matches NO tarpit, omit \"tarpit\" entirely.\n" +
    "SISP RULE (solution in search of a problem): if the pitch starts from a TECHNOLOGY or a SOLUTION with NO named " +
    "sufferer and no concrete, articulated pain (\"we built X, surely someone needs it\"), it is a solution in search of " +
    "a problem — set \"sisp\": true and CAP Problem-Solution Fit at band C (a mechanism with no proven problem to attach " +
    "to cannot band higher). If a real sufferer and pain are named, omit \"sisp\".\n" +
    "SCHLEP RULE (schlep blindness cuts the OTHER way): an idea being HARD, unsexy, or operationally heavy must NOT lower " +
    "the demand-side criteria — most founders AVOID schleps, so a hard idea is often LESS crowded. A genuine schlep can " +
    "RAISE Differentiation / Moat (counter-positioning / a barrier to entry competitors won't stomach). Never dock demand " +
    "for difficulty; route difficulty to the moat and Goal Fit instead."
  );
}
