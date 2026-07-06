import type { EvidenceSource } from "./types";

// One place that names every evidence source, so the prompt formatter (index.ts) and
// the UI (EvidencePanel) never drift on labels. `short` is for the tight stats row.
export const SOURCE_META: Record<EvidenceSource, { name: string; short: string }> = {
  reddit: { name: "Reddit", short: "Reddit" },
  hn: { name: "Hacker News", short: "HN" },
  appstore: { name: "App Store", short: "App Store" },
  stackexchange: { name: "Stack Exchange", short: "Stack Exch." },
  github: { name: "GitHub", short: "GitHub" },
  youtube: { name: "YouTube", short: "YouTube" },
  producthunt: { name: "Product Hunt", short: "Prod. Hunt" },
  web: { name: "Web", short: "Web" },
};

// Grouping order for the evidence UI — review/complaint sources (higher-signal) first.
export const SOURCE_ORDER: EvidenceSource[] = [
  "reddit",
  "appstore",
  "stackexchange",
  "github",
  "hn",
  "youtube",
  "producthunt",
  "web",
];

// Accepts a plain string (EvidenceItem.source is widened to string in some call sites).
export function sourceName(source: string): string {
  return (SOURCE_META as Record<string, { name: string }>)[source]?.name ?? source;
}
