"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { verdictBands } from "@/lib/scoring";
import { useT } from "./LocaleProvider";

type IdeaLite = {
  id: string;
  title: string;
  best_score?: number | null;
  goal?: string | null;
};

const cleanTitle = (t: string) =>
  t.replace(/^#+\s*/, "").replace(/^Business Idea:\s*/i, "");

function scoreTone(score: number, goal: string | null | undefined): string {
  const b = verdictBands(goal);
  if (score >= b.go) return "var(--color-good)";
  if (score >= b.maybe) return "var(--color-warn)";
  return "var(--color-bad)";
}

export default function AppNav() {
  const t = useT();
  const pathname = usePathname();
  const activeId = pathname?.match(/^\/idea\/([^/?]+)/)?.[1] ?? null;
  const [ideas, setIdeas] = useState<IdeaLite[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const drawerTitleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const openBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetch("/api/ideas")
      .then((r) => r.json())
      .then(
        (d) =>
          Array.isArray(d) &&
          setIdeas(
            d.map((i: IdeaLite) => ({
              id: i.id,
              title: i.title,
              best_score: typeof i.best_score === "number" ? i.best_score : null,
              goal: typeof i.goal === "string" ? i.goal : null,
            }))
          )
      )
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const wasOpen = useRef(false);
  // Focus close control when drawer opens; restore trigger on close.
  useEffect(() => {
    if (drawerOpen) {
      wasOpen.current = true;
      const id = window.setTimeout(() => closeBtnRef.current?.focus(), 0);
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        window.clearTimeout(id);
        document.body.style.overflow = prev;
      };
    }
    if (wasOpen.current) {
      wasOpen.current = false;
      openBtnRef.current?.focus();
    }
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const list = (
    <>
      <Link
        href="/studio"
        className={`mb-1 flex items-center justify-between rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition ${
          pathname === "/studio" || pathname?.startsWith("/studio")
            ? "bg-accent/15 text-accent2"
            : "text-muted hover:bg-panel2 hover:text-fg"
        }`}
        aria-current={
          pathname === "/studio" || pathname?.startsWith("/studio") ? "page" : undefined
        }
      >
        <span>{t("appNav.newIdea")}</span>
      </Link>
      <div
        className="mb-1.5 mt-3 px-3 font-mono text-[10px] uppercase text-muted [letter-spacing:var(--tracking-eyebrow)]"
        id="appnav-ideas-heading"
      >
        {t("appNav.yourIdeas")}
        <span className="ml-1.5 tabular-nums text-fg/50">({ideas.length})</span>
      </div>
      <ul className="space-y-0.5" aria-labelledby="appnav-ideas-heading">
        {ideas.map((i) => {
          const score = typeof i.best_score === "number" ? i.best_score : null;
          const tone = score != null ? scoreTone(score, i.goal) : null;
          const title = cleanTitle(i.title);
          return (
            <li key={i.id}>
              <Link
                href={`/idea/${i.id}`}
                title={title}
                aria-current={i.id === activeId ? "page" : undefined}
                className={`flex items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-sm transition ${
                  i.id === activeId
                    ? "bg-panel2 font-medium text-fg ring-1 ring-accent/30"
                    : "text-muted hover:bg-panel2/70 hover:text-fg"
                }`}
              >
                <span className="min-w-0 flex-1 leading-snug line-clamp-2">{title}</span>
                {score != null && tone && (
                  <span
                    className="shrink-0 rounded-md px-1.5 py-0.5 font-mono text-xs font-bold tabular-nums leading-none"
                    style={{
                      color: tone,
                      background: `color-mix(in srgb, ${tone} 14%, transparent)`,
                      boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${tone} 28%, transparent)`,
                    }}
                    aria-label={t("appNav.bestScore", { score })}
                  >
                    {score}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        {ideas.length === 0 && (
          <li className="px-3 py-4 text-xs leading-relaxed text-muted">{t("appNav.empty")}</li>
        )}
      </ul>
    </>
  );

  const mobileHeaderControls =
    mounted &&
    typeof document !== "undefined" &&
    document.getElementById("mobile-nav-slot") &&
    createPortal(
      <button
        ref={openBtnRef}
        type="button"
        onClick={() => setDrawerOpen(true)}
        className="rounded-pill-pack border border-border bg-panel px-3 py-1.5 font-mono text-[11px] uppercase text-muted transition hover:border-accent/40 hover:text-fg [letter-spacing:var(--tracking-eyebrow)]"
        aria-expanded={drawerOpen}
        aria-haspopup="dialog"
        aria-controls="ideas-drawer"
      >
        {t("appNav.ideasCount", { n: ideas.length })}
      </button>,
      document.getElementById("mobile-nav-slot")!
    );

  return (
    <>
      {mobileHeaderControls}

      <aside
        className="no-print hidden w-56 shrink-0 flex-col border-r border-border bg-panel/50 sm:flex lg:w-64"
        aria-label={t("a11y.ideasNav")}
      >
        <nav
          className="sticky top-[3.25rem] flex max-h-[calc(100vh-3.25rem)] flex-col overflow-y-auto px-2 py-3"
          aria-label={t("a11y.ideasNav")}
        >
          {list}
        </nav>
      </aside>

      {drawerOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-50 bg-[color-mix(in_srgb,var(--color-fg)_35%,transparent)] backdrop-blur-[2px] sm:hidden"
            aria-label={t("appNav.closeIdeas")}
            onClick={() => setDrawerOpen(false)}
          />
          <div
            id="ideas-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={drawerTitleId}
            className="fixed left-0 top-0 z-50 flex h-full w-full max-w-xs flex-col border-r border-border bg-panel shadow-2xl sm:hidden"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <div>
                <div id={drawerTitleId} className="font-display text-lg font-bold">
                  {t("appNav.yourIdeas")}
                </div>
                <div className="font-mono text-[10px] uppercase text-muted [letter-spacing:var(--tracking-eyebrow)]">
                  {t("appNav.onDesk", { n: ideas.length })}
                </div>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-[var(--radius-control)] border border-border px-2.5 py-1 text-xs text-muted hover:text-fg"
              >
                {t("common.close")}
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label={t("a11y.ideasNav")}>
              {list}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
