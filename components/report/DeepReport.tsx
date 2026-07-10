import type { Audit, CoveClaim, Validation } from "@/lib/generators/validation";
import { criterionTone } from "@/lib/scoring";
import { MarkdownText } from "../MarkdownText";

// Wave 3 deep-mode + audit report surfaces. These render ONLY when the artifact was
// produced by the deep pipeline (d.mode === "deep") or carries an audit block —
// standard runs omit `mode` and none of these fields, so nothing renders for them.

// ---- mode badge --------------------------------------------------------------

/** "standard | deep" badge showing which pipeline produced this report. Deep is the
 * bull/bear/reconcile + CoVe orchestration; standard is the k-sample single-family pass. */
export function ModeBadge({ mode }: { mode?: "standard" | "deep" }) {
  const deep = mode === "deep";
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
        deep ? "border-accent2/40 bg-accent2/10 text-accent2" : "border-border bg-panel2 text-muted"
      }`}
      title={
        deep
          ? "Deep mode — an independent bull case and bear case were argued, reconciled on the evidence, then the load-bearing claims were verified (CoVe). ~3–4× a standard run."
          : "Standard mode — a single-family k-sample scoring pass."
      }
    >
      {deep ? "◆ deep" : "standard"}
    </span>
  );
}

// ---- bull / bear memos -------------------------------------------------------


/** The two adversarial memos, framed as "we argued both sides, then judged on
 * evidence". Rendered as a two-column disclosure (bull green / bear red). */
export function DeepMemos({
  bull,
  bear,
  print = false,
}: {
  bull?: string;
  bear?: string;
  print?: boolean;
}) {
  if (!bull && !bear) return null;
  return (
    <details className="group rounded-xl border border-border bg-panel/40" open={print}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 font-mono text-[13px] uppercase tracking-[0.12em] text-muted hover:text-fg">
        <span className="transition group-open:rotate-90">▸</span>
        Bull case / bear case — we argued both sides, then judged on evidence
      </summary>
      <div className="border-t border-border p-5">
        <p className="mb-4 max-w-3xl text-xs leading-relaxed text-muted">
          Two independent passes built the strongest evidence-based case <b className="text-good">for</b>{" "}
          and <b className="text-bad">against</b> this idea in fresh contexts, each citing only the
          corpus and web. A third pass then reconciled them — the side citing retrieved evidence wins;
          unsupported assertions lose — and produced the score above.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {bull && (
            <div className="rounded-lg border border-good/25 bg-good/[0.04] p-4">
              <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-good">
                ↑ Bull case
              </div>
              <MarkdownText text={bull} />
            </div>
          )}
          {bear && (
            <div className="rounded-lg border border-bad/25 bg-bad/[0.04] p-4">
              <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.14em] text-bad">
                ↓ Bear case
              </div>
              <MarkdownText text={bear} />
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

// ---- CoVe claim-verification ledger ------------------------------------------

const COVE_META: Record<CoveClaim["status"], { label: string; cls: string; help: string }> = {
  supported: {
    label: "supported",
    cls: "border-good/40 bg-good/10 text-good",
    help: "Verified against the corpus + fetched sources — the evidence backs this claim.",
  },
  contradicted: {
    label: "contradicted",
    cls: "border-bad/40 bg-bad/10 text-bad",
    help: "The evidence runs AGAINST this claim — the criterion it underpins was discounted to ≤ 45.",
  },
  not_in_evidence: {
    label: "not in evidence",
    cls: "border-warn/40 bg-warn/10 text-warn",
    help: "No supporting evidence found (plausibility isn't support) — the criterion it underpins was pulled halfway toward the base-rate prior.",
  },
};

/** The chain-of-verification ledger: each load-bearing claim, the criterion it
 * underpins, and a supported/contradicted/not-in-evidence chip. Contradicted and
 * not-in-evidence rows are visually flagged (they discounted their criterion in
 * finalize — the discount itself shows in System adjustments). */
export function CoveLedger({ cove, print = false }: { cove?: CoveClaim[]; print?: boolean }) {
  if (!cove?.length) return null;
  const flagged = cove.filter((c) => c.status !== "supported").length;
  return (
    <details className="group rounded-xl border border-border bg-panel/40" open={print}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 font-mono text-[13px] uppercase tracking-[0.12em] text-muted hover:text-fg">
        <span className="transition group-open:rotate-90">▸</span>
        Claim verification · {cove.length} load-bearing claim{cove.length === 1 ? "" : "s"}
        {flagged > 0 && (
          <span className="rounded-full border border-warn/40 bg-warn/10 px-1.5 py-px font-mono text-[9px] tracking-wide text-warn">
            {flagged} flagged
          </span>
        )}
      </summary>
      <div className="border-t border-border p-5">
        <p className="mb-3 max-w-3xl text-xs leading-relaxed text-muted">
          After reconciliation, the factual claims most responsible for the high bands were each
          re-checked <b className="text-fg/80">strictly against the corpus + fetched sources</b>.
          A contradicted claim caps its criterion at 45; an unsupported one pulls it halfway toward
          the ~90%-failure base rate — those discounts appear in “System adjustments”.
        </p>
        <ul className="space-y-2.5">
          {cove.map((c, i) => {
            const m = COVE_META[c.status] ?? COVE_META.not_in_evidence;
            const flag = c.status !== "supported";
            return (
              <li
                key={i}
                className={`rounded-lg border p-3 ${
                  flag ? "border-warn/25 bg-warn/[0.03]" : "border-border/70 bg-panel/40"
                }`}
              >
                <div className="flex flex-wrap items-start gap-2">
                  <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide ${m.cls}`}
                    title={m.help}
                  >
                    {m.label}
                  </span>
                  {c.criterion && (
                    <span className="shrink-0 rounded-full border border-border bg-panel2 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
                      {c.criterion}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 text-sm leading-snug text-fg/90">{c.claim}</span>
                </div>
                {c.note && <p className="mt-1.5 pl-1 text-xs leading-relaxed text-muted">{c.note}</p>}
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}

// ---- second-family audit panel -----------------------------------------------

/** "Cross-check (second model family)" — one banded scoring pass on a genuinely
 * different model family over the SAME prompt + corpus, per-criterion delta vs our
 * score, |delta|>15 flagged. It is SURFACED, never averaged into the score. */
export function AuditPanel({ audit, print = false }: { audit?: Audit; print?: boolean }) {
  if (!audit?.criteria?.length) return null;
  const flagged = new Set(audit.flagged ?? []);
  return (
    <details className="group rounded-xl border border-border bg-panel/40" open={print}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 font-mono text-[13px] uppercase tracking-[0.12em] text-muted hover:text-fg">
        <span className="transition group-open:rotate-90">▸</span>
        Cross-check · second model family
        {flagged.size > 0 && (
          <span className="rounded-full border border-warn/40 bg-warn/10 px-1.5 py-px font-mono text-[9px] tracking-wide text-warn">
            {flagged.size} diverge
          </span>
        )}
      </summary>
      <div className="border-t border-border p-5">
        <p className="mb-3 max-w-3xl text-xs leading-relaxed text-muted">
          A genuinely different model family (<b className="text-fg/80">{audit.model}</b>) scored the
          same claims brief + corpus as a Goodhart check. This is{" "}
          <b className="text-fg/80">surfaced, not averaged</b> — it never changes the score or verdict;
          it only shows where an independent judge disagrees. A gap of more than 15 points is flagged.
        </p>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[26rem] text-xs">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wide text-muted">
                <th className="px-3 py-1.5 font-medium">Criterion</th>
                <th className="px-3 py-1.5 text-right font-medium">Ours</th>
                <th className="px-3 py-1.5 text-right font-medium">Audit</th>
                <th className="px-3 py-1.5 text-right font-medium">Δ</th>
              </tr>
            </thead>
            <tbody>
              {audit.criteria.map((c) => {
                const isFlagged = flagged.has(c.name);
                const sign = c.delta > 0 ? "+" : "";
                return (
                  <tr
                    key={c.name}
                    className={`border-b border-border/60 last:border-0 ${isFlagged ? "bg-warn/5" : ""}`}
                  >
                    <td className="px-3 py-1.5">
                      {c.name}
                      {isFlagged && (
                        <span className="ml-1.5 font-mono text-[9px] uppercase tracking-wide text-warn">◂ diverges</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono" style={{ color: criterionTone(c.our_score) }}>
                      {c.our_score}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono" style={{ color: criterionTone(c.audit_score) }}>
                      {c.audit_score}
                    </td>
                    <td
                      className={`px-3 py-1.5 text-right font-mono font-bold ${
                        isFlagged ? "text-warn" : "text-muted"
                      }`}
                    >
                      {sign}
                      {c.delta}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}

// ---- tarpit / SISP callouts --------------------------------------------------

/** "Known tarpit pattern" callout — names the matched pattern, the prior attempts the
 * model found, and whether a real differentiated insight escapes the graveyard. A match
 * is not a fail; it demands a differentiated insight (else demand + Moat band low). */
export function TarpitCallout({ tarpit }: { tarpit?: Validation["tarpit"] }) {
  if (!tarpit?.matched) return null;
  const insight = tarpit.differentiated_insight?.trim();
  const hasEscape = insight && !/^none( found)?$|^n\/?a$/i.test(insight);
  return (
    <div className="rounded-xl border border-warn/40 bg-warn/5 p-4">
      <div className="mb-1 flex items-center gap-2 font-mono text-[13px] uppercase tracking-[0.12em] text-warn">
        <span aria-hidden>⚠</span>
        Known tarpit pattern
      </div>
      <p className="text-sm leading-snug text-fg/90">
        This matches a well-known idea trap: <b className="text-warn">{tarpit.pattern}</b>. Looks easy,
        everyone builds it, distribution and retention kill most attempts — so it isn&apos;t an
        auto-fail, but it must clear a differentiated-insight bar or the demand and moat criteria band
        low.
      </p>
      {tarpit.prior_attempts && (
        <div className="mt-2.5">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Prior attempts</div>
          <p className="mt-0.5 text-sm leading-relaxed text-fg/85">{tarpit.prior_attempts}</p>
        </div>
      )}
      <div className="mt-2.5">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          Differentiated insight {hasEscape ? "· the escape hatch" : "· the ask"}
        </div>
        <p className="mt-0.5 text-sm leading-relaxed" style={{ color: hasEscape ? "var(--color-fg)" : "var(--color-bad)" }}>
          {hasEscape ? insight : "None found — without a real reason this attempt escapes, the pattern's graveyard applies."}
        </p>
      </div>
    </div>
  );
}

/** "Solution in search of a problem" flag — the pitch started from a technology with no
 * named sufferer or concrete pain; Problem-Solution Fit was capped at C. */
export function SispFlag({ sisp }: { sisp?: boolean }) {
  if (!sisp) return null;
  return (
    <div className="rounded-r-lg border-l-2 border-warn/50 bg-warn/5 px-4 py-3 text-sm">
      <span className="font-mono text-[13px] uppercase tracking-wide text-warn">Solution in search of a problem · </span>
      <span className="text-fg/90">
        This reads as a technology/solution with no named sufferer or concrete pain. Problem-Solution
        Fit is capped at C until a real, hurting customer is identified.
      </span>
    </div>
  );
}

// ---- provenance tag ----------------------------------------------------------

/** A tiny report-header tag: "founder lived the problem" (organic) or "from
 * brainstorming" (whiteboard). Neutral/absent when provenance is null (unasked). */
export function ProvenanceTag({ provenance }: { provenance?: "organic" | "whiteboard" | null }) {
  if (provenance !== "organic" && provenance !== "whiteboard") return null;
  const organic = provenance === "organic";
  const c = organic ? "var(--color-good)" : "var(--color-muted)";
  return (
    <span
      className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide"
      title={
        organic
          ? "The founder said this came from a problem they personally hit — an insider who lived the pain, which lends credibility to firsthand demand claims and raises Founder Fit."
          : "The founder said this came from brainstorming — no lived experience of the pain, so the insider bonus is withheld and market risk is elevated."
      }
      style={{ color: c, borderColor: `color-mix(in srgb, ${c} 40%, transparent)`, background: `color-mix(in srgb, ${c} 8%, transparent)` }}
    >
      {organic ? "◆ founder lived the problem" : "○ from brainstorming"}
    </span>
  );
}
