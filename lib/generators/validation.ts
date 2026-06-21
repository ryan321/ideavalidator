import { z } from "zod";
import { Generator, ideaHeader } from "./shared";

export const ValidationSchema = z.object({
  verdict: z.enum(["GO", "MAYBE", "NO-GO"]),
  score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  summary: z.string(),
  dimensions: z
    .array(
      z.object({
        name: z.string(),
        score: z.number().min(0).max(100),
        rationale: z.string(),
      })
    )
    .min(4),
  strengths: z.array(z.string()).min(1),
  weaknesses: z.array(z.string()).min(1),
  risks: z
    .array(
      z.object({
        risk: z.string(),
        severity: z.enum(["low", "medium", "high"]),
        mitigation: z.string(),
      })
    )
    .min(1),
  suggestions: z.array(z.string()).min(1),
  similar_failures: z.array(
    z.object({
      company: z.string(),
      why_failed: z.string(),
      lesson: z.string(),
    })
  ),
});

export type Validation = z.infer<typeof ValidationSchema>;

export const validationGenerator: Generator<Validation> = {
  kind: "validation",
  label: "Validation",
  blurb: "Scored GO / NO-GO verdict with strengths, risks, and fixes.",
  role: "reasoning",
  grounded: true,
  schema: ValidationSchema,
  maxTokens: 5000,
  system:
    "You are a brutally honest startup analyst. You validate ideas against real market evidence " +
    "from web search, not hype. Score conservatively; most ideas should not score above 75. " +
    "Cite concrete demand signals, competitors, and comparable failures. Be specific, never generic.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}

Validate this idea. Use live web search to ground every claim in real evidence (demand signals on
Reddit/forums/Product Hunt, existing competitors, search trends, pricing).

Score these dimensions 0-100 (include all): Market demand, Competition intensity (higher score = LESS
crowded / more room), Feasibility, Monetization potential, Timing, Defensibility/moat.

Produce an overall score (weighted, 0-100), a confidence %, and a verdict (GO / MAYBE / NO-GO).
Include: a 2-3 sentence summary, strengths, weaknesses, ranked risks with severity + mitigation,
concrete improvement suggestions, and 1-3 comparable companies that FAILED in this space with the
lesson each one teaches.

Return JSON with this shape:
{
  "verdict": "GO"|"MAYBE"|"NO-GO",
  "score": number, "confidence": number, "summary": string,
  "dimensions": [{"name": string, "score": number, "rationale": string}],
  "strengths": [string], "weaknesses": [string],
  "risks": [{"risk": string, "severity": "low"|"medium"|"high", "mitigation": string}],
  "suggestions": [string],
  "similar_failures": [{"company": string, "why_failed": string, "lesson": string}]
}`,
};
