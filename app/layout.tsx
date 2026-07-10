import type { Metadata } from "next";
import {
  Syne,
  Figtree,
  Fraunces,
  Newsreader,
  Space_Grotesk,
  DM_Sans,
  Source_Serif_4,
  Source_Sans_3,
  IBM_Plex_Sans,
  IBM_Plex_Mono,
  JetBrains_Mono,
} from "next/font/google";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import { StyleProvider } from "@/components/StyleProvider";
import { StylePicker } from "@/components/StylePicker";
import { STYLE_STORAGE_KEY, STYLE_TOKENS } from "@/lib/styles";
import "./globals.css";

// Faces available to style packs (switched via CSS vars — not one global pair).
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({ variable: "--font-source-serif", subsets: ["latin"] });
const syne = Syne({ variable: "--font-syne", subsets: ["latin"], weight: ["600", "700", "800"] });
const space = Space_Grotesk({ variable: "--font-space", subsets: ["latin"] });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"] });
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const sourceSans = Source_Sans_3({ variable: "--font-source-sans", subsets: ["latin"] });
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const jbMono = JetBrains_Mono({ variable: "--font-jb-mono", subsets: ["latin"] });

const fontVars = [
  fraunces,
  newsreader,
  sourceSerif,
  syne,
  space,
  dmSans,
  figtree,
  sourceSans,
  plexSans,
  plexMono,
  jbMono,
]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  title: "IdeaValidator — Red-team your idea",
  description:
    "A grounded GO / MAYBE / NO-GO memo for founders — scored against your goal, not hype.",
};

/** Before paint: tokens (color + type + form) as inline CSS vars on <html>. */
const styleBootScript = `
(function(){
  try {
    var packs=${JSON.stringify(STYLE_TOKENS)};
    var aliases={white:"studio"};
    var k=${JSON.stringify(STYLE_STORAGE_KEY)};
    var v=localStorage.getItem(k);
    if(v&&aliases[v])v=aliases[v];
    if(!v||!packs[v])v="studio";
    var t=packs[v];
    var r=document.documentElement;
    r.setAttribute("data-style",v);
    r.style.colorScheme=t.scheme;
    var map={
      "--color-bg":t.bg,"--color-panel":t.panel,"--color-panel2":t.panel2,
      "--color-border":t.border,"--color-fg":t.fg,"--color-muted":t.muted,
      "--color-accent":t.accent,"--color-accent2":t.accent2,"--color-on-accent":t.onAccent,
      "--color-good":t.good,"--color-warn":t.warn,"--color-bad":t.bad,
      "--color-header":t.header,"--desk-glow":t.deskGlow,"--desk-glow-2":t.deskGlow2,
      "--folio-top":t.folioTop,"--folio-bot":t.folioBot,"--folio-shadow":t.folioShadow,
      "--stamp-fill":t.stampFill,"--radius-card":t.radiusCard,
      "--radius-control":t.radiusControl,"--radius-pill":t.radiusPill,
      "--font-display":t.fontDisplay,"--font-sans":t.fontBody,"--font-mono":t.fontMono,
      "--tracking-display":t.trackingDisplay,"--tracking-body":t.trackingBody,
      "--tracking-eyebrow":t.trackingEyebrow,"--weight-display":t.weightDisplay,
      "--stamp-rotate":t.stampRotate,"--stamp-radius":t.stampRadius,
      "--stamp-border":t.stampBorder,"--stamp-tracking":t.stampTracking,
      "--noise-opacity":t.noiseOpacity
    };
    for(var p in map)r.style.setProperty(p,map[p]);
  } catch(e) {
    document.documentElement.setAttribute("data-style","studio");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fontVars} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: styleBootScript }} />
      </head>
      <body className="min-h-full" suppressHydrationWarning>
        <StyleProvider>
          <div className="flex min-h-screen flex-col">
            <header className="no-print sticky top-0 z-40 border-b border-border bg-[var(--color-header)] backdrop-blur-md">
              <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
                <Link href="/" className="group flex shrink-0 items-center gap-2.5">
                  <span
                    className="inline-grid h-8 w-8 place-items-center rounded-[var(--radius-control)] bg-accent font-display text-[11px] font-extrabold tracking-tight text-on-accent"
                    aria-hidden
                  >
                    RT
                  </span>
                  <span className="hidden font-display text-base font-bold tracking-tight text-fg sm:block">
                    IdeaValidator
                    <span className="mt-0.5 block font-mono text-[10px] font-medium uppercase text-muted [letter-spacing:var(--tracking-eyebrow)]">
                      red team desk
                    </span>
                  </span>
                </Link>

                <div className="min-w-0 flex-1">
                  <AppNav />
                </div>

                <StylePicker />
              </div>
            </header>

            <main className="min-w-0 flex-1">
              <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">{children}</div>
            </main>

            <footer className="no-print border-t border-border/70 py-4 text-center font-mono text-[10px] uppercase text-muted [letter-spacing:var(--tracking-eyebrow)]">
              Grounded scores · real evidence · your machine
            </footer>
          </div>
        </StyleProvider>
      </body>
    </html>
  );
}
