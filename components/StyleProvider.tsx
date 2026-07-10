"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  STYLE_STORAGE_KEY,
  STYLES,
  type StyleId,
  applyStyleToDocument,
  normalizeStyleId,
} from "@/lib/styles";

type Ctx = {
  style: StyleId;
  setStyle: (id: StyleId) => void;
  styles: typeof STYLES;
};

const StyleContext = createContext<Ctx | null>(null);

export function StyleProvider({ children }: { children: React.ReactNode }) {
  const [style, setStyleState] = useState<StyleId>("studio");

  useEffect(() => {
    try {
      const stored = normalizeStyleId(localStorage.getItem(STYLE_STORAGE_KEY));
      setStyleState(stored);
      applyStyleToDocument(stored);
    } catch {
      applyStyleToDocument("studio");
    }
  }, []);

  const setStyle = useCallback((id: StyleId) => {
    const next = normalizeStyleId(id);
    setStyleState(next);
    applyStyleToDocument(next);
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

  return <StyleContext.Provider value={value}>{children}</StyleContext.Provider>;
}

export function useStyle() {
  const ctx = useContext(StyleContext);
  if (!ctx) throw new Error("useStyle must be used within StyleProvider");
  return ctx;
}
