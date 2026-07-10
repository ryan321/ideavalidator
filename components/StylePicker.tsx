"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useStyle } from "./StyleProvider";
import { STYLE_IDS } from "@/lib/styles";
import { useT } from "./LocaleProvider";

export function StylePicker() {
  const t = useT();
  const { style, setStyle, styles } = useStyle();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = styles[style];

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t("a11y.stylePicker", { style: current.label })}
        title={t("a11y.stylePicker", { style: current.label })}
        className="flex items-center gap-2 rounded-pill-pack border border-border bg-panel px-2.5 py-1.5 text-xs transition hover:border-accent/40 hover:bg-panel2"
      >
        <span className="flex gap-0.5" aria-hidden>
          {current.swatches.map((c, i) => (
            <span
              key={i}
              className="h-3 w-3 rounded-full border border-border/80"
              style={{ background: c }}
            />
          ))}
        </span>
        <span className="hidden font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:inline">
          {current.label}
        </span>
        <span className={`text-[10px] text-muted transition ${open ? "rotate-180" : ""}`} aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={t("a11y.styleList")}
          className="absolute right-0 top-full z-50 mt-1.5 w-64 overflow-hidden rounded-xl border border-border bg-panel shadow-xl shadow-[color-mix(in_srgb,var(--color-fg)_12%,transparent)]"
        >
          <div className="border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {t("a11y.deskStyle")}
          </div>
          <ul className="max-h-80 overflow-auto p-1">
            {STYLE_IDS.map((id) => {
              const s = styles[id];
              const active = id === style;
              return (
                <li key={id} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      setStyle(id);
                      setOpen(false);
                      btnRef.current?.focus();
                    }}
                    className={`flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition ${
                      active ? "bg-accent/12 ring-1 ring-accent/30" : "hover:bg-panel2"
                    }`}
                  >
                    <span className="mt-0.5 flex shrink-0 gap-0.5" aria-hidden>
                      {s.swatches.map((c, i) => (
                        <span
                          key={i}
                          className="h-3.5 w-3.5 rounded-full border border-border/70"
                          style={{ background: c }}
                        />
                      ))}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-fg">{s.label}</span>
                        {active && (
                          <span className="font-mono text-[9px] uppercase tracking-wide text-accent">
                            {t("a11y.styleActive")}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs leading-snug text-muted">{s.blurb}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
