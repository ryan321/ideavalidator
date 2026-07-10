"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  STYLE_STORAGE_KEY,
  STYLES,
  type StyleId,
  normalizeStyleId,
} from "@/lib/styles";

type Ctx = {
  style: StyleId;
  setStyle: (id: StyleId) => void;
  styles: typeof STYLES;
};

const StyleContext = createContext<Ctx | null>(null);

function applyDomStyle(id: StyleId) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-style", id);
  document.documentElement.style.colorScheme =
    id === "ink" || id === "slate" ? "dark" : "light";
}

export function StyleProvider({ children }: { children: React.ReactNode }) {
  const [style, setStyleState] = useState<StyleId>("paper");

  useEffect(() => {
    try {
      const stored = normalizeStyleId(localStorage.getItem(STYLE_STORAGE_KEY));
      setStyleState(stored);
      applyDomStyle(stored);
    } catch {
      applyDomStyle("paper");
    }
  }, []);

  const setStyle = useCallback((id: StyleId) => {
    const next = normalizeStyleId(id);
    setStyleState(next);
    applyDomStyle(next);
    try {
      localStorage.setItem(STYLE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({ style, setStyle, styles: STYLES }),
    [style, setStyle]
  );

  // CSS is applied by the head boot script before paint (no flash).
  return <StyleContext.Provider value={value}>{children}</StyleContext.Provider>;
}

export function useStyle() {
  const ctx = useContext(StyleContext);
  if (!ctx) throw new Error("useStyle must be used within StyleProvider");
  return ctx;
}
