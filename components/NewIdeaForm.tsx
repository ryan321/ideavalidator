"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "./LocaleProvider";
import { DRAFT_IDEA_KEY } from "./HeroIdeaForm";

export default function NewIdeaForm() {
  const router = useRouter();
  const t = useT();
  const [prompt, setPrompt] = useState("");

  // Pick up an idea the visitor typed on the landing page before signing up
  // (see HeroIdeaForm). Consume it once so a refresh doesn't refill a cleared box.
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_IDEA_KEY);
      if (draft) {
        localStorage.removeItem(DRAFT_IDEA_KEY);
        setPrompt((cur) => cur || draft);
      }
    } catch {
      // storage unavailable — nothing to restore.
    }
  }, []);
  const [goal, setGoal] = useState("unsure");
  const [goalDetail, setGoalDetail] = useState("");
  const [insider, setInsider] = useState("");
  const [builder, setBuilder] = useState("");
  const [network, setNetwork] = useState("");
  const [provenance, setProvenance] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  const goalOptions = [
    { key: "lifestyle", label: t("studio.goalLifestyle") },
    { key: "side_hustle", label: t("studio.goalSideHustle") },
    { key: "venture", label: t("studio.goalVenture") },
    { key: "unsure", label: t("studio.goalUnsure") },
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const founderFit = [
      insider && `market knowledge: ${insider}`,
      builder && `built software before: ${builder}`,
      network && `warm intros to buyers: ${network}`,
    ]
      .filter(Boolean)
      .join("; ");
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          goal,
          goalDetail,
          founderFit,
          provenance: provenance || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? t("common.error"));
      router.push(`/idea/${json.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("common.error"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <label htmlFor="new-idea-prompt" className="sr-only">
          {t("a11y.ideaPrompt")}
        </label>
        <textarea
          id="new-idea-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={t("studio.promptPlaceholder")}
          rows={4}
          required
          minLength={8}
          className="iv-field w-full resize-none rounded-xl border bg-bg/40 px-4 py-3.5 text-base leading-relaxed outline-none placeholder:text-muted/70"
        />
      </div>

      <fieldset>
        <legend className="mb-2 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted">
          {t("studio.goalLabel")}
        </legend>
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label={t("a11y.goalGroup")}
        >
          {goalOptions.map((o) => {
            const selected = goal === o.key;
            return (
              <button
                key={o.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setGoal(o.key)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
                  selected
                    ? "border-accent bg-accent/20 font-medium text-accent2"
                    : "border-border text-muted hover:border-accent/30 hover:text-fg"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
        <label htmlFor="new-idea-goal-detail" className="sr-only">
          {t("a11y.goalDetail")}
        </label>
        <input
          id="new-idea-goal-detail"
          value={goalDetail}
          onChange={(e) => setGoalDetail(e.target.value)}
          placeholder={t("studio.goalDetailPlaceholder")}
          className="iv-field mt-2.5 w-full rounded-xl border bg-bg/40 px-3.5 py-2.5 text-sm outline-none placeholder:text-muted/70"
        />
      </fieldset>

      <div>
        <button
          type="button"
          onClick={() => setShowMore((s) => !s)}
          aria-expanded={showMore}
          aria-controls="founder-context-fields"
          className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted transition hover:text-accent2"
        >
          {showMore ? t("studio.founderContextHide") : t("studio.founderContextShow")}{" "}
          <span className="normal-case tracking-normal text-muted/60">
            {t("studio.founderContextHint")}
          </span>
        </button>
        {showMore && (
          <div
            id="founder-context-fields"
            className="mt-3 space-y-2.5 rounded-xl border border-border/80 bg-bg/30 p-3.5"
          >
            {(
              [
                {
                  label: t("studio.knowMarket"),
                  value: insider,
                  set: setInsider,
                  opts: [t("studio.insider"), t("studio.some"), t("studio.outsider")],
                },
                {
                  label: t("studio.builtSoftware"),
                  value: builder,
                  set: setBuilder,
                  opts: [t("studio.yes"), t("studio.no")],
                },
                {
                  label: t("studio.warmIntros"),
                  value: network,
                  set: setNetwork,
                  opts: [t("studio.yes"), t("studio.some"), t("studio.none")],
                },
              ] as const
            ).map((row) => (
              <div
                key={row.label}
                className="flex flex-wrap items-center gap-2"
                role="group"
                aria-label={row.label}
              >
                <span className="w-44 shrink-0 text-sm text-muted" id={`ctx-${row.label}`}>
                  {row.label}
                </span>
                <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby={`ctx-${row.label}`}>
                  {row.opts.map((o) => {
                    const selected = row.value === o;
                    return (
                      <button
                        key={o}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => row.set(selected ? "" : o)}
                        className={`rounded-full border px-2.5 py-1 text-xs transition ${
                          selected
                            ? "border-accent bg-accent/20 text-accent2"
                            : "border-border text-muted hover:text-fg"
                        }`}
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            <div
              className="flex flex-wrap items-center gap-2"
              role="group"
              aria-label={t("studio.whereFrom")}
            >
              <span className="w-44 shrink-0 text-sm text-muted" id="ctx-where">
                {t("studio.whereFrom")}
              </span>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-labelledby="ctx-where">
                {(
                  [
                    { key: "organic", label: t("studio.problemIHit") },
                    { key: "whiteboard", label: t("studio.brainstorming") },
                  ] as const
                ).map((o) => {
                  const selected = provenance === o.key;
                  return (
                    <button
                      key={o.key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setProvenance(selected ? "" : o.key)}
                      className={`rounded-full border px-2.5 py-1 text-xs transition ${
                        selected
                          ? "border-accent bg-accent/20 text-accent2"
                          : "border-border text-muted hover:text-fg"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-xl border border-bad/35 bg-bad/10 px-3 py-2 text-sm text-bad"
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
        <p className="max-w-sm text-xs leading-relaxed text-muted">{t("studio.scoredFooter")}</p>
        <button
          type="submit"
          disabled={busy || prompt.trim().length < 8}
          aria-busy={busy}
          className="rounded-pill-pack bg-accent px-6 py-2.5 font-display text-sm font-bold tracking-tight text-on-accent transition hover:bg-accent2 disabled:opacity-45"
        >
          {busy ? t("studio.starting") : t("studio.validateIdea")}
        </button>
      </div>
    </form>
  );
}
