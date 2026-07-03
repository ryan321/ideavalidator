import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import AppNav from "@/components/AppNav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-jb-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IdeaValidator",
  description: "A grounded, scored GO/NO-GO validation report for your startup idea — local and private.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${display.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="flex min-h-screen">
          {/* left rail */}
          <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border bg-panel/40 sm:flex">
            <Link
              href="/"
              className="flex items-center gap-2 border-b border-border px-4 py-4 font-display font-semibold tracking-tight"
            >
              <span className="inline-grid h-6 w-6 place-items-center rounded-md bg-accent font-mono text-xs font-bold text-white">
                iv
              </span>
              IdeaValidator
            </Link>
            {/* Suspense: AppNav reads useSearchParams (the ?stage= dot) */}
            <Suspense fallback={null}>
              <AppNav />
            </Suspense>
          </aside>

          {/* main */}
          <main className="min-w-0 flex-1">
            {/* mobile top bar */}
            <header className="no-print flex items-center justify-between border-b border-border px-4 py-3 sm:hidden">
              <Link href="/" className="font-display font-semibold">
                IdeaValidator
              </Link>
            </header>
            <div className="mx-auto w-full max-w-5xl px-5 py-7">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
