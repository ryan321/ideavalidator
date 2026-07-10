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

  useEffect(() => {
    fetch("/api/ideas")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setIdeas(d.map((i: IdeaLite) => ({ id: i.id, title: i.title }))))
      .catch(() => {});
  }, [pathname]);

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3 text-sm">
      <Link
        href="/"
        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-display font-semibold tracking-tight transition ${
          !activeId ? "bg-panel2 text-fg" : "text-muted hover:text-fg"
        }`}
      >
        Your Ideas
        <span className="ml-auto font-mono text-xs text-muted">{ideas.length}</span>
      </Link>

      <ul className="mt-1">
        {ideas.map((i) => (
          <li key={i.id}>
            <Link
              href={`/idea/${i.id}`}
              title={cleanTitle(i.title)}
              className={`block truncate rounded-lg px-3 py-1.5 transition ${
                i.id === activeId ? "bg-panel2 font-medium text-fg" : "text-muted hover:bg-panel/60 hover:text-fg"
              }`}
            >
              {cleanTitle(i.title)}
            </Link>
          </li>
        ))}
        {ideas.length === 0 && (
          <li className="px-3 py-2 text-xs text-muted">No ideas yet.</li>
        )}
      </ul>

      <Link
        href="/account"
        className={`mt-auto flex items-center gap-2 rounded-lg px-3 py-1.5 transition ${
          pathname === "/account" ? "bg-panel2 text-fg" : "text-muted hover:text-fg"
        }`}
      >
        <span aria-hidden>⚙</span> Account
      </Link>
    </nav>
  );
}
