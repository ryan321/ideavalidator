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
  title: "Validorian — Business validation studio",
  description:
    "Premier business idea validation: grounded GO / MAYBE / NO-GO scores, evidence, and an iterable studio to sharpen until the answer is clear.",
  metadataBase: new URL("https://validorian.com"),
};

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
              <div className="flex w-full items-center gap-3 px-4 py-3 sm:px-5">
                <Link href="/" className="group flex shrink-0 items-center gap-2.5">
                  <span
                    className="inline-grid h-8 w-8 place-items-center rounded-[var(--radius-control)] bg-accent text-on-accent"
                    aria-hidden
                  >
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden>
                      <path
                        d="M5 5 L12 19 L19 5"
                        stroke="currentColor"
                        strokeWidth="2.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  <span className="font-display text-base font-bold tracking-tight text-fg">
                    Validorian
                    <span className="mt-0.5 hidden font-mono text-[10px] font-medium uppercase text-muted [letter-spacing:var(--tracking-eyebrow)] sm:block">
                      business validation studio
                    </span>
                  </span>
                </Link>

                <div className="ml-auto flex items-center gap-2">
                  {/* Mobile ideas toggle is portaled here by AppNav */}
                  <div id="mobile-nav-slot" className="contents sm:hidden" />
                  <Link
                    href="/account"
                    className="rounded-pill-pack border border-border px-3 py-1.5 font-mono text-[11px] uppercase text-muted transition hover:border-accent/40 hover:text-fg [letter-spacing:var(--tracking-eyebrow)]"
                  >
                    Account
                  </Link>
                  <StylePicker />
                </div>
              </div>
            </header>

            <div className="flex min-h-0 flex-1">
              <AppNav />
              <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
            </div>

            <footer className="no-print border-t border-border/70 py-4 text-center font-mono text-[10px] uppercase text-muted [letter-spacing:var(--tracking-eyebrow)]">
              Validorian · grounded scores · real evidence
            </footer>
          </div>
        </StyleProvider>
      </body>
    </html>
  );
}
