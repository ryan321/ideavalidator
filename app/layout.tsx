import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IdeaValidator",
  description: "Validate your startup ideas locally with grounded AI analysis.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="no-print sticky top-0 z-20 border-b border-border bg-bg/80 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="inline-grid h-6 w-6 place-items-center rounded-md bg-accent text-xs font-bold text-white">
                IV
              </span>
              IdeaValidator
            </Link>
            <div className="flex items-center gap-5 text-sm text-muted">
              <Link href="/" className="hover:text-fg">
                Ideas
              </Link>
              <Link href="/calculators" className="hover:text-fg">
                Calculators
              </Link>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">{children}</main>
      </body>
    </html>
  );
}
