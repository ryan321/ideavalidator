/** Visual style packs — color + type + form language.
 *
 * Each pack is a full desk: surfaces, accent, type pair, radius, stamp, shadow.
 * Runtime applies CSS variables on <html> (see applyStyleToDocument).
 */

/** Display order in the style picker (first = default). */
export const STYLE_IDS = ["studio", "paper", "slate", "ink", "signal", "grove"] as const;
export type StyleId = (typeof STYLE_IDS)[number];

export const STYLE_STORAGE_KEY = "iv-style";

export type StyleTokens = {
  scheme: "light" | "dark";
  bg: string;
  panel: string;
  panel2: string;
  border: string;
  fg: string;
  muted: string;
  accent: string;
  accent2: string;
  onAccent: string;
  good: string;
  warn: string;
  bad: string;
  header: string;
  deskGlow: string;
  deskGlow2: string;
  folioTop: string;
  folioBot: string;
  folioShadow: string;
  stampFill: string;
  radiusCard: string;
  /** Form language */
  radiusControl: string;
  radiusPill: string;
  /** Type stacks — must reference faces loaded in layout (CSS vars) */
  fontDisplay: string;
  fontBody: string;
  fontMono: string;
  trackingDisplay: string;
  trackingBody: string;
  trackingEyebrow: string;
  weightDisplay: string;
  /** Stamp */
  stampRotate: string;
  stampRadius: string;
  stampBorder: string;
  stampTracking: string;
  /** Texture */
  noiseOpacity: string;
};

const faces = {
  fraunces: "var(--font-fraunces), Georgia, 'Times New Roman', serif",
  newsreader: "var(--font-newsreader), Georgia, 'Times New Roman', serif",
  sourceSerif: "var(--font-source-serif), Georgia, serif",
  syne: "var(--font-syne), ui-sans-serif, system-ui, sans-serif",
  space: "var(--font-space), ui-sans-serif, system-ui, sans-serif",
  dmSans: "var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif",
  figtree: "var(--font-figtree), ui-sans-serif, system-ui, sans-serif",
  sourceSans: "var(--font-source-sans), ui-sans-serif, system-ui, sans-serif",
  plexSans: "var(--font-plex-sans), ui-sans-serif, system-ui, sans-serif",
  plexMono: "var(--font-plex-mono), ui-monospace, monospace",
  jbMono: "var(--font-jb-mono), ui-monospace, monospace",
};

export const STYLE_TOKENS: Record<StyleId, StyleTokens> = {
  /** Archival paper memo — serif editorial */
  paper: {
    scheme: "light",
    bg: "#f4efe6",
    panel: "#fffcf7",
    panel2: "#ebe4d6",
    border: "#d5ccbc",
    fg: "#1a1714",
    muted: "#5f584f",
    accent: "#8b2942",
    accent2: "#6e1f34",
    onAccent: "#fff8f6",
    good: "#1b7a4c",
    warn: "#b56e10",
    bad: "#c23a2e",
    header: "#fffcf7f2",
    deskGlow: "rgba(139, 41, 66, 0.045)",
    deskGlow2: "rgba(26, 23, 20, 0.025)",
    folioTop: "#fffcf7",
    folioBot: "#faf6ef",
    folioShadow:
      "0 1px 0 #fff inset, 0 1px 2px rgba(26, 23, 20, 0.04), 0 16px 36px -20px rgba(26, 23, 20, 0.15)",
    stampFill: "#fffcf7",
    radiusCard: "1.05rem",
    radiusControl: "0.55rem",
    radiusPill: "999px",
    fontDisplay: faces.fraunces,
    fontBody: faces.sourceSerif,
    fontMono: faces.plexMono,
    trackingDisplay: "-0.02em",
    trackingBody: "0.005em",
    trackingEyebrow: "0.14em",
    weightDisplay: "600",
    stampRotate: "-3.5deg",
    stampRadius: "0.28rem",
    stampBorder: "3px",
    stampTracking: "0.06em",
    noiseOpacity: "0.03",
  },

  /** Clean product UI — geometric sans */
  studio: {
    scheme: "light",
    bg: "#f6f7f9",
    panel: "#ffffff",
    panel2: "#eef0f3",
    border: "#dde1e6",
    fg: "#14181f",
    muted: "#5c6570",
    accent: "#3b5bdb",
    accent2: "#2f4ac4",
    onAccent: "#ffffff",
    good: "#0f9f6e",
    warn: "#c98500",
    bad: "#e03131",
    header: "#fffffff5",
    deskGlow: "rgba(59, 91, 219, 0.04)",
    deskGlow2: "transparent",
    folioTop: "#ffffff",
    folioBot: "#ffffff",
    folioShadow: "0 1px 2px rgba(20, 24, 31, 0.04), 0 8px 24px -12px rgba(20, 24, 31, 0.1)",
    stampFill: "#ffffff",
    radiusCard: "0.85rem",
    radiusControl: "0.5rem",
    radiusPill: "999px",
    fontDisplay: faces.dmSans,
    fontBody: faces.figtree,
    fontMono: faces.jbMono,
    trackingDisplay: "-0.035em",
    trackingBody: "0",
    trackingEyebrow: "0.12em",
    weightDisplay: "700",
    stampRotate: "-2deg",
    stampRadius: "0.45rem",
    stampBorder: "2.5px",
    stampTracking: "0.04em",
    noiseOpacity: "0",
  },

  /** Night foundry — geometric display, industrial mono */
  ink: {
    scheme: "dark",
    bg: "#0c0c0e",
    panel: "#151518",
    panel2: "#1c1c21",
    border: "#2c2c33",
    fg: "#f0ebe3",
    muted: "#9a958c",
    accent: "#d4a84b",
    accent2: "#e6bf66",
    onAccent: "#14120c",
    good: "#3dd68c",
    warn: "#e6a93a",
    bad: "#f0756b",
    header: "#0c0c0ef2",
    deskGlow: "rgba(212, 168, 75, 0.06)",
    deskGlow2: "rgba(240, 117, 107, 0.035)",
    folioTop: "#1a1a1f",
    folioBot: "#151518",
    folioShadow: "0 1px 0 rgba(212, 168, 75, 0.06), 0 22px 48px -24px rgba(0, 0, 0, 0.78)",
    stampFill: "#151518",
    radiusCard: "0.9rem",
    radiusControl: "0.4rem",
    radiusPill: "0.45rem",
    fontDisplay: faces.syne,
    fontBody: faces.figtree,
    fontMono: faces.jbMono,
    trackingDisplay: "-0.04em",
    trackingBody: "0",
    trackingEyebrow: "0.16em",
    weightDisplay: "800",
    stampRotate: "-4deg",
    stampRadius: "0.2rem",
    stampBorder: "3px",
    stampTracking: "0.08em",
    noiseOpacity: "0.04",
  },

  /** Observatory console — tech grotesque */
  slate: {
    scheme: "dark",
    bg: "#0b1220",
    panel: "#121c30",
    panel2: "#1a2740",
    border: "#2a3a58",
    fg: "#e9eef8",
    muted: "#8b9bb5",
    accent: "#6aa3d8",
    accent2: "#8bb8e4",
    onAccent: "#0b1220",
    good: "#3ecf9f",
    warn: "#d9a94a",
    bad: "#e87880",
    header: "#0b1220f2",
    deskGlow: "rgba(106, 163, 216, 0.09)",
    deskGlow2: "rgba(62, 207, 159, 0.035)",
    folioTop: "#162338",
    folioBot: "#121c30",
    folioShadow: "0 1px 0 rgba(139, 184, 228, 0.07), 0 22px 48px -24px rgba(0, 0, 0, 0.72)",
    stampFill: "#121c30",
    radiusCard: "0.75rem",
    radiusControl: "0.35rem",
    radiusPill: "0.4rem",
    fontDisplay: faces.space,
    fontBody: faces.plexSans,
    fontMono: faces.plexMono,
    trackingDisplay: "-0.03em",
    trackingBody: "0",
    trackingEyebrow: "0.18em",
    weightDisplay: "600",
    stampRotate: "-2.5deg",
    stampRadius: "0.15rem",
    stampBorder: "2px",
    stampTracking: "0.12em",
    noiseOpacity: "0.025",
  },

  /** Newsroom — hard serif headline, sans body, square corners */
  signal: {
    scheme: "light",
    bg: "#f3f2ed",
    panel: "#ffffff",
    panel2: "#e9e8e2",
    border: "#c9c8c0",
    fg: "#121212",
    muted: "#52524c",
    accent: "#c8102e",
    accent2: "#9e0c24",
    onAccent: "#ffffff",
    good: "#0d7a4a",
    warn: "#b86e00",
    bad: "#a81212",
    header: "#fffffff5",
    deskGlow: "rgba(200, 16, 46, 0.035)",
    deskGlow2: "transparent",
    folioTop: "#ffffff",
    folioBot: "#fbfbf9",
    folioShadow: "3px 3px 0 rgba(18, 18, 18, 0.09)",
    stampFill: "#ffffff",
    radiusCard: "0.12rem",
    radiusControl: "0.1rem",
    radiusPill: "0.12rem",
    fontDisplay: faces.newsreader,
    fontBody: faces.sourceSans,
    fontMono: faces.plexMono,
    trackingDisplay: "-0.015em",
    trackingBody: "0",
    trackingEyebrow: "0.2em",
    weightDisplay: "700",
    stampRotate: "-1.2deg",
    stampRadius: "0.05rem",
    stampBorder: "2.5px",
    stampTracking: "0.12em",
    noiseOpacity: "0.02",
  },

  /** Quiet study — literary serif throughout */
  grove: {
    scheme: "light",
    bg: "#f1efe6",
    panel: "#fbfaf5",
    panel2: "#e6e2d4",
    border: "#ccc5b4",
    fg: "#1a1f1a",
    muted: "#5a6158",
    accent: "#2a5248",
    accent2: "#1e3d36",
    onAccent: "#f4faf7",
    good: "#1f8a52",
    warn: "#a87212",
    bad: "#b33d36",
    header: "#fbfaf5f2",
    deskGlow: "rgba(42, 82, 72, 0.055)",
    deskGlow2: "rgba(26, 31, 26, 0.025)",
    folioTop: "#fbfaf5",
    folioBot: "#f5f3eb",
    folioShadow:
      "0 1px 0 #fff inset, 0 1px 2px rgba(26, 31, 26, 0.04), 0 16px 34px -18px rgba(26, 31, 26, 0.13)",
    stampFill: "#fbfaf5",
    radiusCard: "1rem",
    radiusControl: "0.5rem",
    radiusPill: "999px",
    fontDisplay: faces.fraunces,
    fontBody: faces.sourceSerif,
    fontMono: faces.plexMono,
    trackingDisplay: "-0.01em",
    trackingBody: "0.01em",
    trackingEyebrow: "0.12em",
    weightDisplay: "600",
    stampRotate: "-3deg",
    stampRadius: "0.35rem",
    stampBorder: "3px",
    stampTracking: "0.05em",
    noiseOpacity: "0.028",
  },
};

export const STYLES: Record<
  StyleId,
  {
    label: string;
    blurb: string;
    swatches: [string, string, string];
  }
> = {
  studio: {
    label: "Studio",
    blurb: "Geometric sans · cool white · indigo",
    swatches: ["#f6f7f9", "#3b5bdb", "#0f9f6e"],
  },
  paper: {
    label: "Vellum",
    blurb: "Serif brief · warm paper · carmine stamp",
    swatches: ["#f4efe6", "#8b2942", "#1b7a4c"],
  },
  slate: {
    label: "Nocturne",
    blurb: "Tech grotesque · navy · ice blue",
    swatches: ["#0b1220", "#6aa3d8", "#3ecf9f"],
  },
  ink: {
    label: "Foundry",
    blurb: "Bold geometric · charcoal · forge gold",
    swatches: ["#0c0c0e", "#d4a84b", "#3dd68c"],
  },
  signal: {
    label: "Broadsheet",
    blurb: "News serif · hard corners · stop-press red",
    swatches: ["#f3f2ed", "#c8102e", "#0d7a4a"],
  },
  grove: {
    label: "Library",
    blurb: "Literary serif · linen · bottle green",
    swatches: ["#f1efe6", "#2a5248", "#1f8a52"],
  },
};

export function isStyleId(v: unknown): v is StyleId {
  return typeof v === "string" && (STYLE_IDS as readonly string[]).includes(v);
}

const ALIASES: Record<string, StyleId> = {
  white: "studio",
};

export function normalizeStyleId(v: unknown): StyleId {
  if (typeof v === "string" && ALIASES[v]) return ALIASES[v];
  return isStyleId(v) ? v : "studio";
}

const TOKEN_CSS_KEYS: Array<[keyof StyleTokens, string]> = [
  ["bg", "--color-bg"],
  ["panel", "--color-panel"],
  ["panel2", "--color-panel2"],
  ["border", "--color-border"],
  ["fg", "--color-fg"],
  ["muted", "--color-muted"],
  ["accent", "--color-accent"],
  ["accent2", "--color-accent2"],
  ["onAccent", "--color-on-accent"],
  ["good", "--color-good"],
  ["warn", "--color-warn"],
  ["bad", "--color-bad"],
  ["header", "--color-header"],
  ["deskGlow", "--desk-glow"],
  ["deskGlow2", "--desk-glow-2"],
  ["folioTop", "--folio-top"],
  ["folioBot", "--folio-bot"],
  ["folioShadow", "--folio-shadow"],
  ["stampFill", "--stamp-fill"],
  ["radiusCard", "--radius-card"],
  ["radiusControl", "--radius-control"],
  ["radiusPill", "--radius-pill"],
  ["fontDisplay", "--font-display"],
  ["fontBody", "--font-sans"],
  ["fontMono", "--font-mono"],
  ["trackingDisplay", "--tracking-display"],
  ["trackingBody", "--tracking-body"],
  ["trackingEyebrow", "--tracking-eyebrow"],
  ["weightDisplay", "--weight-display"],
  ["stampRotate", "--stamp-rotate"],
  ["stampRadius", "--stamp-radius"],
  ["stampBorder", "--stamp-border"],
  ["stampTracking", "--stamp-tracking"],
  ["noiseOpacity", "--noise-opacity"],
];

/** Apply full pack (color + type + form) onto <html>. */
export function applyStyleToDocument(id: StyleId) {
  if (typeof document === "undefined") return;
  const resolved = normalizeStyleId(id);
  const t = STYLE_TOKENS[resolved];
  const root = document.documentElement;
  root.setAttribute("data-style", resolved);
  root.style.colorScheme = t.scheme;
  for (const [key, cssVar] of TOKEN_CSS_KEYS) {
    root.style.setProperty(cssVar, t[key]);
  }
}
