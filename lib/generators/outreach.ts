import { z } from "zod";
import { Generator, ideaHeader, priorContext } from "./shared";

export const OutreachSchema = z.object({
  channel_strategy: z.string(), // which 1-2 channels to lead with for THIS buyer, and why
  openers: z
    .array(
      z.object({
        channel: z.string(), // Cold email, LinkedIn DM, X DM, Community/Reddit, Warm-intro ask
        subject: z.string().catch(""), // for email; "" otherwise
        message: z.string(), // the actual 2-4 line cold open
        why: z.string(), // the trigger / why this lands with this buyer
      })
    )
    .min(3),
  first_five_plan: z.array(z.string()).min(3), // concrete steps to land the first 5 paying customers
});

export type Outreach = z.infer<typeof OutreachSchema>;

export const outreachGenerator: Generator<Outreach> = {
  kind: "outreach",
  label: "Outreach",
  blurb: "Cold openers + a concrete plan to land your first 5 paying customers.",
  role: "writing",
  grounded: false,
  uses: ["validation", "market", "customer_pitch"],
  schema: OutreachSchema,
  maxTokens: 3500,
  system:
    "You are a founder-led-sales and cold-outreach coach. Write the SHORT first-touch messages a solo founder " +
    "sends to win their first few paying customers — NOT a full pitch. A cold opener is 2-4 lines: lead with the " +
    "prospect's specific pain or a relevant trigger, be human and concrete, and ask for one small next step (a " +
    "reply, a 15-min call). No buzzwords, no 'hope this finds you well', no fake personalization. Recommend the " +
    "1-2 channels that actually fit this buyer (don't list every channel) and give a realistic plan to reach 5 " +
    "paying customers from a standing start.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}${priorContext(ctx, ["validation", "market", "customer_pitch"])}

Write first-touch OUTREACH to land the first 5 paying customers. Ground it in the validation narrative (who the
buyer is and their acute pain) and the persona/competitor findings. Pick the channels that fit THIS buyer (e.g.
LinkedIn + warm intros for B2B ops leaders; niche communities for prosumers) — don't pad with channels that
won't work.
Return JSON:
{
  "channel_strategy": string,            // the 1-2 channels to lead with and why, for this specific buyer
  "openers": [ {"channel": string, "subject": string, "message": string, "why": string} ],  // 3-5 short cold opens
  "first_five_plan": [string]            // concrete, ordered steps to get from 0 to 5 paying customers
}`,
};
