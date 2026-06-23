import { z } from "zod";
import { founderProfile, Generator, ideaHeader, priorContext } from "./shared";

export const CustomerPitchSchema = z.object({
  one_liner: z.string(), // positioning: "<product> helps <who> <outcome> without <pain>"
  hook: z.string(), // pain-first opener, in the buyer's own words
  elevator: z.string(), // 2-4 sentences for a first call
  demo_script: z
    .array(z.object({ beat: z.string(), say: z.string() }))
    .min(3), // a live walkthrough, beat by beat
  objections: z
    .array(z.object({ objection: z.string(), response: z.string() }))
    .min(3), // the most likely buyer pushbacks + how to answer
  proof_points: z.array(z.string()).min(2), // why a skeptic should believe it
  why_now: z.string(),
  call_to_action: z.string(), // the specific ask to start a paid pilot/trial
  // Honesty check on the boldest claims (optional for older results).
  claim_check: z
    .array(
      z.object({
        claim: z.string(),
        basis: z.enum(["grounded", "assumption", "aspirational"]).catch("assumption"),
        note: z.string().catch(""),
      })
    )
    .optional(),
});

export type CustomerPitch = z.infer<typeof CustomerPitchSchema>;

export const customerPitchGenerator: Generator<CustomerPitch> = {
  kind: "customer_pitch",
  label: "Customer Pitch",
  blurb: "A pain-first sales pitch to land your first paying customers.",
  role: "writing",
  grounded: false,
  uses: ["validation", "market"],
  schema: CustomerPitchSchema,
  maxTokens: 4000,
  system:
    "You are a founder-led sales coach. Write the pitch the founder uses in a real sales conversation with a " +
    "prospective BUYER — not an investor. Lead with the prospect's pain, make the status quo feel expensive, " +
    "then present the product as the obvious painkiller. Use plain, specific, conversational language a real " +
    "person would say out loud: no buzzwords, no hype, no invented metrics. Every claim must trace to the " +
    "provided artifacts; if you lack a hard number, speak to the outcome qualitatively rather than inventing a figure.",
  buildPrompt: (ctx) => `${ideaHeader(ctx)}${founderProfile(ctx)}${priorContext(ctx, ["validation", "market"])}

Write a customer-facing sales pitch to win the FIRST FEW PAYING CUSTOMERS. Write ONLY for the single specific
buyer persona named in the validation/market artifacts — their exact role/title and segment; do not pitch to a
broader or adjacent audience. Ground every line in the validation narrative (who the buyer is, the pain, the
costly status quo, the cost of inaction, the solution, the after-state) and the demand/competitor findings.
Frame the product as the painkiller — the obvious solution to a problem the buyer already feels — never a
"nice to have." Speak to the buyer's outcome, not your feature list.
Return JSON:
{
  "one_liner": string,                    // "<product> helps <who> <achieve outcome> without <pain>"
  "hook": string,                         // open on the prospect's pain, in their words
  "elevator": string,                     // 2-4 sentences the founder can say in a first call
  "demo_script": [ {"beat": string, "say": string} ],            // 3-5 beats of a live walkthrough
  "objections": [ {"objection": string, "response": string} ],   // the 3-5 most likely buyer pushbacks
  "proof_points": [string],               // why a skeptical buyer should believe it works, drawn from the artifacts
  "why_now": string,                      // why act now instead of next quarter
  "call_to_action": string,               // the specific next step you ask for to start a paid pilot or trial
  "claim_check": [ {"claim": string, "basis": "grounded"|"assumption"|"aspirational", "note": string} ]
                                          // the 3-5 boldest claims in this pitch, each labeled: grounded = backed by the validation/market artifacts; assumption = reasonable but untested; aspirational = a goal you can't yet prove. Be honest — this keeps the founder from overselling.
}`,
};
