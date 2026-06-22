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
  role: "writing",
  grounded: false,
  uses: ["validation", "market", "brand"],
  schema: MarketingSchema,
  maxTokens: 5000,
  system:
    "You are a direct-response marketer. Write punchy, conversion-focused copy. The brand artifact gives " +
    "you a tone, voice_dos, voice_donts, chosen name, and taglines — every line you write must obey " +
    "voice_dos and never violate voice_donts, and the landing hero_headline must reuse one of the brand " +
    "tagline_options (lightly adapted). If the brand context is absent, infer a consistent voice and hold " +
    "it across all channels.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}${priorContext(ctx, ["validation", "market", "brand"])}

Produce a marketing suite. Every headline, hook, and bullet must be specific to THIS product — lead with
the concrete differentiator and speak to the persona pains and current_solutions from the market context
(name the frustration with the status quo, e.g. the competitor or manual workaround they use today). Ban
generic filler ("boost productivity", "game-changer", "all-in-one solution", "try it free today") unless
tied to a concrete idea-specific benefit. At least one ad headline AND one UGC hook must include a concrete
number or specific outcome drawn from the validation/market data.
Produce one ad for EACH of Meta, Google, LinkedIn, TikTok, Instagram (5 total), respecting each platform:
Google headline <=30 chars and primary_text <=90 chars; Meta/Instagram a scroll-stopping hook + short
paragraph; LinkedIn a credibility-led professional tone; TikTok copy written for a spoken, fast-cut video
(the visual_idea must fit that platform). Also a landing page; a 3-email nurture sequence with stage set
to exactly one of "welcome", "value", "hard-offer" (one per stage, in that order); and 2-3 UGC scripts.
Return JSON:
{
  "ads": [{"platform": string, "headline": string, "primary_text": string, "cta": string, "visual_idea": string}],
  "landing_copy": {"hero_headline": string, "subheadline": string, "bullets": [string], "cta": string},
  "email_sequence": [{"stage": string, "subject": string, "body": string}],
  "ugc_scripts": [{"platform": string, "hook": string, "script": string, "cta": string}]
}`,
};
