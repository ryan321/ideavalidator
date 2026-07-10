"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";
import { useLocale, useT } from "./LocaleProvider";

/** Compact codes on the trigger; menu lists full native names. */
const LOCALE_SHORT: Record<Locale, string> = {
  en: "EN",
  es: "ES",
  pt: "PT",
  fr: "FR",
  de: "DE",
  ja: "JA",
  ko: "KO",
  zh: "中文",
  hi: "HI",
  ar: "AR",
};

function GlobeIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

/** Globe + short locale code; opens a menu of full language names. */
export function LocaleSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const place = () => {
      const r = btnRef.current?.getBoundingClientRect();
      if (!r) return;
      const menuW = 176;
      let left = r.right - menuW;
      left = Math.max(8, Math.min(left, window.innerWidth - menuW - 8));
      setPos({ top: r.bottom + 6, left });
    };
    place();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function pick(code: Locale) {
    setOpen(false);
    if (code !== locale) await setLocale(code);
  }

  const menu =
    open &&
    pos &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menuRef}
        role="listbox"
        aria-label={t("nav.language")}
        className="fixed z-[90] max-h-[min(70vh,20rem)] w-44 overflow-auto rounded-xl border border-border bg-panel py-1 shadow-xl"
        style={{ top: pos.top, left: pos.left }}
      >
        {LOCALES.map((code) => {
          const active = code === locale;
          return (
            <button
              key={code}
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => void pick(code)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition ${
                active
                  ? "bg-accent/12 font-medium text-accent2"
                  : "text-fg/90 hover:bg-panel2"
              }`}
            >
              <span className="w-7 shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wide text-muted">
                {LOCALE_SHORT[code]}
              </span>
              <span className="min-w-0 truncate">{LOCALE_LABELS[code]}</span>
            </button>
          );
        })}
      </div>,
      document.body
    );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t("nav.language")}: ${LOCALE_LABELS[locale]}`}
        title={LOCALE_LABELS[locale]}
        className={`inline-flex items-center gap-1.5 rounded-pill-pack border border-border px-2.5 py-1.5 text-muted transition hover:border-accent/40 hover:text-fg ${className}`}
      >
        <GlobeIcon className="h-3.5 w-3.5 shrink-0" />
        <span className="font-mono text-[11px] font-medium uppercase tracking-wide">
          {LOCALE_SHORT[locale]}
        </span>
      </button>
      {menu}
    </>
  );
}
