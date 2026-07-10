import Link from "next/link";
import { StylePicker } from "@/components/StylePicker";
import { getSessionUser } from "@/lib/auth";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-40 border-b border-border bg-[var(--color-header)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
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

          <nav className="ml-auto flex items-center gap-2">
            {user ? (
              <Link
                href="/studio"
                className="rounded-pill-pack bg-accent px-4 py-1.5 font-display text-sm font-bold text-on-accent transition hover:bg-accent2"
              >
                Open studio →
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-pill-pack border border-border px-3 py-1.5 font-mono text-[11px] uppercase text-muted transition hover:border-accent/40 hover:text-fg [letter-spacing:var(--tracking-eyebrow)]"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-pill-pack bg-accent px-4 py-1.5 font-display text-sm font-bold text-on-accent transition hover:bg-accent2"
                >
                  Get started
                </Link>
              </>
            )}
            <StylePicker />
          </nav>
        </div>
      </header>

      <main className="min-w-0 flex-1">{children}</main>

      <footer className="no-print border-t border-border/70 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="font-mono text-[10px] uppercase text-muted [letter-spacing:var(--tracking-eyebrow)]">
            Validorian · business validation studio
          </div>
          <div className="flex flex-wrap gap-4 font-mono text-[11px] text-muted">
            <Link href="/login" className="hover:text-fg">
              Sign in
            </Link>
            <Link href="/signup" className="hover:text-fg">
              Create account
            </Link>
            <a href="https://validorian.com" className="hover:text-fg">
              validorian.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
