import { z } from "zod";
import { Generator, ideaHeader, priorContext } from "./shared";

export const PromotionSchema = z.object({
  channel_strategy: z.string(), // the 1-2 channels to lead with for THIS buyer, and why
  channels: z
    .array(
      z.object({
        channel: z.string(), // e.g. "LinkedIn", "X/Twitter", "r/saas", "YouTube", "SEO/blog"
        why: z.string(), // why this fits the buyer
        first_move: z.string(), // the first concrete thing to do here
      })
    )
    .min(2),
  presence_checklist: z.array(z.string()).min(2), // what to stand up (landing page, profiles, etc.)
  content_plan: z
    .array(
      z.object({
        theme: z.string(), // a content angle that draws this buyer
        formats: z.string(), // e.g. "short build-in-public posts + one long teardown/wk"
        cadence: z.string(), // e.g. "3x/week"
      })
    )
    .min(2),
  launch_tactics: z.array(z.string()).min(2), // concrete ways to get the first word out
});

export type Promotion = z.infer<typeof PromotionSchema>;

export const promotionGenerator: Generator<Promotion> = {
  kind: "promotion",
  label: "Promotion plan",
  blurb: "Where to show up, what to post, and how to get the word out.",
  role: "writing",
  grounded: false,
  uses: ["validation", "customer_pitch"],
  schema: PromotionSchema,
  maxTokens: 3000,
  system:
    "You are a scrappy founder-marketing coach. Tell a solo founder how to BUILD A PRESENCE and get the word " +
    "out for THIS specific buyer — not generic 'be on all platforms' advice. Pick the 1-2 channels that " +
    "actually fit the buyer and commit to them; recommend a content angle and a realistic posting cadence a " +
    "solo founder can sustain; and give concrete, low-budget launch tactics (communities to post in, a Product " +
    "Hunt/Show HN angle, partnerships) — no vanity advice, no paid-ads-only answers, no buzzwords.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}${priorContext(ctx, ["validation", "customer_pitch"])}

Build the PROMOTION plan — how this founder gets a presence and gets the word out to the buyer named in the
validation/pitch. Pick channels that fit THIS buyer (don't pad), keep it sustainable for one person.
Return JSON:
{
  "channel_strategy": string,                                  // the 1-2 channels to lead with and why
  "channels": [ {"channel": string, "why": string, "first_move": string} ],   // 2-4 channels + first action on each
  "presence_checklist": [string],                              // what to stand up: landing page, profiles, etc.
  "content_plan": [ {"theme": string, "formats": string, "cadence": string} ], // 2-3 content angles + cadence
  "launch_tactics": [string]                                   // 3-5 concrete, low-budget ways to get the first word out
}`,
};
