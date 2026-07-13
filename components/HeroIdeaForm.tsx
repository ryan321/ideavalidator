"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useT } from "./LocaleProvider";

// Value-first capture: let a visitor type their idea on the landing page BEFORE
// hitting the account wall. The draft is stashed in localStorage (never a URL —
// an idea can be sensitive) and picked up by the studio composer (NewIdeaForm)
// after sign-up, so the idea they invested in carries straight through.
export const DRAFT_IDEA_KEY = "iv_draft_idea";

export function HeroIdeaForm({ signedIn, price }: { signedIn: boolean; price: string }) {
  const router = useRouter();
  const t = useT();
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = prompt.trim().length >= 8;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || busy) return;
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
        id="hero-idea"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={t("convert.ideaPlaceholder")}
        rows={3}
        className="w-full resize-none rounded-2xl border border-border bg-bg/50 px-4 py-3.5 text-base leading-relaxed shadow-sm outline-none placeholder:text-muted/70 focus:border-accent"
      />
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="submit"
          disabled={!ready || busy}
          aria-busy={busy}
          className="rounded-pill-pack bg-accent px-6 py-3 font-display text-base font-bold text-on-accent transition hover:bg-accent2 disabled:opacity-45"
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
      <p className="mt-3 max-w-xl text-xs leading-relaxed text-muted">
        {t("convert.ideaHint", { price })}
      </p>
    </form>
  );
}
