"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const STAGES = [{ key: "validate", label: "Validate" }];

type IdeaLite = { id: string; title: string };
type StageStatus = Record<string, "done" | "active" | "todo">;

const cleanTitle = (t: string) =>
  t.replace(/^#+\s*/, "").replace(/^Business Idea:\s*/i, "");

export default function AppNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeId = pathname?.match(/^\/idea\/([^/?]+)/)?.[1] ?? null;
  // the stage the user is looking at RIGHT NOW comes from the URL; the fetched
  // status can lag (the workspace persists the stage in the background)
  const urlStage = searchParams?.get("stage");
  const currentStage = STAGES.some((s) => s.key === urlStage) ? urlStage : null;
  const [ideas, setIdeas] = useState<IdeaLite[]>([]);
  const [status, setStatus] = useState<StageStatus | null>(null);

  useEffect(() => {
    fetch("/api/ideas")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setIdeas(d.map((i: IdeaLite) => ({ id: i.id, title: i.title }))))
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (!activeId) {
      setStatus(null);
      return;
    }
    fetch(`/api/ideas/${activeId}`)
      .then((r) => r.json())
      .then((d) => setStatus(d.stageStatus ?? null))
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
                    let st = status?.[s.key] ?? "todo";
                    // override with the URL's stage so the dot tracks the click instantly
                    if (currentStage && st !== "done") st = s.key === currentStage ? "active" : "todo";
                    return (
                      <li key={s.key}>
                        <Link
                          href={`/idea/${i.id}?stage=${s.key}`}
                          className="flex items-center gap-2 rounded-md px-2 py-1 text-[13px] text-muted transition hover:text-fg"
                        >
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
                          {s.label}
                        </Link>
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
