import Link from "next/link";
import AppNav from "@/components/AppNav";
import { BrandLogo } from "@/components/BrandLogo";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { SkipToContent } from "@/components/SkipToContent";
import { StylePicker } from "@/components/StylePicker";
import { getSessionUser } from "@/lib/auth";
import { getTranslator } from "@/lib/i18n/server";
import { redirect } from "next/navigation";

/** 1–2 letter monogram for the avatar: initials of the first two name words, else the
 * email's first letter. Uppercased; falls back to "?" for a blank record. */
function initialsFor(name: string | null, email: string): string {
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0][0].toUpperCase();
  return (email.trim()[0] ?? "?").toUpperCase();
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const { t } = await getTranslator();

  return (
    <div className="flex min-h-screen flex-col">
      <SkipToContent />
      <header className="no-print sticky top-0 z-40 border-b border-border bg-[var(--color-header)] backdrop-blur-md">
        <div className="flex w-full items-center gap-3 px-4 py-3 sm:px-5">
          <Link
            href="/studio"
            className="group flex shrink-0 items-center"
            aria-label={t("a11y.studioHome")}
          >
            <BrandLogo />
          </Link>

          <nav
            className="ml-auto flex items-center gap-2"
            aria-label={t("a11y.mainNav")}
          >
            <div id="mobile-nav-slot" className="contents sm:hidden" />
            <Link
              href="/help"
              className="rounded-pill-pack border border-transparent px-3 py-1.5 font-mono text-[11px] uppercase text-muted transition hover:border-accent/40 hover:text-fg [letter-spacing:var(--tracking-eyebrow)]"
            >
              {t("help.nav")}
            </Link>
            <Link
              href="/pricing"
              className="rounded-pill-pack border border-transparent px-3 py-1.5 font-mono text-[11px] uppercase text-muted transition hover:border-accent/40 hover:text-fg [letter-spacing:var(--tracking-eyebrow)]"
            >
              {t("nav.pricing")}
            </Link>
            <LocaleSwitcher />
            <StylePicker />
            {/* Account — avatar monogram, farthest right (the web convention) */}
            <Link
              href="/account"
              aria-label={t("nav.account")}
              title={`${t("nav.account")} · ${user.name?.trim() || user.email}`}
              className="ml-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-accent/15 font-display text-sm font-bold leading-none text-accent2 transition hover:border-accent/50 hover:bg-accent/25"
            >
              {initialsFor(user.name, user.email)}
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <AppNav />
        <main
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 px-4 py-8 outline-none sm:px-6 sm:py-10"
        >
          {children}
        </main>
      </div>

      <footer className="no-print border-t border-border/70 py-4 text-center font-mono text-[10px] uppercase text-muted [letter-spacing:var(--tracking-eyebrow)]">
        <nav aria-label={t("a11y.footerNav")} className="inline">
          {t("brand.footerApp")} ·{" "}
          <Link href="/help" className="hover:text-fg">
            {t("help.nav")}
          </Link>
          {" · "}
          <Link href="/pricing" className="hover:text-fg">
            {t("nav.pricing")}
          </Link>
          {" · "}
          <Link href="/support" className="hover:text-fg">
            {t("support.nav")}
          </Link>
        </nav>
      </footer>
    </div>
  );
}
