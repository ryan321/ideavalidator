"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const STAGES = [
  { key: "validate", label: "Validate", needsChosen: false },
  { key: "decide", label: "Decide", needsChosen: false },
  { key: "pitch", label: "Pitch", needsChosen: true },
  { key: "sell", label: "Sell", needsChosen: true },
  { key: "name", label: "Name", needsChosen: true },
  { key: "brand", label: "Branding", needsChosen: true },
];

type IdeaLite = { id: string; title: string };
type StageStatus = Record<string, "done" | "active" | "todo">;

const cleanTitle = (t: string) =>
  t.replace(/^#+\s*/, "").replace(/^Business Idea:\s*/i, "");

export default function AppNav() {
  const pathname = usePathname();
  const activeId = pathname?.match(/^\/idea\/([^/?]+)/)?.[1] ?? null;
  const [ideas, setIdeas] = useState<IdeaLite[]>([]);
  const [status, setStatus] = useState<StageStatus | null>(null);
  const [hasChosen, setHasChosen] = useState(false);

  useEffect(() => {
    fetch("/api/ideas")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setIdeas(d.map((i: IdeaLite) => ({ id: i.id, title: i.title }))))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (!activeId) {
      setStatus(null);
      setHasChosen(false);
      return;
    }
    fetch(`/api/ideas/${activeId}`)
      .then((r) => r.json())
      .then((d) => {
        setStatus(d.stageStatus ?? null);
        setHasChosen(!!d.idea?.chosen_version_id);
      })
      .catch(() => {});
  }, [activeId, pathname]);

  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3 text-sm">
      <Link
        href="/"
        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 font-display font-semibold tracking-tight transition ${
          !activeId ? "bg-panel2 text-fg" : "text-muted hover:text-fg"
        }`}
      >
        Ideas
        <span className="ml-auto font-mono text-xs text-muted">{ideas.length}</span>
      </Link>

      <ul className="mt-1">
        {ideas.map((i) => {
          const isActive = i.id === activeId;
          return (
            <li key={i.id}>
              <Link
                href={`/idea/${i.id}`}
                title={cleanTitle(i.title)}
                className={`block truncate rounded-lg px-3 py-1.5 transition ${
                  isActive ? "bg-panel2 font-medium text-fg" : "text-muted hover:bg-panel/60 hover:text-fg"
                }`}
              >
                {cleanTitle(i.title)}
              </Link>
              {isActive && (
                <ul className="my-0.5 ml-3 border-l border-border pl-2">
                  {STAGES.map((s) => {
                    const st = status?.[s.key] ?? "todo";
                    const locked = s.needsChosen && !hasChosen;
                    const dot = (
                      <span
                        role="img"
                        aria-label={st === "done" ? "done" : st === "active" ? "in progress" : "not started"}
                        title={st === "done" ? "Done" : st === "active" ? "In progress" : "Not started"}
                        className={`h-1.5 w-1.5 rounded-full ${
                          st === "done"
                            ? "bg-good"
                            : st === "active"
                              ? "bg-accent2 ring-2 ring-accent2/30"
                              : "border border-border"
                        }`}
                      />
                    );
                    return (
                      <li key={s.key}>
                        {locked ? (
                          <span
                            title="Choose a version in Decide first"
                            className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1 text-[13px] text-muted/40"
                          >
                            {dot}
                            {s.label}
                            <span className="ml-auto text-[11px]">🔒</span>
                          </span>
                        ) : (
                          <Link
                            href={`/idea/${i.id}?stage=${s.key}`}
                            className="flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-muted transition hover:text-fg"
                          >
                            {dot}
                            {s.label}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
        {ideas.length === 0 && (
          <li className="px-3 py-2 text-xs text-muted">No ideas yet.</li>
        )}
      </ul>
    </nav>
  );
}
