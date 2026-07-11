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
import { LocaleProvider } from "@/components/LocaleProvider";
import { StyleProvider } from "@/components/StyleProvider";
import { isRtlLocale, localeLangTag } from "@/lib/i18n/config";
import { getRequestLocale } from "@/lib/i18n/server";
import { createTranslator } from "@/lib/i18n/t";
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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  return {
    title: t("meta.title"),
    description: t("meta.description"),
    metadataBase: new URL("https://validorian.com"),
  };
}

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

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getRequestLocale();
  const dir = isRtlLocale(locale) ? "rtl" : "ltr";
  return (
    <html lang={localeLangTag(locale)} dir={dir} className={`${fontVars} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: styleBootScript }} />
      </head>
      <body className="min-h-full" suppressHydrationWarning>
        <LocaleProvider locale={locale}>
          <StyleProvider>{children}</StyleProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
