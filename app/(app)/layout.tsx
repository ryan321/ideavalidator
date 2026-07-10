import Link from "next/link";
import AppNav from "@/components/AppNav";
import { StylePicker } from "@/components/StylePicker";
import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen flex-col">
      <header className="no-print sticky top-0 z-40 border-b border-border bg-[var(--color-header)] backdrop-blur-md">
        <div className="flex w-full items-center gap-3 px-4 py-3 sm:px-5">
          <Link href="/studio" className="group flex shrink-0 items-center gap-2.5">
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
  );
}
