import Link from "next/link";
import { CampaignPriceCard } from "@/components/CampaignPriceCard";
import { getSessionUser } from "@/lib/auth";
import { priceCents } from "@/lib/billing";
import { checklistItems } from "@/lib/i18n/t";
import { getTranslator } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getSessionUser();
  const { t } = await getTranslator();
  const price = `$${(priceCents() / 100).toFixed(0)}`;
  const ctaHref = user ? "/studio" : "/signup";
  const ctaLabel = user ? t("nav.openStudio") : t("nav.validateCta");
  const checklist = checklistItems(t);

  // Comparison rows: Validorian checks every one; "other services" get the
  // table-stakes (a verdict, market sizing) but miss the differentiators —
  // goal-relative scoring, an honest NO-GO, real WTP signals, the kill-test,
  // and the iterate / chat / arena loop that keeps sharpening the idea.
  const compareRows: { label: string; other: boolean }[] = [
    { label: t("compare.row1"), other: true },
    { label: t("compare.row2"), other: true },
    { label: t("compare.row3"), other: false },
    { label: t("compare.row4"), other: false },
    { label: t("compare.row5"), other: false },
    { label: t("compare.row6"), other: false },
    { label: t("compare.row7"), other: false },
    { label: t("compare.row8"), other: false },
    { label: t("compare.row9"), other: false },
  ];
  // One comparison cell's mark. "strong" = the highlighted Validorian column;
  // "weak" = a plain yes; "no" = a muted cross. sr-only text carries meaning.
  const mark = (kind: "strong" | "weak" | "no") =>
    kind === "no" ? (
      <>
        <span
          aria-hidden
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-fg/[0.05] text-[11px] font-bold text-fg/30"
        >
          ✗
        </span>
        <span className="sr-only">{t("compare.no")}</span>
      </>
    ) : (
      <>
        <span
          aria-hidden
          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-bold ${
            kind === "strong" ? "bg-accent text-on-accent" : "bg-fg/10 text-fg/60"
          }`}
        >
          ✓
        </span>
        <span className="sr-only">{t("compare.yes")}</span>
      </>
    );

  return (
    <div className="folio-enter">
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pb-20 sm:pt-16">
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_minmax(0,22rem)] lg:gap-12 xl:grid-cols-[1fr_minmax(0,24rem)]">
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
              {t("landing.eyebrow")}
            </p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-fg sm:text-6xl">
              {t("landing.h1a")}
              <span className="mt-2 block text-muted">{t("landing.h1b")}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              {t("landing.subBefore")}{" "}
              <em className="text-fg/85 not-italic">{t("landing.subVerdict")}</em>{" "}
              {t("landing.subMid")}{" "}
              <em className="text-fg/85 not-italic">{t("landing.subYour")}</em>{" "}
              {t("landing.subAfter")}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={ctaHref}
                className="rounded-pill-pack bg-accent px-6 py-3 font-display text-base font-bold text-on-accent transition hover:bg-accent2"
              >
                {ctaLabel}
              </Link>
              <Link
                href="/pricing"
                className="rounded-pill-pack border border-border px-5 py-3 text-sm font-medium text-muted transition hover:border-accent/40 hover:text-fg"
              >
                {t("landing.pricingDetails")}
              </Link>
              {!user && (
                <Link
                  href="/login"
                  className="rounded-pill-pack border border-border px-5 py-3 text-sm font-medium text-muted transition hover:border-accent/40 hover:text-fg"
                >
                  {t("nav.signIn")}
                </Link>
              )}
            </div>
            <p className="mt-4 text-sm text-muted">
              {user ? (
                <>
                  {t("landing.paidHintBefore")}{" "}
                  <span className="font-medium text-fg/80">
                    {t("landing.paidHintPrice", { price })}
                  </span>
                  {t("landing.paidHintAfter")}
                </>
              ) : (
                <>
                  <span className="font-medium text-fg/80">{t("landing.freeLead")}</span>{" "}
                  {t("landing.freeRest", { price })}
                </>
              )}
            </p>
            <p className="mt-2 font-mono text-[11px] text-muted">{t("landing.whoFor")}</p>
          </div>

          <div className="w-full max-w-md justify-self-center lg:max-w-none lg:justify-self-end">
            <CampaignPriceCard
              ctaHref={ctaHref}
              ctaLabel={ctaLabel}
              detailsHref="/pricing"
            />
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-panel/30 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
            {t("landing.whatYouGetEyebrow")}
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t("landing.whatYouGetTitle")}
          </h2>
          <p className="mt-2 max-w-xl text-muted">
            {t("landing.whatYouGetSub", { price })}
          </p>
          <ul className="mt-10 grid gap-x-10 gap-y-3 sm:grid-cols-2">
            {checklist.map((item) => (
              <li
                key={item}
                className="flex items-start gap-3 text-sm leading-snug text-fg/90 sm:text-[15px]"
              >
                <span
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent"
                  aria-hidden
                >
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="border-y border-border bg-panel/40 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t("landing.howTitle")}
          </h2>
          <p className="mt-2 max-w-xl text-muted">{t("landing.howSub")}</p>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {(
              [
                ["landing.how1Title", "landing.how1Body"],
                ["landing.how2Title", "landing.how2Body"],
                ["landing.how3Title", "landing.how3Body"],
              ] as const
            ).map(([titleKey, bodyKey], i) => (
              <li key={titleKey} className="folio p-5">
                <div className="font-mono text-[11px] font-semibold text-accent [letter-spacing:var(--tracking-eyebrow)]">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-2 font-display text-lg font-bold tracking-tight">
                  {t(titleKey)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t(bodyKey)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="folio flex flex-col gap-10 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 max-w-xl">
            <p className="font-mono text-[10px] uppercase text-muted [letter-spacing:var(--tracking-eyebrow)]">
              {t("landing.whyEyebrow")}
            </p>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {t("landing.whyTitle")}
            </h2>
            <ul className="mt-5 space-y-3 text-sm leading-relaxed text-muted">
              <li className="flex gap-2">
                <span className="font-medium text-accent" aria-hidden>
                  ·
                </span>
                <span>
                  <b className="font-medium text-fg/85">{t("landing.why1Title")}</b>{" "}
                  {t("landing.why1Body")}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-accent" aria-hidden>
                  ·
                </span>
                <span>
                  <b className="font-medium text-fg/85">{t("landing.why2Title")}</b>{" "}
                  {t("landing.why2Body")}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-accent" aria-hidden>
                  ·
                </span>
                <span>
                  <b className="font-medium text-fg/85">{t("landing.why3Title")}</b>{" "}
                  {t("landing.why3Body")}
                </span>
              </li>
            </ul>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 sm:items-end">
            <p className="font-mono text-[10px] uppercase text-muted [letter-spacing:var(--tracking-eyebrow)]">
              {t("landing.theCall")}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="verdict-stamp text-sm text-good">{t("verdict.go")}</span>
              <span className="verdict-stamp text-sm text-warn">{t("verdict.maybe")}</span>
              <span className="verdict-stamp text-sm text-bad">{t("verdict.noGo")}</span>
            </div>
            <p className="max-w-xs text-left text-xs leading-relaxed text-muted sm:text-right">
              {t("landing.theCallBody")}
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-panel/30 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-accent">
            {t("compare.eyebrow")}
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-2xl font-bold tracking-tight sm:text-3xl">
            {t("compare.title")}
          </h2>
          <p className="mt-2 max-w-xl text-muted">{t("compare.sub")}</p>

          <div className="mt-10 overflow-hidden rounded-[var(--radius-card)] border border-border bg-panel">
            <table className="w-full border-collapse text-left align-middle">
              <caption className="sr-only">{t("compare.title")}</caption>
              <colgroup>
                <col />
                <col className="w-20 sm:w-36" />
                <col className="w-20 sm:w-40" />
              </colgroup>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="px-4 py-4 sm:px-6" />
                  <th
                    scope="col"
                    className="px-2 py-4 text-center font-mono text-[11px] font-medium uppercase text-muted [letter-spacing:var(--tracking-eyebrow)] sm:px-4"
                  >
                    {t("compare.other")}
                  </th>
                  <th scope="col" className="bg-accent/10 px-2 py-4 text-center sm:px-4">
                    <span className="inline-flex rounded-pill-pack bg-accent px-3 py-1 font-display text-xs font-bold text-on-accent sm:text-sm">
                      {t("compare.us")}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row, i) => (
                  <tr key={i} className="border-b border-border/70 last:border-b-0">
                    <th
                      scope="row"
                      className="px-4 py-3.5 text-left text-sm font-medium leading-snug text-fg/90 sm:px-6 sm:text-[15px]"
                    >
                      {row.label}
                    </th>
                    <td className="px-2 py-3.5 text-center align-middle sm:px-4">
                      {mark(row.other ? "weak" : "no")}
                    </td>
                    <td className="bg-accent/5 px-2 py-3.5 text-center align-middle sm:px-4">
                      {mark("strong")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-center font-mono text-[11px] text-muted sm:text-left">
            {t("compare.foot")}
          </p>
        </div>
      </section>

      <section className="border-t border-border bg-panel/40 py-16 text-center sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t("landing.finalTitle")}
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted">
            {user
              ? t("landing.finalSubUser", { price })
              : t("landing.finalSubGuest", { price })}
          </p>
          <Link
            href={ctaHref}
            className="mt-8 inline-flex rounded-pill-pack bg-accent px-8 py-3.5 font-display text-base font-bold text-on-accent transition hover:bg-accent2"
          >
            {ctaLabel}
          </Link>
          {!user && <p className="mt-3 text-xs text-muted">{t("landing.noSub")}</p>}
        </div>
      </section>
    </div>
  );
}
