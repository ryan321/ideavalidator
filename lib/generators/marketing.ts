import { z } from "zod";
import { Generator, ideaHeader, priorContext } from "./shared";

export const MarketingSchema = z.object({
  ads: z
    .array(
      z.object({
        platform: z.string(),
        headline: z.string(),
        primary_text: z.string(),
        cta: z.string(),
        visual_idea: z.string(),
      })
    )
    .min(3),
  landing_copy: z.object({
    hero_headline: z.string(),
    subheadline: z.string(),
    bullets: z.array(z.string()).min(3),
    cta: z.string(),
  }),
  email_sequence: z
    .array(
      z.object({ stage: z.string(), subject: z.string(), body: z.string() })
    )
    .min(3),
  ugc_scripts: z
    .array(
      z.object({
        platform: z.string(),
        hook: z.string(),
        script: z.string(),
        cta: z.string(),
      })
    )
    .min(2),
});

export type Marketing = z.infer<typeof MarketingSchema>;

export const marketingGenerator: Generator<Marketing> = {
  kind: "marketing",
  label: "Marketing Suite",
  blurb: "Platform ads, landing copy, email sequence, and UGC scripts.",
  role: "reasoning",
  grounded: false,
  uses: ["validation", "market", "brand"],
  schema: MarketingSchema,
  maxTokens: 5000,
  system:
    "You are a direct-response marketer. Write punchy, conversion-focused copy in the brand voice " +
    "provided. Tailor each ad to its platform's format and audience.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}${priorContext(ctx, ["validation", "market", "brand"])}

Produce a marketing suite. Cover ads for Meta, Google, LinkedIn, TikTok, and Instagram; a landing
page; a 3-email nurture sequence (welcome / value / hard-offer); and 2-3 UGC video scripts. Return JSON:
{
  "ads": [{"platform": string, "headline": string, "primary_text": string, "cta": string, "visual_idea": string}],
  "landing_copy": {"hero_headline": string, "subheadline": string, "bullets": [string], "cta": string},
  "email_sequence": [{"stage": string, "subject": string, "body": string}],
  "ugc_scripts": [{"platform": string, "hook": string, "script": string, "cta": string}]
}`,
};
