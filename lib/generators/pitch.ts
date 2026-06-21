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
    .min(10),
});

export type Pitch = z.infer<typeof PitchSchema>;

export const pitchGenerator: Generator<Pitch> = {
  kind: "pitch",
  label: "Pitch Deck",
  blurb: "A 10-12 slide investor deck with speaker notes.",
  role: "reasoning",
  grounded: false,
  uses: ["validation", "market", "financials", "plan", "brand"],
  schema: PitchSchema,
  maxTokens: 5000,
  system:
    "You are a pitch-deck coach. Build a tight investor deck. Each slide has a punchy title, a one-line " +
    "subtitle, 2-4 bullets, and speaker notes. Every number on a slide MUST be copied verbatim from the " +
    "provided artifacts — never write placeholders like $X, [TBD], or N/A, and never invent a figure not " +
    "in the artifacts; if a needed number is genuinely absent, state it as a clearly-labeled assumption in " +
    "speaker_notes rather than presenting it as fact.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}${priorContext(ctx, ["validation", "market", "financials", "plan", "brand"])}

Create a 12-slide investor pitch deck, one slide per section, in this order (do not merge or omit any):
Title, Problem, Solution, Market (TAM/SAM/SOM), Product, Business Model, Go-to-Market, Competition,
Traction/Milestones, Team, Financials, The Ask.
Source each slide from the artifacts: Problem/Solution from validation.summary + plan; Market from
market.sizing + cagr_label; Competition from market.competitors[] (name 2-3 real competitors and your gap);
Business Model + Financials + The Ask from the financials artifact (revenue_model, projections,
startup_cost, break_even, unit_economics); Traction/Milestones from plan.milestones; Team from plan.team_and_ops.
Return JSON:
{ "slides": [{"title": string, "subtitle": string, "bullets": [string], "speaker_notes": string}] }`,
};
