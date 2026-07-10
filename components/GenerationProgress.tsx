"use client";

import { useEffect, useState } from "react";
import { useT } from "./LocaleProvider";

export default function GenerationProgress({
  label,
  grounded,
}: {
  label: string;
  grounded: boolean;
}) {
  const t = useT();
  const steps = grounded
    ? [
        t("progress.step1"),
        t("progress.step2"),
        t("progress.step3"),
        t("progress.step4"),
        t("progress.step5"),
        t("progress.step6"),
      ]
    : [t("progress.plain1"), t("progress.plain2")];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const at = grounded ? [12, 24, 40, 60, 85] : [6];
    const timers = at.map((sec, i) => setTimeout(() => setIdx(i + 1), sec * 1000));
    return () => timers.forEach(clearTimeout);
  }, [grounded]);

  return (
    <div className="folio p-6">
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent2">
        {t("progress.inSession")}
      </div>
      <div className="mt-1 font-display text-lg font-bold tracking-tight">
        {t("progress.assembling", { label: label.toLowerCase() })}
      </div>
      <ul className="mt-4 space-y-2.5">
        {steps.map((s, i) => {
          const state = i < idx ? "done" : i === idx ? "active" : "todo";
          return (
            <li key={i} className="flex items-center gap-3 text-sm">
              {state === "done" ? (
                <span className="grid h-4 w-4 place-items-center rounded-full bg-good/20 text-[10px] text-good">
                  ✓
                </span>
              ) : state === "active" ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent2/30 border-t-accent2" />
              ) : (
                <span className="h-4 w-4 rounded-full border border-border" />
              )}
              <span
                className={
                  state === "todo"
                    ? "text-muted/50"
                    : state === "active"
                      ? "text-fg"
                      : "text-muted"
                }
              >
                {s}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-muted/70">{t("progress.footnote")}</p>
    </div>
  );
}
