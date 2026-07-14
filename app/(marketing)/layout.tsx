import Link from "next/link";
import { AvatarMenu } from "@/components/AvatarMenu";
import { BrandLogo } from "@/components/BrandLogo";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { initialsFor } from "@/lib/avatar";
import { SkipToContent } from "@/components/SkipToContent";
import { StylePicker } from "@/components/StylePicker";
import { getSessionUser } from "@/lib/auth";
import { getTranslator } from "@/lib/i18n/server";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const { t } = await getTranslator();

  return (
    // Marketing pages carry an editorial display face (Fraunces) on HEADINGS — the
    // "decision document" identity — without touching the in-app style packs or the
    // controls (buttons/prices keep the pack's display sans). See .mk-editorial in
    // globals.css; scoped to this subtree over whatever pack the visitor has active.
    <div className="mk-editorial flex min-h-screen flex-col">
      <SkipToContent />
      <header className="no-print sticky top-0 z-40 border-b border-border bg-[var(--color-header)] backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="group flex shrink-0 items-center"
            aria-label={t("a11y.home")}
          >
            <BrandLogo />
          </Link>

          <nav className="ml-auto flex items-center gap-2" aria-label={t("a11y.mainNav")}>
            <Link
              href="/pricing"
              className="rounded-pill-pack border border-transparent px-3 py-1.5 font-mono text-[11px] uppercase text-muted transition hover:border-accent/40 hover:text-fg [letter-spacing:var(--tracking-eyebrow)]"
            >
              {t("nav.pricing")}
            </Link>
            {user ? (
              <>
                <Link
                  href="/help"
                  className="rounded-pill-pack border border-transparent px-3 py-1.5 font-mono text-[11px] uppercase text-muted transition hover:border-accent/40 hover:text-fg [letter-spacing:var(--tracking-eyebrow)]"
                >
                  {t("help.nav")}
                </Link>
                <Link
                  href="/studio"
                  className="whitespace-nowrap rounded-pill-pack bg-accent px-4 py-1.5 font-display text-sm font-bold text-on-accent transition hover:bg-accent2"
                >
                  {t("nav.openStudio")}
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="whitespace-nowrap rounded-pill-pack border border-border px-3 py-1.5 font-mono text-[11px] uppercase text-muted transition hover:border-accent/40 hover:text-fg [letter-spacing:var(--tracking-eyebrow)]"
                >
                  {t("nav.signIn")}
                </Link>
                <Link
                  href="/signup"
                  className="whitespace-nowrap rounded-pill-pack bg-accent px-4 py-1.5 font-display text-sm font-bold text-on-accent transition hover:bg-accent2"
                >
                  {t("nav.validateCta")}
                </Link>
              </>
            )}
            <LocaleSwitcher />
            <StylePicker />
            {/* Signed-in visitors get the same account avatar as the studio header */}
            {user && (
              <AvatarMenu
                initials={initialsFor(user.name, user.email)}
                name={user.name}
                email={user.email}
                avatarUrl={user.avatar_url}
              />
            )}
          </nav>
        </div>
      </header>

      <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 outline-none">
        {children}
      </main>

      <footer className="no-print border-t border-border/70 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="font-mono text-[10px] uppercase text-muted [letter-spacing:var(--tracking-eyebrow)]">
            {t("brand.footerMarketing")}
          </div>
          <nav
            className="flex flex-wrap gap-4 font-mono text-[11px] text-muted"
            aria-label={t("a11y.footerNav")}
          >
            <Link href="/help" className="hover:text-fg">
              {t("help.nav")}
            </Link>
            <Link href="/pricing" className="hover:text-fg">
              {t("nav.pricing")}
            </Link>
            <Link href="/contact" className="hover:text-fg">
              {t("contact.nav")}
            </Link>
            <Link href="/support" className="hover:text-fg">
              {t("support.nav")}
            </Link>
            <Link href="/login" className="hover:text-fg">
              {t("nav.signIn")}
            </Link>
            <Link href="/signup" className="hover:text-fg">
              {t("nav.createAccount")}
            </Link>
            <a href="https://validorian.com" className="hover:text-fg">
              validorian.com
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
