"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "./LocaleProvider";

// Value-first capture: let a visitor type their idea on the landing page BEFORE
// hitting the account wall. The draft is stashed in localStorage (never a URL —
// an idea can be sensitive) and picked up by the studio composer (NewIdeaForm)
// after sign-up, so the idea they invested in carries straight through.
export const DRAFT_IDEA_KEY = "iv_draft_idea";

const MIN_IDEA = 8;

export function HeroIdeaForm({ signedIn, price }: { signedIn: boolean; price: string }) {
  const router = useRouter();
  const t = useT();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [tried, setTried] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const ready = prompt.trim().length >= MIN_IDEA;
  // Only nag AFTER they've clicked with too little — never gray the button out.
  const showHint = tried && !ready;

  // Autofocus the idea box on load so visitors can start typing immediately — but
  // only on pointer/hover devices, so we don't pop the on-screen keyboard over the
  // hero on phones. preventScroll keeps the headline from jumping out of view.
  useEffect(() => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!ready) {
      setTried(true);
      textareaRef.current?.focus();
      return;
    }
    setBusy(true);
    try {
      localStorage.setItem(DRAFT_IDEA_KEY, prompt.trim());
    } catch {
      // private-mode / storage disabled: the composer just opens empty, no harm.
    }
    router.push(signedIn ? "/studio" : "/signup");
  }

  return (
    <form onSubmit={submit} className="mt-8">
      <label htmlFor="hero-idea" className="sr-only">
        {t("a11y.ideaPrompt")}
      </label>
      <textarea
        ref={textareaRef}
        id="hero-idea"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={t("convert.ideaPlaceholder")}
        rows={3}
        aria-invalid={showHint}
        aria-describedby={showHint ? "hero-idea-hint" : undefined}
        className={`w-full resize-none rounded-2xl border bg-bg/50 px-4 py-3.5 text-base leading-relaxed shadow-sm outline-none placeholder:text-muted/70 focus:border-accent ${
          showHint ? "border-warn/60" : "border-border"
        }`}
      />
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="submit"
          aria-busy={busy}
          className="rounded-pill-pack bg-accent px-6 py-3 font-display text-base font-bold text-on-accent transition hover:bg-accent2"
        >
          {busy ? t("convert.ideaCtaBusy") : t("convert.ideaCta")}
        </button>
        {!signedIn && (
          <span className="text-sm text-muted">
            {t("convert.haveAccount")}{" "}
            <Link href="/login" className="font-medium text-accent2 hover:underline">
              {t("nav.signIn")}
            </Link>
          </span>
        )}
      </div>
      {showHint && (
        <div
          id="hero-idea-hint"
          role="alert"
          className="mt-2 w-fit rounded-lg border border-warn/40 bg-warn/10 px-3 py-1.5 text-sm font-medium text-warn"
        >
          {t("convert.ideaError")}
        </div>
      )}
      <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted">
        {t("convert.ideaHint", { price })}
      </p>
    </form>
  );
}
