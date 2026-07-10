"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type IdeaLite = { id: string; title: string };

const cleanTitle = (t: string) =>
  t.replace(/^#+\s*/, "").replace(/^Business Idea:\s*/i, "");

export default function AppNav() {
  const pathname = usePathname();
  const activeId = pathname?.match(/^\/idea\/([^/?]+)/)?.[1] ?? null;
  const [ideas, setIdeas] = useState<IdeaLite[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/ideas")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setIdeas(d.map((i: IdeaLite) => ({ id: i.id, title: i.title }))))
      .catch(() => {});
  }, [pathname]);

  // Close drawer on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="flex items-center justify-end gap-2 sm:justify-between">
      {/* Desktop idea strip */}
      <nav className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex">
        <Link
          href="/"
          className={`shrink-0 rounded-full px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition ${
            !activeId && pathname === "/"
              ? "bg-accent/20 text-accent2"
              : "text-muted hover:bg-panel2 hover:text-fg"
          }`}
        >
          Desk
        </Link>
        {ideas.slice(0, 6).map((i) => (
          <Link
            key={i.id}
            href={`/idea/${i.id}`}
            title={cleanTitle(i.title)}
            className={`max-w-[10rem] shrink-0 truncate rounded-full px-3 py-1.5 text-sm transition ${
              i.id === activeId
                ? "bg-panel2 font-medium text-fg ring-1 ring-accent/35"
                : "text-muted hover:bg-panel2/80 hover:text-fg"
            }`}
          >
            {cleanTitle(i.title)}
          </Link>
        ))}
        {ideas.length > 6 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-full px-2 py-1.5 font-mono text-[11px] text-muted hover:text-fg"
          >
            +{ideas.length - 6}
          </button>
        )}
      </nav>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="rounded-full border border-border bg-panel px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted transition hover:border-accent/40 hover:text-fg md:hidden"
          aria-expanded={open}
        >
          Ideas · {ideas.length}
        </button>
        <Link
          href="/account"
          className={`rounded-full border px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition ${
            pathname === "/account"
              ? "border-accent/40 bg-accent/15 text-accent2"
              : "border-border text-muted hover:border-accent/30 hover:text-fg"
          }`}
        >
          Account
        </Link>
      </div>

      {/* Slide-over all ideas */}
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-50 bg-[#1a1612]/35 backdrop-blur-[2px]"
            aria-label="Close ideas"
            onClick={() => setOpen(false)}
          />
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-sm flex-col border-l border-border bg-panel shadow-2xl shadow-[#1a1612]/15">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <div>
                <div className="font-display text-lg font-bold">Your ideas</div>
                <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                  {ideas.length} on the desk
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border px-2.5 py-1 text-xs text-muted hover:text-fg"
              >
                Close
              </button>
            </div>
            <ul className="flex-1 overflow-y-auto p-2">
              <li>
                <Link
                  href="/"
                  className="mb-1 block rounded-xl px-3 py-2.5 text-sm font-medium text-accent2 hover:bg-panel2"
                >
                  + New assay
                </Link>
              </li>
              {ideas.map((i) => (
                <li key={i.id}>
                  <Link
                    href={`/idea/${i.id}`}
                    className={`block truncate rounded-xl px-3 py-2.5 text-sm transition ${
                      i.id === activeId ? "bg-panel2 font-medium text-fg" : "text-muted hover:bg-panel2/60 hover:text-fg"
                    }`}
                  >
                    {cleanTitle(i.title)}
                  </Link>
                </li>
              ))}
              {ideas.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-muted">No ideas yet — file one from the desk.</li>
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
