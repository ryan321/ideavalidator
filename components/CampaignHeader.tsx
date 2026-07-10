"use client";

import { useT } from "./LocaleProvider";

// Zone B — the campaign loop state (not another primary action bar).

export function CampaignHeader({
  activeN,
  versionCount,
  bestN,
  bestScore,
  bestLabel,
  onViewBest,
  openQuestion,
  testStatus,
}: {
  activeN: number;
  versionCount: number;
  bestN?: number | null;
  bestScore?: number | null;
  bestLabel?: string | null;
  onViewBest?: () => void;
  openQuestion?: string | null;
  /** "not run" | "kit ready" | "PASS" | "KILL" | "INCONCLUSIVE" */
  testStatus: string;
}) {
  const t = useT();
  const statusColor =
    testStatus === "PASS"
      ? "var(--color-good)"
      : testStatus === "KILL"
        ? "var(--color-bad)"
        : testStatus === "INCONCLUSIVE"
          ? "var(--color-warn)"
          : testStatus === "KIT READY"
            ? "var(--color-accent2)"
            : "var(--color-muted)";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-panel/50">
      <div className="grid divide-y divide-border sm:grid-cols-[auto_1fr] sm:divide-x sm:divide-y-0">
        <div className="flex items-center gap-3 px-4 py-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
              {t("campaign.loop", { n: activeN })}
            </div>
            <div className="mt-0.5 text-sm font-medium text-fg/90">
              {versionCount === 1
                ? t("campaign.anglesTried", { n: versionCount })
                : t("campaign.anglesTriedPlural", { n: versionCount })}
            </div>
            {bestN != null && bestScore != null && (
              <button
                onClick={onViewBest}
                className="mt-1 flex items-center gap-1 text-[11px] text-muted transition hover:text-fg"
                title={bestLabel ?? undefined}
              >
                {t("campaign.best")}{" "}
                <b className="font-mono">
                  v{bestN}
                </b>{" "}
                ({bestScore}) ★ →
              </button>
            )}
          </div>
        </div>

        <div className="min-w-0 px-4 py-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            {t("campaign.openQuestion")}
          </div>
          <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-fg/90">
            {openQuestion ?? t("campaign.noneRecorded")}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusColor }} />
            <span style={{ color: statusColor }}>
              {t("campaign.killTest", { status: testStatus })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
