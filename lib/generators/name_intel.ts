import { z } from "zod";
import { generateStructured, type Usage } from "../ai/client";

export const NameIntelSchema = z.object({
  overall_risk: z.enum(["low", "medium", "high"]),
  summary: z.string(), // one-line read for adopting this name
  company_exists: z.boolean(), // a real/established company or product already under this name?
  company_note: z.string(), // who, how established, URL if found
  same_industry: z.boolean(), // is that company in our space (real confusion/collision risk)?
  trademark_risk: z.enum(["none", "possible", "likely"]),
  trademark_note: z.string(),
  existing_business: z.string(), // anyone doing business under the name (DBA, shops, etc.)
  handles: z
    .array(
      z.object({
        platform: z.string(), // x, instagram, tiktok, youtube, github
        likely_taken: z.boolean(),
        note: z.string(), // by whom, if known
      })
    )
    .default([]),
});

export type NameIntel = z.infer<typeof NameIntelSchema>;

/** Web-grounded due diligence on a single candidate name. */
export async function nameIntel(args: {
  name: string;
  slug: string;
  industry: string;
}): Promise<{ intel: NameIntel; usage: Usage; model: string }> {
  const { data, usage, model } = await generateStructured(NameIntelSchema, {
    role: "research",
    grounded: true,
    maxTokens: 1600,
    system:
      "You are a brand-name due-diligence researcher. Use live web search to assess whether a proposed brand " +
      "name collides with an existing company, product, trademark, or social presence. Report only what you can " +
      "actually find — never invent companies, trademarks, or owners. If searches turn up nothing notable, say " +
      "the name looks clear and set risks to low/none. Be concrete (name the company/owner and link when found).",
    prompt: `Proposed brand name: "${args.name}" (handle/slug: "${args.slug}").
Our startup operates in: ${args.industry}.
Research and report as JSON:
- company_exists + company_note: is there a real, established company or product already operating under this name (or a near-identical spelling)? Who, how established, and a URL if found.
- same_industry: is that existing company in the SAME or an adjacent industry to ours (a genuine confusion/collision risk), true/false.
- trademark_risk (none|possible|likely) + trademark_note: any registered trademark on this name (USPTO/EUIPO or clear commercial use).
- existing_business: is anyone already doing business under this name (a DBA, local shop, small brand)? brief.
- handles: for x (twitter), instagram, tiktok, youtube, github — is the handle "${args.slug}" likely already taken, and by whom if known.
- overall_risk (low|medium|high) + summary: one-line read on how safe it is to adopt this name.`,
  });
  return { intel: data, usage, model };
}
