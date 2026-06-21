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

Create a brand strategy SPECIFIC to this idea and its persona/competitors above — it must read as ownable
by this product alone, not transplantable to any startup. Ground it in the context: name the target persona
from the market analysis, and choose an archetype + positioning that deliberately CONTRAST with the named
competitors' positioning (call out the contrast in archetype.why and positioning_statement).
Ban generic filler: do NOT use the words empowering, seamless, innovative, cutting-edge, revolutionize,
world-class, next-generation, or game-changing. Every name, tagline, and value-prop must reference a
concrete attribute, audience, or outcome of this idea. Return JSON:
{
  "name_ideas": [string] (4-6 real, pronounceable, .com-plausible brand names — not the literal product description),
  "archetype": {"name": one of the 12 listed archetypes, "why": 2-3 sentences justifying it from this idea's persona and promise, and naming one archetype you rejected and why it fit worse},
  "mission": string, "vision": string,
  "value_proposition": string (a one-line outcome promise — what the user gets — distinct from positioning),
  "tone": string, "voice_dos": [string] (3-5), "voice_donts": [string] (3-5),
  "tagline_options": [string] (4-6, each under 7 words),
  "positioning_statement": "For [specific persona] who [need], [brand] is the [category] that [single differentiated benefit], unlike [a named competitor from the market analysis]."
}`,
};
