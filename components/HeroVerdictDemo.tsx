import { getTranslator } from "@/lib/i18n/server";

// The landing hero's signature artifact: a condensed, honestly-labeled SAMPLE of the
// product's real output. It leads with the verdict (the thing people expect), then makes
// the real point — the $29 buys a full sourced teardown, not a stamp — by listing what
// the report also contains and how the evidence is gathered. It deliberately uses the
// PRODUCT's faces (sans + mono), not the marketing serif, so it reads as a report excerpt
// sitting on an editorial page. Static by design: no data, no fetches.

const SCORE = 78;
const RING_R = 34;
const RING_C = 2 * Math.PI * RING_R;

function Check() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent"
      fill="none"
      aria-hidden
    >
      <path
        d="M3.2 8.6l3 3 6.4-7.2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export async function HeroVerdictDemo({ price }: { price: string }) {
  const { t } = await getTranslator();
  const includes = [
    t("sample.inc1"),
    t("sample.inc2"),
    t("sample.inc3"),
    t("sample.inc4"),
    t("sample.inc5"),
    t("sample.inc6"),
  ];
  return (
    <div
      className="folio overflow-hidden"
      role="img"
      aria-label={`${t("sample.eyebrow")} — ${t("verdict.go")} ${SCORE}`}
    >
      {/* verdict masthead — mirrors the real report's gradient wash */}
      <div
        className="p-5 sm:p-6"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--color-good) 10%, transparent), transparent 60%)",
        }}
      >
        <div className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.18em]">
          <span className="font-semibold text-accent2">{t("sample.eyebrow")}</span>
          <span className="text-muted">{t("sample.timing")}</span>
        </div>

        <div className="mt-4 flex items-center gap-5">
          {/* score ring */}
          <div className="relative h-24 w-24 shrink-0">
            <svg viewBox="0 0 84 84" className="h-full w-full -rotate-90">
              <circle
                cx="42"
                cy="42"
                r={RING_R}
                fill="none"
                stroke="color-mix(in srgb, var(--color-good) 18%, transparent)"
                strokeWidth="7"
              />
              <circle
                cx="42"
                cy="42"
                r={RING_R}
                fill="none"
                stroke="var(--color-good)"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${(RING_C * SCORE) / 100} ${RING_C}`}
              />
            </svg>
            <span className="absolute inset-0 grid place-items-center font-display text-3xl font-extrabold tabular-nums text-fg">
              {SCORE}
            </span>
          </div>

          <div className="min-w-0">
            <span className="verdict-stamp text-base text-good">{t("verdict.go")}</span>
            <p className="mt-2.5 text-sm font-semibold leading-snug text-fg/90">
              {t("sample.reason")}
            </p>
          </div>
        </div>
      </div>

      {/* the numbers strip */}
      <div className="grid grid-cols-3 gap-px border-t border-border/70 bg-border/60">
        {[
          [t("sample.obtainable"), "$240K"],
          [t("sample.confidence"), "88%"],
          [t("sample.evidence"), t("sample.evidenceItems", { n: 30 })],
        ].map(([label, value]) => (
          <div key={label} className="bg-panel px-3 py-2.5">
            <div className="truncate font-mono text-[9px] uppercase tracking-[0.14em] text-muted">
              {label}
            </div>
            <div className="mt-0.5 truncate font-display text-sm font-bold text-fg">{value}</div>
          </div>
        ))}
      </div>

      {/* the point: the verdict above is page one — here's the rest of the report */}
      <div className="border-t border-border/70 px-5 py-4 sm:px-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          {t("sample.includesLabel")}
        </div>
        <ul className="mt-2.5 space-y-1.5">
          {includes.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 text-[13px] leading-snug text-fg/85"
            >
              <Check />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* how it's built — the methodology, honestly scoped */}
      <div className="border-t border-border/70 px-5 py-3.5 sm:px-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
          {t("sample.howLabel")}
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{t("sample.how")}</p>
      </div>

      {/* the offer, quietly */}
      <div className="border-t border-border/70 bg-panel2/40 px-5 py-3 text-xs leading-relaxed text-fg/75 sm:px-6">
        {t("sample.unlock", { price })}
      </div>
    </div>
  );
}
