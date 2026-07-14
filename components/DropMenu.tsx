"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useT } from "./LocaleProvider";

// Shared dropdown menu (extracted from IdeaWorkspace): portal-rendered so it can't be
// clipped, flips above when out of room, closes on outside click / Escape. Items are
// buttons (onClick) or links (href) — a link item still closes the menu on activation.

export type MenuItem = {
  label: string;
  hint?: string;
  onClick?: () => void;
  /** Navigation items render as a real <a> so middle-click/copy-link work. */
  href?: string;
  disabled?: boolean;
  danger?: boolean;
};

export function DropMenu({
  trigger,
  items,
  tone = "default",
  align = "left",
  caret = true,
  disabled,
  label,
  triggerClassName,
}: {
  trigger: React.ReactNode;
  items: MenuItem[];
  tone?: "default" | "accent" | "accent2";
  align?: "left" | "right";
  caret?: boolean;
  disabled?: boolean;
  /** Accessible name when the visible trigger is icon-only. */
  label?: string;
  /** Full override of the trigger button's classes (e.g. an avatar circle). */
  triggerClassName?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const MENU_W = 256; // w-64

  const place = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const gap = 4;
    const menuH = menuRef.current?.offsetHeight ?? items.length * 56;
    const spaceBelow = window.innerHeight - r.bottom - gap;
    const spaceAbove = r.top - gap;
    const openUp = spaceBelow < menuH && spaceAbove > spaceBelow;
    let left = align === "right" ? r.right - MENU_W : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - MENU_W - 8));
    const top = openUp
      ? Math.max(8, r.top - gap - menuH)
      : Math.min(r.bottom + gap, window.innerHeight - 8);
    setPos({ top, left, width: MENU_W });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    place();
    // Second pass once the menu is measured so flip-above is accurate.
    requestAnimationFrame(place);
    const onReposition = () => place();
    window.addEventListener("resize", onReposition);
    // Capture scroll on any ancestor — fixed menus stay put otherwise.
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- place reads live DOM; re-run on open/align only
  }, [open, align, items.length]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
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

  const toneCls =
    tone === "accent"
      ? "border-accent/30 text-accent hover:bg-accent/10"
      : tone === "accent2"
        ? "border-accent2/30 text-accent2 hover:bg-accent2/10"
        : "border-border text-muted hover:text-fg";

  const itemCls = (danger?: boolean) =>
    `flex w-full flex-col items-start gap-0.5 border-b border-border/60 px-3 py-2 text-left transition last:border-0 disabled:opacity-40 ${
      danger ? "text-bad hover:bg-bad/10" : "hover:bg-panel2"
    }`;

  const menu =
    open &&
    pos &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menuRef}
        role="menu"
        aria-label={label ?? t("common.moreActions")}
        style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 80 }}
        className="overflow-hidden rounded-xl border border-border bg-panel shadow-2xl shadow-[#1a1612]/12"
      >
        {items.map((it, i) =>
          it.href ? (
            <a
              key={i}
              role="menuitem"
              href={it.href}
              onClick={() => setOpen(false)}
              className={itemCls(it.danger)}
            >
              <span className="text-sm font-medium">{it.label}</span>
              {it.hint && <span className="text-xs text-muted">{it.hint}</span>}
            </a>
          ) : (
            <button
              key={i}
              type="button"
              role="menuitem"
              disabled={it.disabled}
              onClick={() => {
                setOpen(false);
                it.onClick?.();
                btnRef.current?.focus();
              }}
              className={itemCls(it.danger)}
            >
              <span className="text-sm font-medium">{it.label}</span>
              {it.hint && <span className="text-xs text-muted">{it.hint}</span>}
            </button>
          )
        )}
      </div>,
      document.body
    );

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={
          triggerClassName ??
          `flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition disabled:opacity-50 ${toneCls}`
        }
      >
        {trigger}
        {caret && (
          <span className={`text-[10px] transition ${open ? "rotate-180" : ""}`} aria-hidden>
            ▾
          </span>
        )}
      </button>
      {menu}
    </div>
  );
}
