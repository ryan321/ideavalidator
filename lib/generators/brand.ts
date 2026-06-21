import { z } from "zod";
import { Generator, ideaHeader, priorContext } from "./shared";

export const BrandSchema = z.object({
  name_ideas: z.array(z.string()).min(3),
  archetype: z.object({ name: z.string(), why: z.string() }),
  mission: z.string(),
  vision: z.string(),
  value_proposition: z.string(),
  tone: z.string(),
  voice_dos: z.array(z.string()).min(1),
  voice_donts: z.array(z.string()).min(1),
  tagline_options: z.array(z.string()).min(3),
  positioning_statement: z.string(),
});

export type Brand = z.infer<typeof BrandSchema>;

export const brandGenerator: Generator<Brand> = {
  kind: "brand",
  label: "Brand Strategy",
  blurb: "Archetype, mission/vision, voice, taglines, positioning.",
  role: "reasoning",
  grounded: false,
  uses: ["validation", "market"],
  schema: BrandSchema,
  maxTokens: 3500,
  system:
    "You are a brand strategist. Pick ONE of the 12 Jungian brand archetypes (Innocent, Sage, " +
    "Explorer, Outlaw, Magician, Hero, Lover, Jester, Everyman, Caregiver, Ruler, Creator) that best " +
    "fits, and build a coherent identity around it. Distinct and ownable, never generic.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}${priorContext(ctx, ["validation", "market"])}

Create a brand strategy. Return JSON:
{
  "name_ideas": [string], "archetype": {"name": string, "why": string},
  "mission": string, "vision": string, "value_proposition": string,
  "tone": string, "voice_dos": [string], "voice_donts": [string],
  "tagline_options": [string], "positioning_statement": string
}`,
};
