import { z } from "zod";
import { Generator, ideaHeader, priorContext } from "./shared";

export const LogoSchema = z.object({
  concept: z.string(),
  logo_svg: z
    .string()
    .regex(/^\s*<svg[\s\S]*<\/svg>\s*$/i, "logo_svg must be a complete <svg>…</svg> document"),
  wordmark: z.string(),
  palette: z
    .array(
      z.object({
        name: z.string(),
        hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "hex must be #RRGGBB"),
        usage: z.string(),
      })
    )
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
    "You are a logo and visual-identity designer who outputs a clean, valid, INERT, self-contained SVG " +
    "using a 0 0 240 240 viewBox. Allowed elements ONLY: svg, g, defs, linearGradient, radialGradient, " +
    "stop, path, rect, circle, ellipse, line, polyline, polygon, text, tspan, title. FORBIDDEN: <script>, " +
    "<foreignObject>, <a>, <image>, <use href>, <iframe>, any external/remote URL (no http://, https://, " +
    "or // refs), data: URIs, javascript: URIs, CSS url() references, and any event-handler attribute " +
    "(anything starting with 'on'). All fills/strokes must be inline hex colors or local gradient refs " +
    "(url(#id)). If the SVG contains any <text>, use ONLY a generic family (sans-serif/serif/monospace) — " +
    "never the custom typography fonts (they cannot load in an inert SVG); prefer outlined <path> geometry.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}${priorContext(ctx, ["brand"])}

Design a logo and visual identity. The mark must be a deliberate visual METAPHOR for THIS idea, not a
generic abstract shape. In "concept", name the specific object, letterform, or metaphor the mark depicts
and why it represents this idea. Ban these clichés unless directly justified: generic globes, gradient
swooshes, abstract leaves, plain initials in a circle, overlapping speech bubbles.
Stay consistent with the brand context above: set "wordmark" to the chosen brand name (use one of the
brand's name_ideas — do NOT invent a new name), and make the mark, palette, and typography express the
brand's archetype and tone (reference the archetype in "concept").
The "logo_svg" must be complete, valid, standalone SVG (start with <svg ... viewBox="0 0 240 240">).
Provide AT LEAST 3 palette colors; every "hex" must be exactly #RRGGBB (no shorthand, no named colors).
Return JSON:
{
  "concept": string,
  "logo_svg": "<svg ...>...</svg>",
  "wordmark": string,
  "palette": [{"name": string, "hex": "#RRGGBB", "usage": string}],
  "typography": {"heading": {"font": string, "note": string}, "body": {"font": string, "note": string}},
  "usage_notes": [string]
}`,
};
