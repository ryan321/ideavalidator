/** Visual style packs — pure presentation; no scoring/feature behavior. */

export const STYLE_IDS = ["paper", "ink", "slate", "signal", "grove"] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export const STYLE_STORAGE_KEY = "iv-style";

export const STYLES: Record<
  StyleId,
  {
    label: string;
    blurb: string;
    /** swatches for the picker UI [bg, accent, signal] */
    swatches: [string, string, string];
  }
> = {
  paper: {
    label: "Paper",
    blurb: "Warm committee ledger — best for long reads",
    swatches: ["#f3efe6", "#8b6914", "#1a7f4b"],
  },
  ink: {
    label: "Ink",
    blurb: "Dark brass desk — night red-team",
    swatches: ["#100e0c", "#d4a017", "#3dba7a"],
  },
  slate: {
    label: "Slate",
    blurb: "Cool instrument panel — steel & graphite",
    swatches: ["#0a0c11", "#5a8fcf", "#33cb8c"],
  },
  signal: {
    label: "Signal",
    blurb: "Stark editorial — black, white, vermillion",
    swatches: ["#f7f7f5", "#c43c2c", "#1a1a1a"],
  },
  grove: {
    label: "Grove",
    blurb: "Soft sage — calmer daylight desk",
    swatches: ["#eef2eb", "#3d6b4f", "#2a5a3a"],
  },
};

export function isStyleId(v: unknown): v is StyleId {
  return typeof v === "string" && (STYLE_IDS as readonly string[]).includes(v);
}

export function normalizeStyleId(v: unknown): StyleId {
  return isStyleId(v) ? v : "paper";
}
