import { z } from "zod";
import { Generator, ideaHeader, priorContext } from "./shared";

export const LogoSchema = z.object({
  concept: z.string(),
  logo_svg: z.string(),
  wordmark: z.string(),
  palette: z
    .array(z.object({ name: z.string(), hex: z.string(), usage: z.string() }))
    .min(3),
  typography: z.object({
    heading: z.object({ font: z.string(), note: z.string() }),
    body: z.object({ font: z.string(), note: z.string() }),
  }),
  usage_notes: z.array(z.string()).min(1),
});

export type Logo = z.infer<typeof LogoSchema>;

export const logoGenerator: Generator<Logo> = {
  kind: "logo",
  label: "Logo & Visual Identity",
  blurb: "An SVG logo concept, color palette, and font pairing.",
  role: "reasoning",
  grounded: false,
  uses: ["brand"],
  schema: LogoSchema,
  maxTokens: 4000,
  system:
    "You are a logo and visual-identity designer who outputs clean, valid, self-contained SVG. " +
    "The SVG must use a 0 0 240 240 viewBox, no external fonts or images, no <script>, and look " +
    "modern and minimal (simple geometric mark + optional wordmark). Use the palette colors.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}${priorContext(ctx, ["brand"])}

Design a logo and visual identity. The "logo_svg" must be complete, valid, standalone SVG markup
(start with <svg ... viewBox="0 0 240 240">). Return JSON:
{
  "concept": string,
  "logo_svg": "<svg ...>...</svg>",
  "wordmark": string,
  "palette": [{"name": string, "hex": "#RRGGBB", "usage": string}],
  "typography": {"heading": {"font": string, "note": string}, "body": {"font": string, "note": string}},
  "usage_notes": [string]
}`,
};
