import { z } from "zod";
import { Generator, ideaHeader, priorContext } from "./shared";

export const PitchSchema = z.object({
  slides: z
    .array(
      z.object({
        title: z.string(),
        subtitle: z.string(),
        bullets: z.array(z.string()),
        speaker_notes: z.string(),
      })
    )
    .min(8),
});

export type Pitch = z.infer<typeof PitchSchema>;

export const pitchGenerator: Generator<Pitch> = {
  kind: "pitch",
  label: "Pitch Deck",
  blurb: "A 10-12 slide investor deck with speaker notes.",
  role: "reasoning",
  grounded: false,
  uses: ["validation", "market", "plan", "brand"],
  schema: PitchSchema,
  maxTokens: 5000,
  system:
    "You are a pitch-deck coach. Build a tight investor deck. Each slide has a punchy title, a " +
    "one-line subtitle, 2-4 bullets, and speaker notes. Use real numbers from the provided context.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}${priorContext(ctx, ["validation", "market", "plan", "brand"])}

Create a 10-12 slide investor pitch deck covering: Title, Problem, Solution, Market (TAM/SAM/SOM),
Product, Business Model, Go-to-Market, Competition, Traction/Milestones, Team, Financials, The Ask.
Return JSON:
{ "slides": [{"title": string, "subtitle": string, "bullets": [string], "speaker_notes": string}] }`,
};
