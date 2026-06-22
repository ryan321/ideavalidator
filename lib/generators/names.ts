import { z } from "zod";
import { generateStructured } from "../ai/client";
import {
  getArtifact,
  getIdea,
  getNameData,
  getVersion,
  listVersions,
  logUsage,
  saveNameData,
} from "../db";
import { checkDomains, checkSite, slugify, type DomainStatus, type SiteSignal } from "../domains";
import { checkHandles, type HandleStatus } from "../social";
import { nameIntel, type NameIntel } from "./name_intel";
import { DEFAULT_TLDS } from "../tlds";

const MAX_CANDIDATES = 6;

const NamesSchema = z.object({
  names: z.array(z.object({ name: z.string(), rationale: z.string() })).min(4).max(10),
});

export type NameFeedback = "up" | "down" | null;

export type NameCandidate = {
  name: string;
  rationale: string;
  domains: Record<string, DomainStatus>;
  site?: SiteSignal | null; // what renders at the .com
  handles?: Record<string, HandleStatus>; // cheap http checks (github, youtube)
  intel?: NameIntel | null; // web-grounded due diligence
  intelError?: string | null;
  feedback?: NameFeedback;
  cost?: number; // spend on this candidate's grounded intel call
};

export type GenerateNamesOpts = {
  instructions?: string | null;
  tlds?: string[] | null;
};

function steerFromHistory(prior: NameCandidate[], instructions?: string | null): string {
  const liked = prior.filter((c) => c.feedback === "up");
  const disliked = prior.filter((c) => c.feedback === "down");
  const seen = prior.map((c) => c.name);
  const parts: string[] = [];
  if (liked.length)
    parts.push(
      `The founder LIKED these names — produce NEW names in the same spirit (sound, length, vibe): ${liked
        .map((c) => c.name)
        .join(", ")}.`
    );
  if (disliked.length)
    parts.push(
      `The founder DISLIKED these — avoid this style and anything similar: ${disliked
        .map((c) => c.name)
        .join(", ")}.`
    );
  if (seen.length)
    parts.push(`Do NOT repeat any name already shown: ${seen.join(", ")}.`);
  if (instructions?.trim())
    parts.push(`Additional founder instructions (follow these closely): "${instructions.trim()}".`);
  return parts.length ? `\n${parts.join("\n")}` : "";
}

/** Generate brand-name candidates and run availability + due-diligence on each. */
export async function generateNames(
  ideaId: string,
  opts?: GenerateNamesOpts
): Promise<{ candidates: NameCandidate[]; cost: number }> {
  const idea = getIdea(ideaId);
  if (!idea) throw new Error("Idea not found");

  const versions = listVersions(ideaId);
  const version =
    (idea.chosen_version_id ? getVersion(idea.chosen_version_id) : undefined) ??
    versions[versions.length - 1];
  const brand = version ? getArtifact(version.id, "brand")?.data : undefined;
  const prior = (getNameData(ideaId).candidates as NameCandidate[] | null) ?? [];
  const liked = prior.filter((c) => c.feedback === "up"); // carried forward, votes intact
  const seen = new Set(prior.map((c) => c.name.trim().toLowerCase())); // never re-show / re-pay
  const tlds = opts?.tlds?.length ? opts.tlds : [...DEFAULT_TLDS];
  const industry = `${idea.title} — ${(version?.statement ?? idea.prompt ?? "").slice(0, 220)}`;

  const { data, usage, model } = await generateStructured(NamesSchema, {
    role: "writing",
    grounded: false,
    maxTokens: 1500,
    system:
      "You are a startup brand-namer. Propose distinctive, pronounceable, .com-plausible brand names — " +
      "short (ideally 1-2 syllables, <= 12 letters), memorable, and ownable, not generic or descriptive. " +
      "Avoid hyphens, numbers, and obvious trademark clashes. Each entry is one real candidate name.",
    prompt: `Idea: "${idea.title}" — ${version?.statement ?? idea.prompt ?? ""}
${brand ? `Brand context (match this voice/archetype): ${JSON.stringify(brand).slice(0, 1500)}` : ""}${steerFromHistory(prior, opts?.instructions)}
Propose ${MAX_CANDIDATES} brand-name candidates. Return JSON: { "names": [{"name": string, "rationale": string (one line)}] }`,
  });

  logUsage({ ideaId, versionId: version?.id ?? null, kind: "names", model, usage });

  // Only enrich names we haven't shown before — hard dedup so a returned duplicate
  // can never overwrite an existing candidate's feedback.
  const freshNames = data.names
    .filter((n) => !seen.has(n.name.trim().toLowerCase()))
    .slice(0, MAX_CANDIDATES);

  // For each fresh candidate, run checks in parallel: domains + (live-site if the .com
  // is registered) + handles + web-grounded due diligence. Intel runs for every one.
  const enriched: NameCandidate[] = await Promise.all(
    freshNames.map(async (n): Promise<NameCandidate> => {
      const slug = slugify(n.name);
      const domains = await checkDomains(n.name, tlds);
      const [site, handles, intelResult] = await Promise.all([
        domains[".com"] === "taken" ? checkSite(`${slug}.com`) : Promise.resolve(null),
        checkHandles(slug),
        nameIntel({ name: n.name, slug, industry })
          .then((r) => {
            logUsage({ ideaId, versionId: version?.id ?? null, kind: "name_intel", model: r.model, usage: r.usage });
            return { intel: r.intel, cost: r.usage.cost, error: null as string | null };
          })
          .catch((e) => ({ intel: null as NameIntel | null, cost: 0, error: e instanceof Error ? e.message : "intel failed" })),
      ]);
      return {
        name: n.name,
        rationale: n.rationale,
        domains,
        site,
        handles,
        intel: intelResult.intel,
        intelError: intelResult.error,
        feedback: null,
        cost: intelResult.cost,
      };
    })
  );

  // Keep the founder's up-voted names (with their prior checks + vote), then add the
  // fresh batch. Only the new intel calls count toward this run's cost.
  const candidates: NameCandidate[] = [...liked, ...enriched];
  saveNameData(ideaId, candidates);
  const cost = usage.cost + enriched.reduce((s, c) => s + (c.cost ?? 0), 0);
  return { candidates, cost };
}

/** Persist a thumbs up/down for one candidate without regenerating. */
export function setNameFeedback(ideaId: string, name: string, feedback: NameFeedback): NameCandidate[] {
  const prior = (getNameData(ideaId).candidates as NameCandidate[] | null) ?? [];
  const next = prior.map((c) => (c.name === name ? { ...c, feedback } : c));
  saveNameData(ideaId, next);
  return next;
}
