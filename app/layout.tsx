import type { Metadata } from "next";
import { Syne, Figtree, IBM_Plex_Mono } from "next/font/google";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import { StyleProvider } from "@/components/StyleProvider";
import { StylePicker } from "@/components/StylePicker";
import { STYLE_STORAGE_KEY } from "@/lib/styles";
import "./globals.css";

const body = Figtree({ variable: "--font-body", subsets: ["latin"] });
const display = Syne({ variable: "--font-display", subsets: ["latin"], weight: ["600", "700", "800"] });
const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "IdeaValidator — Red-team your idea",
  description:
    "A grounded GO / MAYBE / NO-GO memo for founders — scored against your goal, not hype.",
};

/** Runs before paint so the chosen desk style doesn't flash. */
const styleBootScript = `
(function(){
  try {
    var k=${JSON.stringify(STYLE_STORAGE_KEY)};
    var v=localStorage.getItem(k);
    var ok=["paper","ink","slate","signal","grove"];
    if(!v||ok.indexOf(v)<0)v="paper";
    document.documentElement.setAttribute("data-style",v);
    document.documentElement.style.colorScheme=(v==="ink"||v==="slate")?"dark":"light";
  } catch(e) {
    document.documentElement.setAttribute("data-style","paper");
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-style="paper"
      className={`${body.variable} ${display.variable} ${mono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: styleBootScript }} />
      </head>
      <body className="min-h-full">
        <StyleProvider>
          <div className="flex min-h-screen flex-col">
            <header className="no-print sticky top-0 z-40 border-b border-border bg-[var(--color-header)] backdrop-blur-md">
              <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
                <Link href="/" className="group flex shrink-0 items-center gap-2.5">
                  <span
                    className="inline-grid h-8 w-8 place-items-center rounded-lg bg-accent font-display text-[11px] font-extrabold tracking-tight text-on-accent"
                    aria-hidden
                  >
                    RT
                  </span>
                  <span className="hidden font-display text-base font-bold tracking-tight text-fg sm:block">
                    IdeaValidator
                    <span className="mt-0.5 block font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
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

            <footer className="no-print border-t border-border/70 py-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              Grounded scores · real evidence · your machine
            </footer>
          </div>
        </StyleProvider>
      </body>
    </html>
  );
}
