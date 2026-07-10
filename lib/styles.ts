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
    label: "Vellum",
    blurb: "Ivory memo · carmine stamp · boardroom brief",
    swatches: ["#f7f3ea", "#9b2c2c", "#1a7a4c"],
  },
  ink: {
    label: "Foundry",
    blurb: "Charcoal night · molten gold · after-hours desk",
    swatches: ["#0e0e10", "#e2b13c", "#3ecf8e"],
  },
  slate: {
    label: "Nocturne",
    blurb: "Deep navy · ice blue · observatory console",
    swatches: ["#0a1020", "#5b9fd4", "#3dcea0"],
  },
  signal: {
    label: "Broadsheet",
    blurb: "Newsprint white · ink black · stop-press red",
    swatches: ["#f4f4f0", "#d12b2b", "#111111"],
  },
  grove: {
    label: "Library",
    blurb: "Soft linen · forest green · quiet study",
    swatches: ["#f2f0e9", "#2f5d50", "#1f7a4d"],
  },
};

export function isStyleId(v: unknown): v is StyleId {
  return typeof v === "string" && (STYLE_IDS as readonly string[]).includes(v);
}

export function normalizeStyleId(v: unknown): StyleId {
  return isStyleId(v) ? v : "paper";
}
