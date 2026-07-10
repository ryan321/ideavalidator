"use client";

import React from "react";
import { Card } from "@/components/ui";
import { signalCategoryLabel } from "@/lib/i18n/t";
import { useT } from "../LocaleProvider";

type Signal = { text: string; category: string };

function SignalList({
  items,
  startIndex = 0,
}: {
  items: Signal[];
  startIndex?: number;
}) {
  const t = useT();
  const safe = Array.isArray(items) ? items : [];
  if (safe.length === 0) {
    return <p className="text-xs italic text-muted">{t("report.noneIdentified")}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {safe.map((it, i) => {
        const n = startIndex + i + 1;
        const idx = String(n).padStart(2, "0");
        return (
          <li
            key={i}
            className="flex items-start gap-3 text-sm leading-relaxed"
          >
            <span className="mt-0.5 shrink-0 font-mono text-xs tabular-nums text-muted">
              {idx}
            </span>
            <span className="flex-1 text-fg/90">{it?.text}</span>
            {it?.category ? (
              <span className="mt-0.5 shrink-0 rounded-full border border-border bg-panel2 px-2 py-0.5 text-[10px] font-medium tracking-wide text-muted">
                {signalCategoryLabel(it.category, t)}
              </span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function Subsection({
  title,
  count,
  tone,
  children,
}: {
  title: string;
  count: number;
  tone: "good" | "bad" | "warn";
  children: React.ReactNode;
}) {
  const toneText =
    tone === "good"
      ? "text-good"
      : tone === "bad"
        ? "text-bad"
        : "text-warn";
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <h5
          className={`text-xs font-semibold uppercase tracking-wide ${toneText}`}
        >
          {title}
        </h5>
        <span className="font-mono text-xs tabular-nums text-muted">
          ({count})
        </span>
      </div>
      {children}
    </div>
  );
}

function CountPill({
  count,
  noun,
  tone,
}: {
  count: number;
  noun: string;
  tone: "good" | "bad";
}) {
  const cls =
    tone === "good"
      ? "bg-good/15 text-good border-good/30"
      : "bg-bad/15 text-bad border-bad/30";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${cls}`}
    >
      <span className="font-mono tabular-nums">{count}</span>
      {noun}
    </span>
  );
}

export function ValidationSummary({
  go,
  stop,
}: {
  go: {
    positive_signals: { text: string; category: string }[];
    key_strengths: { text: string; category: string }[];
  };
  stop: {
    critical_risks: { text: string; category: string }[];
    areas_of_concern: { text: string; category: string }[];
  };
}) {
  const t = useT();
  const positive = Array.isArray(go?.positive_signals)
    ? go.positive_signals
    : [];
  const strengths = Array.isArray(go?.key_strengths) ? go.key_strengths : [];
  const risks = Array.isArray(stop?.critical_risks) ? stop.critical_risks : [];
  const concerns = Array.isArray(stop?.areas_of_concern)
    ? stop.areas_of_concern
    : [];

  const goTotal = positive.length + strengths.length;
  const stopTotal = risks.length + concerns.length;

  return (
    <section className="mb-6">
      <div className="mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
          {t("report.validationSummary")}
        </h3>
        <p className="mt-0.5 text-sm text-muted">
          {t("report.validationSummaryBlurb")}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* LEFT — Go Signals */}
        <Card className="border-t-2 border-t-good p-0">
          <div className="p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-good/80">
                  {t("report.reasonsToMove")}
                </div>
                <h4 className="mt-0.5 text-base font-semibold text-fg">
                  {t("report.goSignals")}
                </h4>
              </div>
              <CountPill
                count={goTotal}
                noun={t("report.signalsNoun")}
                tone="good"
              />
            </div>

            <div className="space-y-5">
              <Subsection
                title={t("report.positiveSignals")}
                count={positive.length}
                tone="good"
              >
                <SignalList items={positive} />
              </Subsection>

              <Subsection
                title={t("report.keyStrengths")}
                count={strengths.length}
                tone="good"
              >
                <SignalList items={strengths} startIndex={positive.length} />
              </Subsection>
            </div>
          </div>
        </Card>

        {/* RIGHT — Stop Signals */}
        <Card className="border-t-2 border-t-bad p-0">
          <div className="p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-widest text-bad/80">
                  {t("report.reasonsToPause")}
                </div>
                <h4 className="mt-0.5 text-base font-semibold text-fg">
                  {t("report.stopSignals")}
                </h4>
              </div>
              <CountPill
                count={stopTotal}
                noun={t("report.risksNoun")}
                tone="bad"
              />
            </div>

            <div className="space-y-5">
              <Subsection
                title={t("report.criticalRisks")}
                count={risks.length}
                tone="bad"
              >
                <SignalList items={risks} />
              </Subsection>

              <Subsection
                title={t("report.areasOfConcern")}
                count={concerns.length}
                tone="warn"
              >
                <SignalList items={concerns} startIndex={risks.length} />
              </Subsection>
            </div>
          </div>
        </Card>
      </div>
    </section>
  );
}
