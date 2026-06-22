import { z } from "zod";
import { generateStructured, type Usage } from "../ai/client";

// Grounded models return uneven JSON — a missing sub-field shouldn't fail the whole
// call (that just triggers an expensive retry and then drops all due diligence). Every
// field falls back to a safe value via .catch so partial output still validates.
const HandleSchema = z.object({
  platform: z.string().catch(""), // x, instagram, tiktok, youtube, github
  likely_taken: z.boolean().optional().catch(undefined), // undefined = couldn't tell
  note: z.string().catch(""), // by whom, if known
});

export const NameIntelSchema = z.object({
  overall_risk: z.enum(["low", "medium", "high"]).catch("medium"),
  summary: z.string().catch(""), // one-line read for adopting this name
  company_exists: z.boolean().catch(false), // a real/established company already under this name?
  company_note: z.string().catch(""), // who, how established, URL if found
  same_industry: z.boolean().catch(false), // is that company in our space (collision risk)?
  trademark_risk: z.enum(["none", "possible", "likely"]).catch("none"),
  trademark_note: z.string().catch(""),
  existing_business: z.string().catch(""), // anyone doing business under the name (DBA, shops)
  handles: z.array(HandleSchema).catch([]),
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
- handles: for EACH of x (twitter), instagram, tiktok, youtube, github — return an object with ALL of: platform, likely_taken (true/false), and note (by whom, or "" if unknown). Is the handle "${args.slug}" likely already taken?
- overall_risk (low|medium|high) + summary: one-line read on how safe it is to adopt this name.`,
  });
  return { intel: data, usage, model };
}
