"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Artifact, ArtifactKind, Idea, Version } from "@/lib/db";
import type { GeneratorMeta } from "@/lib/generators";
import type { EvidenceCorpus } from "@/lib/evidence/types";
import GenerationProgress from "./GenerationProgress";
import type { Refinement } from "@/lib/generators/refine";
import type { WedgeProposal, WedgeSet } from "@/lib/generators/wedges";
import { acceptanceMargin, percentileOf, verdictBands } from "@/lib/scoring";
import { SourcesList, ValidationView } from "./artifacts";
import { ArenaBoard } from "./ArenaBoard";
import { DecisionCard } from "./DecisionCard";
import { AnglesPicker } from "./AnglesPicker";
import { MarkdownText } from "./MarkdownText";
import { CriteriaDeltaTable, type DeltaVersion } from "./report/CriteriaDeltaTable";
import type { ZodType } from "zod";
import { ValidationSchema, type Validation } from "@/lib/generators/validation";
import { verdictLabel } from "@/lib/i18n/t";
import { useT } from "./LocaleProvider";

// Validate persisted artifacts against the current schema so results saved under an
// older schema show a regenerate prompt instead of crashing the render. Partial:
// "kit" renders inside the validation report (KillTestKit), never through this path.
const SCHEMAS: Partial<Record<ArtifactKind, ZodType>> = {
  validation: ValidationSchema,
};
function isCurrent(kind: ArtifactKind, data: unknown): boolean {
  return SCHEMAS[kind]?.safeParse(data).success ?? false;
}

const VIEWS: Partial<Record<ArtifactKind, React.ComponentType<{ d: never }>>> = {
  validation: ValidationView as never,
};

// extra: view-specific props beyond the data (e.g. the evidence corpus for validation).
function renderView(kind: ArtifactKind, data: unknown, extra?: Record<string, unknown>) {
  const View = VIEWS[kind];
  if (!View) return null;
  return <View d={data as never} {...(extra as object)} />;
}

// Catches render errors (e.g. an artifact saved under an older schema) so a stale
// result shows a regenerate prompt instead of white-screening the page.
class ArtifactBoundary extends React.Component<
  { children: React.ReactNode; onRegenerate?: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-warn/30 bg-warn/10 p-6 text-sm">
          <div className="font-medium text-warn">
            This result is from an older format and can’t be displayed.
          </div>
          <div className="mt-1 text-muted">Regenerate it to see the upgraded report.</div>
          {this.props.onRegenerate && (
            <button
              onClick={this.props.onRegenerate}
              className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent"
            >
              Regenerate
            </button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

function StaleNotice({ onRegenerate }: { onRegenerate?: () => void }) {
  return (
    <div className="rounded-xl border border-warn/30 bg-warn/10 p-6 text-sm">
      <div className="font-medium text-warn">
        This result was generated under an older format.
      </div>
      <div className="mt-1 text-muted">Regenerate it to see the upgraded report.</div>
      {onRegenerate && (
        <button
          onClick={onRegenerate}
          className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent"
        >
          Regenerate
        </button>
      )}
    </div>
  );
}

// Render an artifact only if it matches the current schema; otherwise prompt a regenerate.
function SafeArtifact({
  kind,
  data,
  onRegenerate,
  extra,
}: {
  kind: ArtifactKind;
  data: unknown;
  onRegenerate?: () => void;
  extra?: Record<string, unknown>;
}) {
  // safeParse of a ~21KB artifact is expensive; memoize it on the data object's identity
  // so it doesn't re-run on every unrelated keystroke/log re-render of the workspace.
  const current = React.useMemo(() => isCurrent(kind, data), [kind, data]);
  if (!current) return <StaleNotice onRegenerate={onRegenerate} />;
  return <ArtifactBoundary onRegenerate={onRegenerate}>{renderView(kind, data, extra)}</ArtifactBoundary>;
}

// Score colors follow the GOAL's verdict bands (lib/scoring.ts) — a 70 is green for a
// side hustle but only amber for a venture bet.
const scoreColor = (n: number, b: { go: number; maybe: number }) =>
  n >= b.go ? "var(--color-good)" : n >= b.maybe ? "var(--color-warn)" : "var(--color-bad)";

const GOAL_OPTIONS = [
  { key: "lifestyle", label: "Lifestyle / replace my job" },
  { key: "side_hustle", label: "Side hustle" },
  { key: "venture", label: "Venture-scale / raise" },
  { key: "unsure", label: "Not sure yet" },
];
const goalLabel = (k: string | null) =>
  GOAL_OPTIONS.find((o) => o.key === k)?.label ?? "Not set";

/** Goal chips + detail — shared by variant-creation panels (manual, AI, re-validate). */
function VariantGoalFields({
  goalDraft,
  setGoalDraft,
  goalDetailDraft,
  setGoalDetailDraft,
  className = "",
}: {
  goalDraft: string;
  setGoalDraft: (g: string) => void;
  goalDetailDraft: string;
  setGoalDetailDraft: (g: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-1 text-xs font-medium text-muted">
        Goal for this version{" "}
        <span className="font-normal text-muted/70">— changes how the next score is judged</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {GOAL_OPTIONS.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => setGoalDraft(o.key)}
            className={`rounded-md border px-2 py-1 text-xs transition ${
              goalDraft === o.key
                ? "border-accent bg-accent/15 text-accent"
                : "border-border text-muted hover:text-fg"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
      <input
        value={goalDetailDraft}
        onChange={(e) => setGoalDetailDraft(e.target.value)}
        placeholder="Optional: time, effort & budget — e.g. “nights & weekends, bootstrap only”"
        className="mt-1.5 w-full rounded-md border border-border bg-panel px-2 py-1.5 text-sm outline-none placeholder:text-muted focus:border-accent"
      />
    </div>
  );
}

// One row of a wedge-tournament result: the variant version + what it scored on the
// SAME pinned corpus as every other entrant (fair comparison), or the error if its
// validation failed (a failed entrant never sinks the tournament).
type WedgeResult = {
  proposal: WedgeProposal;
  versionId: string;
  n: number;
  score: number | null;
  revenue: string;
  verdict: string;
  error?: string;
};

// The journey: a single validation stage. Each stage groups artifact kinds.
type StageKey = "validate";
const STAGES: {
  key: StageKey;
  kinds: ArtifactKind[];
}[] = [{ key: "validate", kinds: ["validation"] }];
type ArtMap = Record<string, Record<string, Artifact>>;
const bk = (vid: string, kind: string) => `${vid}:${kind}`;

// A small dropdown — folds related actions under one trigger so the control row
// reads as a few clear choices instead of a wall of same-weight buttons.
type MenuItem = { label: string; hint?: string; onClick: () => void; disabled?: boolean; danger?: boolean };
function DropMenu({
  trigger,
  items,
  tone = "default",
  align = "left",
  caret = true,
  disabled,
  label,
}: {
  trigger: React.ReactNode;
  items: MenuItem[];
  tone?: "default" | "accent" | "accent2";
  align?: "left" | "right";
  caret?: boolean;
  disabled?: boolean;
  /** Accessible name when the visible trigger is icon-only. */
  label?: string;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const MENU_W = 256; // w-64

  const place = () => {
    const btn = btnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const gap = 4;
    const menuH = menuRef.current?.offsetHeight ?? items.length * 56;
    const spaceBelow = window.innerHeight - r.bottom - gap;
    const spaceAbove = r.top - gap;
    const openUp = spaceBelow < menuH && spaceAbove > spaceBelow;
    let left =
      align === "right" ? r.right - MENU_W : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - MENU_W - 8));
    const top = openUp
      ? Math.max(8, r.top - gap - menuH)
      : Math.min(r.bottom + gap, window.innerHeight - 8);
    setPos({ top, left, width: MENU_W });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    place();
    // Second pass once the menu is measured so flip-above is accurate.
    requestAnimationFrame(place);
    const onReposition = () => place();
    window.addEventListener("resize", onReposition);
    // Capture scroll on any ancestor — fixed menus stay put otherwise.
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- place reads live DOM; re-run on open/align only
  }, [open, align, items.length]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toneCls =
    tone === "accent"
      ? "border-accent/30 text-accent hover:bg-accent/10"
      : tone === "accent2"
        ? "border-accent2/30 text-accent2 hover:bg-accent2/10"
        : "border-border text-muted hover:text-fg";

  const menu =
    open &&
    pos &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menuRef}
        role="menu"
        aria-label={label ?? t("common.moreActions")}
        style={{ position: "fixed", top: pos.top, left: pos.left, width: pos.width, zIndex: 80 }}
        className="overflow-hidden rounded-xl border border-border bg-panel shadow-2xl shadow-[#1a1612]/12"
      >
        {items.map((it, i) => (
          <button
            key={i}
            type="button"
            role="menuitem"
            disabled={it.disabled}
            onClick={() => {
              setOpen(false);
              it.onClick();
              btnRef.current?.focus();
            }}
            className={`flex w-full flex-col items-start gap-0.5 border-b border-border/60 px-3 py-2 text-left transition last:border-0 disabled:opacity-40 ${
              it.danger ? "text-bad hover:bg-bad/10" : "hover:bg-panel2"
            }`}
          >
            <span className="text-sm font-medium">{it.label}</span>
            {it.hint && <span className="text-xs text-muted">{it.hint}</span>}
          </button>
        ))}
      </div>,
      document.body
    );

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition disabled:opacity-50 ${toneCls}`}
      >
        {trigger}
        {caret && (
          <span className={`text-[10px] transition ${open ? "rotate-180" : ""}`} aria-hidden>
            ▾
          </span>
        )}
      </button>
      {menu}
    </div>
  );
}

export default function IdeaWorkspace({
  idea,
  versions: versionsProp,
  artifactsByVersion,
  evidenceByVersion,
  meta,
  initialStage,
  initialScoreDistribution,
  scoringSamples,
}: {
  idea: Idea;
  versions: Version[];
  artifactsByVersion: Record<string, Artifact[]>;
  evidenceByVersion: Record<string, EvidenceCorpus>;
  meta: GeneratorMeta[];
  initialStage: string;
  /** All non-archived version scores across every idea — the active version's score is
   * ranked against this for a percentile (rendered in ValidationView). */
  initialScoreDistribution: number[];
  /** Active k for self-consistency scoring (env SCORING_SAMPLES) — resolved server-side
   * and passed through so HowScored documents the real value without a hydration mismatch. */
  scoringSamples: number;
}) {
  const router = useRouter();
  const t = useT();
  const [evidence, setEvidence] = useState<Record<string, EvidenceCorpus>>(evidenceByVersion);
  const [refreshingEvidence, setRefreshingEvidence] = useState(false);

  const [versions, setVersions] = useState<Version[]>(versionsProp);
  const [scoreDistribution, setScoreDistribution] = useState<number[]>(initialScoreDistribution);
  const [artifacts, setArtifacts] = useState<ArtMap>(() => {
    const m: ArtMap = {};
    for (const [vid, arr] of Object.entries(artifactsByVersion)) {
      m[vid] = Object.fromEntries(arr.map((a) => [a.kind, a]));
    }
    return m;
  });
  const [activeVersionId, setActiveVersionId] = useState<string>(
    () => versionsProp[versionsProp.length - 1]?.id ?? ""
  );
  // initialStage is the raw ?stage= param (or the persisted column) — sanitize it
  // so an old launch-kit URL or a typo can't crash the render.
  const [currentStage, setCurrentStage] = useState<StageKey>(() =>
    STAGES.some((s) => s.key === initialStage) ? (initialStage as StageKey) : "validate"
  );

  // Unified compare: score axis (ArenaBoard) + statements + per-criterion Δ
  const [comparingVariants, setComparingVariants] = useState(false);

  // Campaign-pass billing state (null until loaded; enabled=false → no paywall ever).
  type BillingState = {
    enabled: boolean;
    paid: boolean;
    runsUsed: number;
    runCap: number;
    remaining?: number;
    priceCents: number;
    allowed: boolean;
    unlocked?: boolean;
    canScore?: boolean;
    code?: string;
    reason?: string;
  };
  const [billing, setBilling] = useState<BillingState | null>(null);
  const locked = !!billing && billing.enabled && !billing.paid;
  const remaining =
    billing && billing.enabled && billing.paid
      ? typeof billing.remaining === "number"
        ? billing.remaining
        : Math.max(0, billing.runCap - billing.runsUsed)
      : null;
  const exhausted =
    !!billing &&
    billing.enabled &&
    billing.paid &&
    (billing.canScore === false || (remaining !== null && remaining <= 0));
  const low =
    !!billing &&
    billing.enabled &&
    billing.paid &&
    !exhausted &&
    remaining !== null &&
    remaining <= 2;
  /** Block full analyses only — chat / kit / intel stay available when exhausted. */
  const scoreBlocked = locked || exhausted;
  const [scoreConfirm, setScoreConfirm] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);
  /** Post-checkout value confirmation (not an error). */
  const [campaignNotice, setCampaignNotice] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false); // reveal archived versions in the switcher
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // keep the workspace in sync with the URL (?stage=) driven by the left nav, and
  // persist the stage so the nav dot and reopening the idea reflect where you are.
  const lastSavedStage = useRef(idea.stage);
  useEffect(() => {
    if (!STAGES.some((x) => x.key === initialStage)) return;
    setCurrentStage(initialStage as StageKey);
    if (lastSavedStage.current !== initialStage) {
      lastSavedStage.current = initialStage;
      patchIdea({ stage: initialStage });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStage]);

  // panels — Ask (chat) vs New version (composer). Composer modes share one surface so
  // founders don't hunt across Improve / Discuss / Respond / Refine.
  type ComposerMode = "write" | "suggest" | "context" | "advanced";
  const [composerMode, setComposerMode] = useState<ComposerMode | null>(null);
  const [draft, setDraft] = useState("");
  const [proposal, setProposal] = useState<Refinement | null>(null);
  const [proposalDraft, setProposalDraft] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [responseDraft, setResponseDraft] = useState("");
  const [chatting, setChatting] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ role: string; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);
  // ≥lg the Ask chat renders as a sticky side panel (own scroll) beside the report;
  // below lg it stays an inline block. One instance either way (matchMedia, not CSS
  // show/hide) so the input/scroll refs always point at the mounted panel.
  const [deskChat, setDeskChat] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setDeskChat(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  const composerRef = useRef<HTMLDivElement>(null);

  // Changing stage via the left nav (URL) should close any transient panels that
  // were opened on the previous stage.
  useEffect(() => {
    setProposal(null);
    setChatting(false);
    setComposerMode(null);
    setEditingGoal(false);
  }, [initialStage]);

  function closeComposer() {
    setComposerMode(null);
    setProposal(null);
    setSuggesting(false);
  }

  function openComposer(mode: ComposerMode, opts?: { contextSeed?: string }) {
    setChatting(false);
    setEditingGoal(false);
    setProposal(null);
    resetGoalDrafts();
    setDraft(activeVersion.statement);
    setResponseDraft(opts?.contextSeed ?? "");
    setComposerMode(mode);
    requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    if (mode === "suggest") void runSuggest();
  }

  async function openChat() {
    closeComposer();
    setChatting(true);
    try {
      const res = await fetch(`/api/versions/${activeVersionId}/ask`);
      const msgs = await res.json();
      if (Array.isArray(msgs))
        setChatMessages(msgs.map((m: { role: string; text: string }) => ({ role: m.role, text: m.text })));
    } catch {
      /* ignore */
    }
    requestAnimationFrame(() => chatInputRef.current?.focus());
  }

  /** Promote the last user chat turn (or free text) into a New version · context draft. */
  function promoteChatToVersion(text?: string) {
    const seed =
      text?.trim() ||
      [...chatMessages].reverse().find((m) => m.role === "user")?.text ||
      chatInput.trim();
    if (!seed) {
      openComposer("context");
      return;
    }
    setChatting(false);
    openComposer("context", { contextSeed: seed });
  }

  // Keep the thread scrolled to the latest message / thinking indicator.
  useEffect(() => {
    if (!chatting) return;
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chatMessages, chatLoading, chatting]);

  async function sendQuestionText(raw: string) {
    const q = raw.trim();
    if (!q || chatLoading) return;
    setChatInput("");
    if (chatInputRef.current) chatInputRef.current.style.height = "auto";
    setChatMessages((p) => [...p, { role: "user", text: q }]);
    setChatLoading(true);
    try {
      const res = await fetch(`/api/versions/${activeVersionId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not answer");
      setChatMessages((p) => [...p, { role: "assistant", text: j.answer }]);
    } catch (e) {
      setChatMessages((p) => [
        ...p,
        { role: "assistant", text: `(error: ${e instanceof Error ? e.message : "failed"})` },
      ]);
    } finally {
      setChatLoading(false);
      requestAnimationFrame(() => chatInputRef.current?.focus());
    }
  }

  async function sendQuestion() {
    return sendQuestionText(chatInput);
  }
  const [goalBucket, setGoalBucket] = useState(idea.goal ?? "unsure");
  const [goalDetail, setGoalDetail] = useState(idea.goal_detail ?? "");
  const [editingGoal, setEditingGoal] = useState(false);
  // Editor drafts — browsing the goal chips must not re-judge stored scores against
  // new bands (only Save commits, and only regeneration re-scores).
  const [goalDraft, setGoalDraft] = useState(goalBucket);
  const [goalDetailDraft, setGoalDetailDraft] = useState(goalDetail);
  // The verdict bands the scores are judged by — per-goal (lib/scoring.ts).
  const goalBands = verdictBands(goalBucket);

  function openGoalEditor() {
    setGoalDraft(goalBucket);
    setGoalDetailDraft(goalDetail);
    setEditingGoal(true);
  }

  /** Seed goal drafts from the committed idea values (call when opening a variant editor). */
  function resetGoalDrafts() {
    setGoalDraft(goalBucket);
    setGoalDetailDraft(goalDetail);
  }

  /** Persist goal drafts if they differ from the committed idea. Used when saving a variant. */
  async function persistGoalIfChanged(): Promise<void> {
    if (goalDraft === goalBucket && (goalDetailDraft || "") === (goalDetail || "")) return;
    const res = await fetch(`/api/ideas/${idea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: goalDraft, goalDetail: goalDetailDraft }),
    });
    if (!res.ok) throw new Error("Could not save goal");
    setGoalBucket(goalDraft);
    setGoalDetail(goalDetailDraft);
  }

  async function saveGoal() {
    try {
      await persistGoalIfChanged();
      setEditingGoal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save goal");
    }
  }

  function patchIdea(fields: Record<string, unknown>) {
    fetch(`/api/ideas/${idea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    }).catch(() => {});
  }

  // auto-iterate
  const [iterating, setIterating] = useState(false);
  const [target, setTarget] = useState(80);
  const [maxRounds, setMaxRounds] = useState(5);
  const [iterLog, setIterLog] = useState<string[]>([]);
  const [iterBest, setIterBest] = useState<{ id: string; n: number; score: number } | null>(null);

  // wedge tournament (divergent variants validated head-to-head on the pinned corpus)
  const [wedgeSet, setWedgeSet] = useState<WedgeSet | null>(null);
  const [wedgeSelected, setWedgeSelected] = useState<Set<number>>(new Set());
  const [wedgeFetching, setWedgeFetching] = useState(false);
  const [wedgeRunning, setWedgeRunning] = useState(false);
  const [wedgeLog, setWedgeLog] = useState<string[]>([]);
  const [wedgeResults, setWedgeResults] = useState<WedgeResult[] | null>(null);
  const [wedgeBaseline, setWedgeBaseline] = useState<{ id: string; n: number; score: number } | null>(null);
  /** Per-entrant live status while the tournament runs (queued → creating → validating → done/failed). */
  const [wedgeEntrants, setWedgeEntrants] = useState<
    { label: string; status: "queued" | "creating" | "validating" | "done" | "failed"; detail?: string }[]
  >([]);
  // Sticky failure message inside the panel so a failed draft isn't only an error
  // toast buried under the report.
  const [wedgeError, setWedgeError] = useState<string | null>(null);
  // Anchor for scroll-into-view when Improve idea → Wedge tournament starts (the panel
  // used to live below the fold with only a faint pulse line, so the disabled button
  // was the only visible feedback).
  const wedgePanelRef = useRef<HTMLDivElement>(null);
  const wedgeLogRef = useRef<HTMLPreElement>(null);

  // Archived versions (cleanup hid them) stay in `versions` for state sync but are
  // filtered out of every user-facing list: the switcher, compare, and the
  // best-score star. The active version is always shown even if it were archived
  // (defensive — the archive guards never archive what you're viewing).
  const visibleVersions = versions.filter((v) => !v.archived || v.id === activeVersionId);
  // Archived-and-not-active: revealed behind the "show archived (N)" affordance, each
  // with an unarchive control.
  const archivedVersions = versions.filter((v) => v.archived && v.id !== activeVersionId);
  const activeVersion = versions.find((v) => v.id === activeVersionId) ?? visibleVersions[0] ?? versions[0];
  const activeArtifacts = artifacts[activeVersionId] ?? {};
  const bestScore = Math.max(...visibleVersions.map((v) => v.score ?? -1));
  // Where the active version's score sits in the cross-idea population — rendered as a
  // percentile badge in ValidationView. Withheld (null) below 8 scored versions: a
  // "90th percentile of 3" is noise, not a signal, so the badge simply doesn't show.
  const PERCENTILE_MIN_POP = 8;
  const activePercentile =
    scoreDistribution.length >= PERCENTILE_MIN_POP
      ? percentileOf(activeVersion?.score ?? null, scoreDistribution)
      : null;
  const anyBusy = busy.size > 0 || iterating || wedgeFetching || wedgeRunning;

  function setBusyKey(key: string, on: boolean) {
    setBusy((b) => {
      const n = new Set(b);
      if (on) n.add(key);
      else n.delete(key);
      return n;
    });
  }

  function switchVersion(id: string) {
    setActiveVersionId(id);
    closeComposer();
    setChatting(false);
    setChatMessages([]);
  }

  function ingestBilling(payload: { billing?: BillingState }) {
    if (payload.billing) setBilling(payload.billing);
  }

  /** Gate full analyses: hard-stop when locked/exhausted; confirm when low on included depth. */
  function requestScore(
    action: () => void | Promise<void>,
    opts?: { runsNeeded?: number }
  ) {
    if (locked) {
      setError("Unlock this idea’s campaign to run a full analysis.");
      return;
    }
    if (exhausted) {
      setError(
        billing?.reason ??
          "You’ve finished the full analyses included in this campaign. Chat and your report stay open."
      );
      return;
    }
    const needed = opts?.runsNeeded ?? 1;
    if (
      billing?.enabled &&
      billing.paid &&
      remaining !== null &&
      remaining <= 2
    ) {
      if (needed > remaining) {
        setError(
          `This needs ${needed} full analysis${needed === 1 ? "" : "es"}, and ${remaining} remain in this campaign. Try fewer angles, or start a new idea when you’re testing something different.`
        );
        return;
      }
      const after = remaining - needed;
      setScoreConfirm({
        title:
          needed > 1
            ? `Run ${needed} full analyses?`
            : "Run a full analysis?",
        body:
          needed > 1
            ? `This uses ${needed} of the ${remaining} full analyses remaining in your campaign (${after} after). Best after a real change to the idea or evidence — asking questions never uses one.`
            : `You have ${remaining} full analysis${remaining === 1 ? "" : "es"} remaining in this campaign. Best used after a real change to the idea or evidence — chat stays unlimited.`,
        confirmLabel: needed > 1 ? `Run ${needed} analyses →` : "Run analysis →",
        onConfirm: () => {
          setScoreConfirm(null);
          void action();
        },
      });
      return;
    }
    void action();
  }

  async function generate(
    kind: ArtifactKind,
    versionId: string,
    steer?: string,
    // Wave 3: opt into deep mode (bull/bear/reconcile + CoVe, ~3-4× cost) and/or the
    // second-family audit judge. Both default off — a plain generate is unchanged.
    extra?: { deep?: boolean; audit?: boolean }
  ): Promise<Artifact> {
    setError(null);
    setBusyKey(bk(versionId, kind), true);
    try {
      const res = await fetch(`/api/generate/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId, steer, deep: extra?.deep, audit: extra?.audit }),
      });
      const json = await res.json();
      ingestBilling(json);
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      const art = json as Artifact;
      setArtifacts((prev) => ({ ...prev, [versionId]: { ...(prev[versionId] ?? {}), [kind]: art } }));
      if (kind === "validation") {
        const dv = art.data as { score?: number; demand?: { obtainable_revenue?: string } };
        setVersions((prev) =>
          prev.map((v) =>
            v.id === versionId
              ? {
                  ...v,
                  score: typeof dv?.score === "number" ? Math.round(dv.score) : v.score,
                  revenue: dv?.demand?.obtainable_revenue ?? v.revenue,
                }
              : v
          )
        );
        // Optimistic run tally; refreshArtifacts will reconcile from the server.
        setBilling((b) =>
          b && b.enabled && b.paid
            ? {
                ...b,
                runsUsed: b.runsUsed + 1,
                remaining:
                  typeof b.remaining === "number"
                    ? Math.max(0, b.remaining - 1)
                    : Math.max(0, b.runCap - b.runsUsed - 1),
                canScore:
                  (typeof b.remaining === "number"
                    ? b.remaining - 1
                    : b.runCap - b.runsUsed - 1) > 0,
                allowed:
                  (typeof b.remaining === "number"
                    ? b.remaining - 1
                    : b.runCap - b.runsUsed - 1) > 0,
              }
            : b
        );
      }
      return art;
    } finally {
      setBusyKey(bk(versionId, kind), false);
    }
  }

  // --- background jobs: a long analysis survives leaving the page ------------
  const mountedRef = useRef(true);
  const pollingRef = useRef<Set<string>>(new Set());

  // Pull the latest artifacts/versions from the server (after a job finishes).
  // throws on failure so the caller (pollJob) can surface it instead of leaving a blank.
  async function refreshArtifacts() {
    const j = await (await fetch(`/api/ideas/${idea.id}`)).json();
    if (j.artifactsByVersion) {
      const m: ArtMap = {};
      for (const [vid, arr] of Object.entries(j.artifactsByVersion as Record<string, Artifact[]>)) {
        m[vid] = Object.fromEntries(arr.map((a) => [a.kind, a]));
      }
      setArtifacts(m);
    }
    if (Array.isArray(j.versions)) setVersions(j.versions);
    if (j.evidenceByVersion) setEvidence(j.evidenceByVersion);
    if (Array.isArray(j.scoreDistribution)) setScoreDistribution(j.scoreDistribution);
    if (j.billing) setBilling(j.billing);
  }

  // Start Stripe Checkout for this idea's campaign pass and redirect to it.
  async function startCheckout() {
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId: idea.id }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not start checkout");
      window.location.href = j.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout");
    }
  }

  // Re-collect the fetched Reddit/HN corpus for the active version (the report's
  // demand signals only update on the next validation run, which cites the new ids).
  async function refreshEvidence() {
    setError(null);
    setRefreshingEvidence(true);
    try {
      const res = await fetch(`/api/versions/${activeVersionId}/evidence`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Evidence collection failed");
      setEvidence((prev) => ({ ...prev, [activeVersionId]: j as EvidenceCorpus }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evidence collection failed");
    } finally {
      setRefreshingEvidence(false);
    }
  }

  // Poll a running job until it finishes, then load the result (or surface the error).
  function pollJob(versionId: string, kind: ArtifactKind) {
    const key = bk(versionId, kind);
    if (pollingRef.current.has(key)) return;
    pollingRef.current.add(key);
    setBusyKey(key, true);
    let attempts = 0;
    const tick = async () => {
      if (!mountedRef.current) return;
      let job: { status?: string; error?: string } | null = null;
      try {
        job = (await (await fetch(`/api/generate/${kind}?versionId=${versionId}`)).json()).job;
      } catch {
        /* network hiccup — retry */
      }
      if (!mountedRef.current) return;
      // give up after ~6 min of polling (the analysis runs ~1-2 min; this guards a
      // server that died mid-job so we don't spin forever)
      if (job && job.status === "running" && attempts++ < 90) {
        setTimeout(tick, 4000);
        return;
      }
      pollingRef.current.delete(key);
      if (job?.status === "error") {
        setBusyKey(key, false);
        setError(job.error ?? "Analysis failed");
        return;
      }
      try {
        await refreshArtifacts(); // load the result first, then drop the spinner (no flash)
      } catch {
        setError("The analysis finished but couldn't load — refresh the page.");
      }
      setBusyKey(key, false);
    };
    setTimeout(tick, 2500);
  }

  // Fire validation once when the idea has never been scored (e.g. just created from
  // "Validate idea →" on the home form). Avoids a second screen of duplicate Validate CTAs.
  const autoValidateStarted = useRef(false);

  // On mount, resume any job that's still running on the server (e.g. you navigated
  // away and came back), so the progress + result show up without re-running.
  useEffect(() => {
    mountedRef.current = true;
    fetch(`/api/ideas/${idea.id}`)
      .then((r) => r.json())
      .then((j) => {
        if (Array.isArray(j.runningJobs))
          for (const job of j.runningJobs) pollJob(job.version_id, job.kind as ArtifactKind);
        if (j.billing) setBilling(j.billing);

        // No stored validation + no job already running → start the grounded pass now.
        const activeId =
          versionsProp[versionsProp.length - 1]?.id ?? activeVersionId;
        const hasStoredValidation = !!(
          artifacts[activeId]?.validation ||
          artifactsByVersion[activeId]?.some((a) => a.kind === "validation")
        );
        const validationRunning = Array.isArray(j.runningJobs)
          ? j.runningJobs.some(
              (job: { version_id: string; kind: string }) =>
                job.kind === "validation" && job.version_id === activeId
            )
          : false;
        const paywalled = !!(j.billing?.enabled && !j.billing?.paid);
        const outOfRuns =
          !!(j.billing?.enabled && j.billing?.paid && j.billing?.canScore === false);
        if (
          !autoValidateStarted.current &&
          !hasStoredValidation &&
          !validationRunning &&
          !paywalled &&
          !outOfRuns &&
          activeId
        ) {
          autoValidateStarted.current = true;
          setError(null);
          fetch(`/api/generate/validation`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ versionId: activeId, background: true, deep: false }),
          })
            .then(async (res) => {
              const body = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(body.error ?? "Could not start the analysis");
              if (mountedRef.current) pollJob(activeId, "validation");
            })
            .catch((e) => {
              if (mountedRef.current)
                setError(e instanceof Error ? e.message : "Could not start the analysis");
              autoValidateStarted.current = false; // allow manual retry
            });
        }
      })
      .catch(() => {});

    // Returning from Stripe Checkout: verify the session SERVER-side (the query param
    // alone proves nothing), then reload billing state and clean the URL.
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (params.get("checkout") === "success" && sessionId) {
      const cleanUrl = () => window.history.replaceState({}, "", window.location.pathname);
      fetch("/api/billing/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })
        .then(async (r) => {
          const j = await r.json().catch(() => ({}));
          if (j.paid) {
            if (j.billing) setBilling(j.billing);
            await refreshArtifacts().catch(() => {});
            const cap =
              typeof j.billing?.runCap === "number"
                ? j.billing.runCap
                : 10;
            setCampaignNotice(t("workspace.noticeUnlocked", { n: cap }));
            setError(null);
            cleanUrl(); // unlocked — safe to drop the session id
          } else if (r.status >= 400 && r.status < 500) {
            // definitive client error (bad/foreign session) — surface it, stop retrying
            setError(j.error ?? "Payment could not be confirmed.");
            cleanUrl();
          } else {
            // not-yet-paid or a 5xx/transient — KEEP ?session_id= so a reload retries
            setCampaignNotice(
              "Payment received — finishing unlock. Reload if this doesn’t clear in a moment."
            );
          }
        })
        .catch(() => {
          // network failure: leave the session id in the URL so a reload retries confirm
          setError(
            "Payment went through, but confirmation didn’t reach us. Reload this page to finish unlocking."
          );
        });
    } else if (params.get("checkout") === "cancelled") {
      window.history.replaceState({}, "", window.location.pathname);
    }

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea.id]);

  // One button → the single comprehensive analysis (verdict + market + money + plan),
  // run as a detached background job so navigating away can't interrupt it.
  async function runValidate(deep = false) {
    requestScore(async () => {
      setError(null);
      const v = activeVersionId;
      try {
        const res = await fetch(`/api/generate/validation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Wave 3: deep mode (bull/bear/reconcile + CoVe + audit, ~3-4× cost) runs as the
          // same detached background job as a standard run — the poller loads the result.
          body: JSON.stringify({ versionId: v, background: true, deep }),
        });
        const j = await res.json();
        ingestBilling(j);
        if (!res.ok) throw new Error(j.error ?? "Could not start the analysis");
        // Cap increments server-side only after the job succeeds; poll → refreshArtifacts.
        pollJob(v, "validation");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start the analysis");
      }
    });
  }

  async function createVersionFrom(
    statement: string,
    origin: "manual" | "ai" | "context",
    parentId: string,
    label?: string,
    rationale?: string,
    context?: string
  ): Promise<Version> {
    const res = await fetch("/api/versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ideaId: idea.id, statement, origin, parentId, label, rationale, context }),
    });
    const v = await res.json();
    if (!res.ok) throw new Error(v.error ?? "Could not create version");
    setVersions((prev) => [...prev, v as Version]);
    return v as Version;
  }

  // --- respond to the validator (add context / push back, then re-validate) ---
  async function respondToValidator() {
    const text = responseDraft.trim();
    if (text.length < 4) return;
    requestScore(async () => {
      setError(null);
      try {
        await persistGoalIfChanged();
        const v = await createVersionFrom(
          activeVersion.statement,
          "context",
          activeVersionId,
          "Responded to validator",
          text,
          text
        );
        setResponseDraft("");
        closeComposer();
        switchVersion(v.id);
        await generate("validation", v.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not re-validate");
      }
    });
  }

  // --- re-validate positioned around a suggested alpha ------------------------
  async function revalidateWithAlpha(alpha: string, rationale: string) {
    requestScore(async () => {
      setError(null);
      try {
        // Merge the alpha INTO the statement so the new version's evidence queries target
        // the pivot (evidence is generated from the statement, not the founder context).
        const mergedStatement = `${activeVersion.statement}\n\nAngle: ${alpha} — ${rationale}`;
        const v = await createVersionFrom(
          mergedStatement,
          "context",
          activeVersionId,
          `Alpha: ${alpha}`,
          `Pursuing this alpha: ${alpha}`,
          `The founder wants to pursue this specific alpha / differentiator: "${alpha}". ${rationale} Re-evaluate the idea positioned around this alpha — its effect on competition, demand, obtainable revenue, and the verdict.`
        );
        switchVersion(v.id);
        await generate("validation", v.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not re-validate");
      }
    });
  }

  // --- manual refine (New version · write) ------------------------------------
  async function saveManual(andValidate = true) {
    if (draft.trim().length < 8) return;
    const go = async () => {
      setError(null);
      try {
        await persistGoalIfChanged();
        const v = await createVersionFrom(draft.trim(), "manual", activeVersionId);
        closeComposer();
        switchVersion(v.id);
        if (andValidate) await generate("validation", v.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not create version");
      }
    };
    if (andValidate) requestScore(go);
    else void go();
  }

  // --- AI suggest (New version · suggest) -------------------------------------
  async function runSuggest() {
    setSuggesting(true);
    setProposal(null);
    setError(null);
    try {
      const res = await fetch(`/api/versions/${activeVersionId}/refine`, { method: "POST" });
      const p = await res.json();
      if (!res.ok) throw new Error(p.error ?? "Refinement failed");
      setProposal(p as Refinement);
      setProposalDraft((p as Refinement).statement);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Refinement failed");
    } finally {
      setSuggesting(false);
    }
  }
  async function acceptProposal() {
    if (!proposal) return;
    requestScore(async () => {
      setError(null);
      try {
        await persistGoalIfChanged();
        const v = await createVersionFrom(
          proposalDraft.trim() || proposal.statement,
          "ai",
          activeVersionId,
          proposal.label,
          proposal.rationale
        );
        closeComposer();
        switchVersion(v.id);
        await generate("validation", v.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not accept proposal");
      }
    });
  }

  // --- kill-test execution kit ---------------------------------------------------
  const [generatingKit, setGeneratingKit] = useState(false);
  async function generateKit() {
    setError(null);
    setGeneratingKit(true);
    try {
      const res = await fetch(`/api/versions/${activeVersionId}/kit`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Kit generation failed");
      const art = j as Artifact;
      setArtifacts((prev) => ({ ...prev, [activeVersionId]: { ...(prev[activeVersionId] ?? {}), kit: art } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kit generation failed");
    } finally {
      setGeneratingKit(false);
    }
  }

  // --- market intel (cited competitor facts + one-liner) --------------------------
  const [generatingIntel, setGeneratingIntel] = useState(false);
  async function generateIntel() {
    setError(null);
    setGeneratingIntel(true);
    try {
      const res = await fetch(`/api/versions/${activeVersionId}/intel`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Intel generation failed");
      const art = j as Artifact;
      setArtifacts((prev) => ({ ...prev, [activeVersionId]: { ...(prev[activeVersionId] ?? {}), intel: art } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Intel generation failed");
    } finally {
      setGeneratingIntel(false);
    }
  }

  // --- kill-test result: record → system-judged outcome → revalidate --------------
  const [recordingResult, setRecordingResult] = useState(false);
  async function recordResult(report: string) {
    setError(null);
    setRecordingResult(true);
    try {
      const res = await fetch(`/api/versions/${activeVersionId}/test-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ report }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not record the result");
      const art = j as Artifact;
      setArtifacts((prev) => ({ ...prev, [activeVersionId]: { ...(prev[activeVersionId] ?? {}), test_result: art } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not record the result");
    } finally {
      setRecordingResult(false);
    }
  }

  // Close the loop: the judged real-world outcome becomes founder context on a new
  // version, and the same honest engine re-scores. Nothing is hand-adjusted.
  async function revalidateWithResult() {
    const tr = activeArtifacts.test_result?.data as
      | { outcome?: string; reasoning?: string; report?: string }
      | undefined;
    const nt = (activeArtifacts.validation?.data as { next_test?: { cheapest_test?: string; pass_threshold?: string; kill_threshold?: string } } | undefined)?.next_test;
    if (!tr?.outcome) return;
    requestScore(async () => {
      setError(null);
      try {
        const outcome = tr.outcome!.toUpperCase();
        const context =
          `The founder RAN the pre-registered kill-test. Test: ${nt?.cheapest_test ?? ""}. ` +
          `PASS bar: ${nt?.pass_threshold ?? ""}. KILL bar: ${nt?.kill_threshold ?? ""}. ` +
          `Reported result: "${tr.report ?? ""}". System-judged outcome against the bars: ${outcome}` +
          `${tr.reasoning ? ` (${tr.reasoning})` : ""}. ` +
          `Weigh this real-world result heavily when re-scoring the criteria it bears on — it is behavioral evidence from the actual buyer, not opinion.`;
        const v = await createVersionFrom(
          activeVersion.statement,
          "context",
          activeVersionId,
          `Test result: ${outcome}`,
          `Kill-test ${outcome.toLowerCase()} recorded and re-scored`,
          context
        );
        switchVersion(v.id);
        await generate("validation", v.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not re-validate");
      }
    });
  }

  // --- wedge tournament ---------------------------------------------------------
  // Fan-out counterpart to the auto-iterate hill-climb: propose 3-5 DIVERGENT wedge
  // variants, validate the selected ones head-to-head on the SAME pinned corpus, and
  // show a side-by-side so the founder adopts the angle that actually scores best.
  async function exploreWedges() {
    setError(null);
    setWedgeError(null);
    closeComposer();
    setChatting(false);
    setWedgeResults(null);
    setWedgeLog([]);
    setWedgeEntrants([]);
    setWedgeBaseline(null);
    setWedgeSet(null);
    setWedgeFetching(true);
    try {
      const res = await fetch(`/api/versions/${activeVersionId}/wedges`, { method: "POST" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Wedge proposal failed");
      const set = j as WedgeSet;
      setWedgeSet(set);
      setWedgeSelected(new Set(set.wedges.map((_, i) => i)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Wedge proposal failed";
      setWedgeError(msg);
      setError(msg);
    } finally {
      setWedgeFetching(false);
    }
  }

  // Keep the tournament panel on-screen for the whole busy window — fetching proposals
  // and the parallel validation pass both take long enough that a disabled button alone
  // reads as a hang. Prefer `start` so we don't leave the user staring at the alpha
  // card's subdued CTA at the bottom of the report.
  useEffect(() => {
    if (!wedgeFetching && !wedgeRunning) return;
    const id = requestAnimationFrame(() => {
      wedgePanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => cancelAnimationFrame(id);
  }, [wedgeFetching, wedgeRunning]);

  // Keep the live log tail visible while the tournament runs.
  useEffect(() => {
    if (!wedgeRunning || wedgeLog.length === 0) return;
    wedgeLogRef.current?.scrollTo({ top: wedgeLogRef.current.scrollHeight, behavior: "smooth" });
  }, [wedgeLog, wedgeRunning]);

  async function runWedgeTournament() {
    if (!wedgeSet) return;
    const entrants = wedgeSet.wedges.filter((_, i) => wedgeSelected.has(i));
    if (!entrants.length) return;
    // Baseline + each entrant is a scoring run
    const runsNeeded = entrants.length + 1;
    if (scoreBlocked) {
      setError(
        exhausted
          ? (billing?.reason ??
              "This campaign’s full analyses are complete — chat and your report stay open.")
          : "Unlock this idea’s campaign to compare angles head-to-head."
      );
      return;
    }
    if (remaining !== null && runsNeeded > remaining) {
      setError(
        `Comparing these angles needs about ${runsNeeded} full analyses (baseline + ${entrants.length}). ${remaining} remain in this campaign — select fewer angles, or start a new idea for a fresh campaign.`
      );
      return;
    }
    if (remaining !== null && remaining <= 2) {
      requestScore(() => void executeWedgeTournament(entrants), { runsNeeded });
      return;
    }
    await executeWedgeTournament(entrants);
  }

  async function executeWedgeTournament(entrants: WedgeProposal[]) {
    if (!wedgeSet) return;
    setWedgeRunning(true);
    setError(null);
    const log = (m: string) => setWedgeLog((prev) => [...prev, m]);
    setWedgeLog([]);
    setWedgeEntrants(entrants.map((p) => ({ label: p.wedge, status: "queued" as const })));
    const patchEntrant = (
      i: number,
      patch: Partial<{ status: "queued" | "creating" | "validating" | "done" | "failed"; detail: string }>
    ) =>
      setWedgeEntrants((prev) => prev.map((e, j) => (j === i ? { ...e, ...patch } : e)));
    const scoreOf = (a: Artifact) => Math.round((a.data as { score?: number })?.score ?? 0);
    try {
      const baseId = activeVersionId;
      const baseN = activeVersion.n;

      // Baseline: every entrant is compared against the CURRENT version on the same
      // corpus, so the baseline needs a score too.
      let baseScore = activeVersion.score ?? 0;
      if (!artifacts[baseId]?.validation) {
        log(`Scoring baseline v${baseN} first…`);
        baseScore = scoreOf(await generate("validation", baseId));
      }
      setWedgeBaseline({ id: baseId, n: baseN, score: baseScore });
      log(`Baseline v${baseN}: ${baseScore}/100. Running ${entrants.length} wedge${entrants.length === 1 ? "" : "s"} on the same evidence…`);

      // Create the variant versions sequentially (cheap, keeps version numbers tidy);
      // each child pins the baseline's corpus server-side, so scores compare fairly.
      const created: { proposal: WedgeProposal; v: Version; idx: number }[] = [];
      for (let i = 0; i < entrants.length; i++) {
        const p = entrants[i];
        patchEntrant(i, { status: "creating" });
        const v = await createVersionFrom(p.statement, "ai", baseId, p.label, p.rationale);
        created.push({ proposal: p, v, idx: i });
        patchEntrant(i, { status: "queued", detail: `v${v.n}` });
        log(`→ v${v.n} "${p.wedge}"`);
      }

      // Validate ALL entrants in parallel — the tournament's wall-clock is one
      // validation, not N. A failed entrant records its error and stays in the table.
      log(`Validating ${created.length} variants in parallel…`);
      for (const { idx, v } of created) {
        patchEntrant(idx, { status: "validating", detail: `v${v.n}` });
      }
      const results = await Promise.all(
        created.map(async ({ proposal, v, idx }): Promise<WedgeResult> => {
          try {
            const art = await generate("validation", v.id);
            const d = art.data as {
              score?: number;
              verdict?: string;
              demand?: { obtainable_revenue?: string };
            };
            const score = typeof d?.score === "number" ? Math.round(d.score) : null;
            patchEntrant(idx, {
              status: "done",
              detail: score != null ? `v${v.n} · ${score}/100` : `v${v.n}`,
            });
            return {
              proposal,
              versionId: v.id,
              n: v.n,
              score,
              revenue: d?.demand?.obtainable_revenue ?? "",
              verdict: d?.verdict ?? "",
            };
          } catch (e) {
            const err = e instanceof Error ? e.message : "validation failed";
            patchEntrant(idx, { status: "failed", detail: err });
            return {
              proposal,
              versionId: v.id,
              n: v.n,
              score: null,
              revenue: "",
              verdict: "",
              error: err,
            };
          }
        })
      );

      const ranked = results
        .slice()
        .sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
      const margin = acceptanceMargin();
      for (const r of ranked) {
        log(
          r.error
            ? `v${r.n} "${r.proposal.wedge}": failed — ${r.error}`
            : `v${r.n} "${r.proposal.wedge}": ${r.score}/100 (${(r.score ?? 0) >= baseScore + margin ? `beats baseline by ≥${margin} — clears the noise margin` : (r.score ?? 0) > baseScore ? `+${(r.score ?? 0) - baseScore}, within the ±${margin} noise margin` : `${(r.score ?? 0) - baseScore} vs baseline`})`
        );
      }
      setWedgeResults(ranked);
      log("Tournament done — adopt a winner below, or keep exploring.");
    } catch (e) {
      const m = e instanceof Error ? e.message : "Tournament failed";
      setError(m);
      setWedgeLog((prev) => [...prev, `Stopped: ${m}`]);
    } finally {
      setWedgeRunning(false);
    }
  }

  // Adopt one entrant: switch to it and archive the losing tournament versions (they
  // survive archived — history intact, switcher legible). Baseline is never archived.
  async function adoptWedge(versionId: string) {
    if (!wedgeResults) return;
    const losers = wedgeResults.filter((r) => r.versionId !== versionId);
    // Archive the losers in PARALLEL — the "Adopt" click shouldn't stall for the sum of
    // N round-trips (it froze visibly once network latency was real).
    const archived = await Promise.all(
      losers.map((l) =>
        fetch(`/api/versions/${l.versionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: true }),
        })
          .then((res) => (res.ok ? l.versionId : null))
          .catch(() => null)
      )
    );
    const ok = new Set(archived.filter(Boolean));
    if (ok.size) setVersions((prev) => prev.map((v) => (ok.has(v.id) ? { ...v, archived: 1 } : v)));
    setWedgeSet(null);
    setWedgeResults(null);
    setWedgeLog([]);
    switchVersion(versionId);
  }

  // --- auto-iterate -----------------------------------------------------------
  async function autoIterate() {
    if (scoreBlocked) {
      setError(
        exhausted
          ? (billing?.reason ??
              "This campaign’s full analyses are complete. Chat and your report stay open.")
          : "Unlock this idea’s campaign to auto-iterate."
      );
      return;
    }
    if (remaining !== null && remaining < 2) {
      setError(
        `${remaining === 1 ? "One full analysis remains" : "No full analyses remain"} in this campaign — use a single re-score (or start a new idea) instead of auto-iterate.`
      );
      return;
    }
    requestScore(async () => {
      await executeAutoIterate();
    }, { runsNeeded: Math.min(maxRounds + 1, remaining ?? maxRounds + 1) });
  }

  async function executeAutoIterate() {
    setIterating(true);
    setError(null);
    closeComposer();
    const log = (m: string) => setIterLog((prev) => [...prev, m]);
    setIterLog([]);
    const scoreOf = (a: Artifact) => Math.round((a.data as { score?: number })?.score ?? 0);
    const revOf = (a: Artifact) =>
      (a.data as { demand?: { obtainable_revenue?: string } })?.demand?.obtainable_revenue ?? "";
    try {
      const curId = activeVersionId;
      const curN = activeVersion.n;
      let curScore = activeVersion.score ?? 0;

      if (!artifacts[curId]?.validation) {
        log(`Validating v${curN}…`);
        curScore = scoreOf(await generate("validation", curId));
      }
      let bestId = curId;
      let bestN = curN;
      let best = curScore;
      // Accepting a new best requires clearing the measured run-to-run scoring noise —
      // otherwise the hill-climb just harvests lucky re-rolls (lib/scoring.ts).
      const margin = acceptanceMargin();
      log(`Baseline v${curN}: ${curScore}/100. Acceptance margin: +${margin} (beats scoring noise).`);

      // Greedy hill-climb: always refine from the BEST version so far, so a
      // regression in one round doesn't trap the search at a worse statement.
      // Child versions inherit the parent's evidence corpus (pinned server-side),
      // so scores are compared on CONSTANT evidence.
      for (let r = 1; r <= maxRounds; r++) {
        if (best >= target) {
          log(`✓ Target ${target} reached at v${bestN} (${best}).`);
          break;
        }
        log(`Round ${r}/${maxRounds}: refining best so far (v${bestN}, ${best})…`);
        const pRes = await fetch(`/api/versions/${bestId}/refine`, { method: "POST" });
        const prop = await pRes.json();
        if (!pRes.ok) throw new Error(prop.error ?? "Refinement failed");
        const v = await createVersionFrom(prop.statement, "ai", bestId, prop.label, prop.rationale);
        setActiveVersionId(v.id);
        // Every 3rd round runs the cheap second-family audit judge alongside the
        // scoring pass — a held-out Goodhart check on the loop (surfaced, never averaged).
        const auditRound = r % 3 === 0;
        log(`→ v${v.n} "${prop.label}". Validating${auditRound ? " (+ cross-family audit)" : ""}…`);
        const val = await generate("validation", v.id, undefined, auditRound ? { audit: true } : undefined);
        if (auditRound) {
          const flagged = (val.data as { audit?: { flagged?: string[] } })?.audit?.flagged ?? [];
          if (flagged.length) {
            log(`  ⚠ audit judge diverged >15 on: ${flagged.join(", ")} — treat those bands as contested.`);
          } else {
            log(`  audit judge agreed within 15 pts on every criterion.`);
          }
        }
        const newScore = scoreOf(val);
        const newRev = revOf(val);
        const accepted = newScore >= best + margin;
        log(
          `v${v.n}: ${newScore}/100${newRev ? ` · forecast ${newRev}` : ""}${
            accepted
              ? "  ← new best"
              : newScore > best
                ? `  (+${newScore - best}, within the ±${margin} noise margin — not accepted)`
                : ""
          }`
        );
        if (accepted) {
          best = newScore;
          bestId = v.id;
          bestN = v.n;
        }
      }

      // Fresh-corpus confirmation: the loop compared versions on the PINNED corpus;
      // before accepting the champion, re-collect evidence and re-validate once,
      // adopting the more conservative of the two scores.
      if (bestId !== curId) {
        log(`Confirming v${bestN} on fresh evidence (the loop held the corpus constant)…`);
        try {
          const eres = await fetch(`/api/versions/${bestId}/evidence`, { method: "POST" });
          const ej = await eres.json();
          if (!eres.ok) throw new Error(ej.error ?? "Evidence collection failed");
          setEvidence((prev) => ({ ...prev, [bestId]: ej as EvidenceCorpus }));
          // The champion-confirmation run is DEEP (bull/bear/reconcile + CoVe + audit) —
          // the winner earns the ~3-4× spend once, on fresh evidence.
          const confirmScore = scoreOf(await generate("validation", bestId, undefined, { deep: true }));
          const adopted = Math.min(best, confirmScore);
          log(
            confirmScore < best
              ? `Confirmation run: ${confirmScore}/100 — the pinned-corpus score didn't fully hold; adopting ${adopted}.`
              : `Confirmation run: ${confirmScore}/100 — holds up; adopting ${adopted} (min of the two runs).`
          );
          // The confirmation run persisted ITS score on the version row; when it
          // rolled higher than the pinned run, write the conservative min back so
          // chips/compare/home match what the loop actually adopted.
          if (confirmScore > adopted) {
            await fetch(`/api/versions/${bestId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ score: adopted }),
            }).catch(() => {});
            setVersions((prev) =>
              prev.map((v) => (v.id === bestId ? { ...v, score: adopted } : v))
            );
          }
          best = adopted;
        } catch (e) {
          log(
            `Fresh-evidence confirmation failed (${
              e instanceof Error ? e.message : "error"
            }) — keeping the pinned-corpus score ${best}, UNCONFIRMED on fresh evidence.`
          );
        }
      }
      log(`Done. Best version: v${bestN} at ${best}/100.`);
      switchVersion(bestId);
      setIterBest({ id: bestId, n: bestN, score: best });
    } catch (e) {
      const m = e instanceof Error ? e.message : "Iteration failed";
      setError(m);
      setIterLog((prev) => [...prev, `Stopped: ${m}`]);
    } finally {
      setIterating(false);
    }
  }

  // After auto-iterate, ARCHIVE the intermediate AI versions (keep the original, the
  // best, and whatever you're viewing) so the switcher stays legible — the rows and
  // their artifacts survive (archived, not deleted), so the history and the cross-idea
  // score distribution stay intact but hidden from the lists.
  async function cleanupVersions() {
    if (!iterBest) return;
    const archivable = versions.filter(
      (v) =>
        !v.archived &&
        v.origin === "ai" &&
        v.n !== 1 &&
        v.id !== iterBest.id &&
        v.id !== activeVersionId
    );
    const archivedIds = new Set<string>();
    for (const v of archivable) {
      const res = await fetch(`/api/versions/${v.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archived: true }),
      });
      if (res.ok) archivedIds.add(v.id);
    }
    if (archivedIds.size) {
      setVersions((prev) =>
        prev.map((v) => (archivedIds.has(v.id) ? { ...v, archived: 1 } : v))
      );
    }
    setIterBest(null);
  }

  // Un-archive a hidden version — brings it back into the switcher/compare lists.
  async function unarchiveVersion(id: string) {
    const res = await fetch(`/api/versions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: false }),
    });
    if (res.ok) {
      setVersions((prev) => prev.map((v) => (v.id === id ? { ...v, archived: 0 } : v)));
    }
  }

  async function remove() {
    if (!confirm("Delete this idea, all versions and artifacts?")) return;
    await fetch(`/api/ideas/${idea.id}`, { method: "DELETE" });
    router.push("/studio");
  }

  // Prefer a schema-valid Validation for typed UI (WhyThisScore, etc.); fall back to a
  // partial cast so older/stale shapes still drive the lighter masthead chrome.
  // Memoize: full-schema safeParse of a ~21KB artifact is not free.
  const activeValidation: Validation | null = React.useMemo(() => {
    if (!activeArtifacts.validation) return null;
    const parsed = ValidationSchema.safeParse(activeArtifacts.validation.data);
    return parsed.success ? parsed.data : null;
  }, [activeArtifacts.validation]);
  const activeValidationData = (activeValidation ??
    (activeArtifacts.validation?.data as
      | {
          clarifying_questions?: string[];
          possible_alphas?: { alpha: string; rationale: string }[];
          verdict?: string;
          score?: number;
          confidence?: number;
          demand?: { obtainable_revenue?: string };
          next_test?: { riskiest_assumption?: string; pivotal_criterion?: string };
        }
      | undefined)) as
    | {
        clarifying_questions?: string[];
        possible_alphas?: { alpha: string; rationale: string }[];
        verdict?: string;
        score?: number;
        confidence?: number;
        demand?: { obtainable_revenue?: string };
        next_test?: { riskiest_assumption?: string; pivotal_criterion?: string };
        summary?: string;
      }
    | undefined
    | null;
  const activeQuestions = activeValidationData?.clarifying_questions ?? [];
  const activeAlphas = activeValidationData?.possible_alphas ?? [];
  const stage = STAGES.find((s) => s.key === currentStage) ?? STAGES[0];
  const hasValidate = !!activeArtifacts.validation;

  // ---- campaign state (the loop made visible above the report) -----------------
  const activeOutcome = (activeArtifacts.test_result?.data as { outcome?: string } | undefined)?.outcome;
  const testStatus = activeOutcome
    ? activeOutcome.toUpperCase()
    : activeArtifacts.kit
      ? "KIT READY"
      : "NOT RUN";
  const bestOther = visibleVersions
    .filter((v) => v.id !== activeVersionId && v.score != null)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
  const showBestOther = !!bestOther && (bestOther.score ?? 0) > (activeVersion?.score ?? -1);
  // Score bands for the active artifact (goal it was scored under), so chrome can't
  // recolor a stale number after a mid-flight goal edit.
  const decisionBands = verdictBands(activeValidation?.goal_scored ?? goalBucket);
  const decisionScore =
    typeof activeValidationData?.score === "number" ? Math.round(activeValidationData.score) : null;
  const decisionColor =
    decisionScore != null ? scoreColor(decisionScore, decisionBands) : "var(--color-muted)";

  // One primary next-move — not always the kill-test kit. Weak scores need a better
  // framing first; only promote "prep interviews" when the idea is close enough that
  // real-world evidence (not more rewriting) is the bottleneck.
  type NextMove = {
    label: string;
    hint: string;
    href?: string;
    onClick?: () => void;
    busy?: boolean;
    /** True when this action burns a full scoring run. */
    costsScore?: boolean;
    /** Alternate path shown under the CTA when primary is iterate vs test. */
    alt?: { label: string; detail: string; onClick: () => void };
  };

  const topDragName = (() => {
    if (!activeValidation || !Array.isArray(activeValidation.criteria)) return null;
    const drags = [...activeValidation.criteria]
      .filter((c) => typeof c.score === "number" && c.score < 72)
      .sort((a, b) => (a.score ?? 0) - (b.score ?? 0));
    return (drags[0]?.name as string | undefined) ?? null;
  })();

  const kitMove = (ready: boolean): NextMove =>
    ready
      ? {
          label: t("workspaceExtra.openInterviewKit"),
          hint: "Script, outreach copy, and pass/kill tally for the kill-test above — run it this week, then record the result.",
          href: "#next-test",
        }
      : {
          label: generatingKit
            ? t("workspaceExtra.writingKit")
            : t("workspaceExtra.prepInterviews"),
          hint: "Turns the kill-test above into questions, outreach, and green/red signals — so you can talk to buyers, not just re-score the pitch.",
          onClick: generateKit,
          busy: generatingKit,
        };

  const campaignNextMove: NextMove = (() => {
    const verdict = activeValidation?.verdict;

    // Pipeline steps that override shaping/testing once you're in them.
    if (activeOutcome) {
      return {
        label: t("workspaceExtra.rescoreWithTest"),
        hint: "Feed the real-world kill-test outcome back into a new validation pass.",
        onClick: revalidateWithResult,
        costsScore: true,
      };
    }
    if (activeArtifacts.kit) return kitMove(true);
    if (verdict === "GO") {
      return {
        label: t("workspaceExtra.seeBuildPlan"),
        hint: "GO unlocked the plan section — milestones and next build steps.",
        href: "#plan",
      };
    }
    if (verdict === "INSUFFICIENT EVIDENCE") {
      return {
        label: t("workspaceExtra.reRunAnalysisCta"),
        hint: "Confidence was too low to grade. A fresh grounded pass may pick up more signal.",
        onClick: () => runValidate(),
        costsScore: true,
      };
    }

    const score = decisionScore ?? 0;
    // Within ~8 of GO → field evidence is the bottleneck; kit is primary.
    const nearGo = score >= decisionBands.go - 8;
    // NO-GO or barely MAYBE → reshape the idea first.
    const weak = verdict === "NO-GO" || score < decisionBands.maybe + 10;

    const sharpen = (): NextMove => ({
      label: t("workspaceExtra.sharpenVersion"),
      hint: topDragName
        ? t("workspaceExtra.biggestDrag", { name: topDragName })
        : t("workspaceExtra.sharpenHintDefault"),
      onClick: () => openComposer("suggest"),
      alt: {
        label: t("workspaceExtra.orPrepInterviews"),
        detail: t("workspaceExtra.orPrepInterviewsDetail"),
        onClick: generateKit,
      },
    });
    const rewrite = (): NextMove => ({
      label: activeAlphas.length
        ? t("workspaceExtra.compareEdges")
        : t("workspaceExtra.rewriteIdea"),
      hint: topDragName
        ? `Weak on “${topDragName}”. ${activeAlphas.length ? "Run angles head-to-head on the same evidence." : "Change the framing, then re-score."}`
        : activeAlphas.length
          ? "This framing is weak. Compare divergent angles on the same evidence."
          : "This framing is weak. Rewrite the statement, then re-score.",
      onClick: () => (activeAlphas.length ? exploreWedges() : openComposer("write")),
      alt: {
        label: t("workspaceExtra.orPrepInterviews"),
        detail: t("workspaceExtra.orPrepInterviewsDetail"),
        onClick: generateKit,
      },
    });

    if (weak) return rewrite();
    if (nearGo) {
      // Close to GO: prove the kill-test assumption in the real world.
      return {
        ...kitMove(false),
        alt: {
          label: t("workspaceExtra.orAddContext"),
          detail: t("workspaceExtra.orAddContextDetail"),
          onClick: () => openComposer("context"),
        },
      };
    }
    // Mid-MAYBE: improve the idea; kit stays available as alternate.
    return sharpen();
  })();

  // Primary needs a scoring run (not kit / plan / composer).
  const scoringPrimary =
    !!campaignNextMove.costsScore || campaignNextMove.onClick === revalidateWithResult;

  // Alt path under the decision card (only when primary isn't already that action).
  const iterateHint = campaignNextMove.alt
    ? {
        label: campaignNextMove.alt.label,
        detail: campaignNextMove.alt.detail,
        onClick: campaignNextMove.alt.onClick,
      }
    : null;

  // Ask panel body — rendered exactly once, either inline (below lg) or inside the
  // sticky desktop aside. `desktop` only changes how the message list sizes: inline
  // caps at max-h-80; the aside lets it flex-grow to fill the panel.
  const chatPanel = (desktop: boolean) => (
    <>
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-display text-base font-bold text-accent2">
            {t("workspace.askTitle")}
          </div>
          <span className="rounded-full border border-accent2/30 bg-accent2/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent2">
            {t("workspaceExtra.askNoRescore")}
          </span>
        </div>
        <button onClick={() => setChatting(false)} className="text-xs text-muted hover:text-fg">
          {t("common.close")}
        </button>
      </div>
      <p className="mb-2 text-xs text-muted">
        {t("workspaceExtra.askBlurb", { n: activeVersion.n })}{" "}
        <button
          type="button"
          onClick={() => promoteChatToVersion()}
          className="font-medium text-accent2 underline-offset-2 hover:underline"
        >
          {t("workspaceExtra.turnIntoVersion")}
        </button>
        .
      </p>
      <div
        className={`space-y-3 overflow-auto rounded-lg bg-bg/40 p-3 ${
          desktop ? "min-h-0 flex-1" : "max-h-80"
        }`}
      >
        {chatMessages.length === 0 && (
          <div className="flex flex-wrap gap-1.5">
            {[
              t("workspaceExtra.chatWhyScore"),
              t("workspaceExtra.chatMoveToGo"),
              t("workspaceExtra.chatCompetitiveFair"),
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void sendQuestionText(q)}
                className="rounded-full border border-border bg-panel2 px-2.5 py-1 text-xs text-muted hover:border-accent2/40 hover:text-fg"
              >
                {q}
              </button>
            ))}
          </div>
        )}
        {chatMessages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <div
              className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-left text-sm leading-relaxed ${
                m.role === "user"
                  ? "whitespace-pre-wrap bg-accent text-on-accent"
                  : "bg-panel2 text-fg/90"
              }`}
            >
              {m.role === "assistant" ? (
                <MarkdownText
                  text={m.text}
                  className="space-y-2 text-sm leading-relaxed text-fg/90 [&_strong]:text-fg"
                />
              ) : (
                m.text
              )}
            </div>
            {m.role === "user" && (
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() => promoteChatToVersion(m.text)}
                  className="text-[11px] text-muted hover:text-accent2"
                >
                  {t("workspaceExtra.useAsVersionContext")}
                </button>
              </div>
            )}
          </div>
        ))}
        {chatLoading && (
          <div className="animate-pulse text-xs text-muted">{t("workspaceExtra.thinking")}</div>
        )}
        <div ref={chatEndRef} />
      </div>
      <div className="mt-2 flex items-end gap-2">
        <textarea
          ref={chatInputRef}
          value={chatInput}
          rows={2}
          onChange={(e) => {
            setChatInput(e.target.value);
            const el = e.target;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendQuestion();
            }
          }}
          placeholder={t("workspaceExtra.messagePlaceholder")}
          className="max-h-32 min-h-[2.5rem] flex-1 resize-none overflow-y-auto rounded-lg border border-border bg-panel2 px-3 py-2 text-sm outline-none focus:border-accent2"
        />
        <button
          onClick={sendQuestion}
          disabled={chatLoading || !chatInput.trim()}
          className="shrink-0 rounded-lg bg-accent2 px-4 py-2 text-sm font-medium text-on-accent disabled:opacity-50"
        >
          {t("workspaceExtra.send")}
        </button>
      </div>
    </>
  );

  return (
    <div>
      <div className="no-print">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-accent2">
              {t("workspace.ideaEyebrow")}
            </p>
            <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
              {stage.key === "validate"
                ? t("workspace.stageValidate")
                : stage.key}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted">
              {stage.key === "validate"
                ? t("workspace.stageValidateBlurb")
                : null}
            </p>
          </div>
        </div>

        <div className="mb-4">
          <AnglesPicker
            versions={visibleVersions}
            activeId={activeVersionId}
            bestScore={bestScore}
            scoreColor={(n) => scoreColor(n, goalBands)}
            busyIds={busy}
            onSelect={switchVersion}
            onCompareVariants={
              visibleVersions.length > 1 ? () => setComparingVariants((c) => !c) : undefined
            }
            comparingVariants={comparingVariants}
            archivedCount={archivedVersions.length}
            showArchived={showArchived}
            onToggleArchived={() => setShowArchived((s) => !s)}
          />
        </div>

        {/* Compare variants: score axis first, then statements + per-criterion Δ */}
        {comparingVariants && visibleVersions.length > 1 && (
          <div className="mb-5 space-y-3">
            <ArenaBoard
              versions={versions}
              artifacts={artifacts}
              activeId={activeVersionId}
              margin={acceptanceMargin()}
              scoreColor={(n) => scoreColor(n, goalBands)}
              onView={(id) => switchVersion(id)}
              onArchive={async (id) => {
                const res = await fetch(`/api/versions/${id}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ archived: true }),
                }).catch(() => null);
                if (res?.ok) setVersions((prev) => prev.map((v) => (v.id === id ? { ...v, archived: 1 } : v)));
              }}
              onRestore={unarchiveVersion}
            />

            <div className="overflow-x-auto rounded-xl border border-border bg-panel">
              <div className="border-b border-border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                Statements
              </div>
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-3 py-2 font-medium">Version</th>
                    <th className="px-3 py-2 font-medium">Score</th>
                    <th className="px-3 py-2 font-medium">Revenue/yr</th>
                    <th className="px-3 py-2 font-medium">Statement</th>
                    <th className="px-3 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleVersions.map((v) => {
                    const val = artifacts[v.id]?.validation?.data as { verdict?: string } | undefined;
                    return (
                      <tr
                        key={v.id}
                        className={`border-b border-border/60 last:border-0 ${
                          v.id === activeVersionId ? "bg-panel2/50" : ""
                        }`}
                      >
                        <td className="px-3 py-2 align-top">
                          <span className="font-mono font-semibold">v{v.n}</span>
                          {v.score != null && v.score === bestScore && (
                            <span className="ml-1" title="best">
                              ★
                            </span>
                          )}
                          <div className="text-[11px] text-muted">{v.label ?? v.origin}</div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          {v.score != null ? (
                            <span
                              className="font-mono font-bold"
                              style={{ color: scoreColor(v.score, goalBands) }}
                            >
                              {v.score}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                          {val?.verdict && (
                            <div className="text-[11px] text-muted">
                              {verdictLabel(val.verdict, t)}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 align-top font-mono text-xs text-accent2">
                          {v.revenue ?? "—"}
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-muted">
                          <span className="line-clamp-3">{v.statement}</span>
                        </td>
                        <td className="px-3 py-2 align-top">
                          {v.id !== activeVersionId && (
                            <button
                              onClick={() => switchVersion(v.id)}
                              className="rounded-md border border-border px-2 py-1 text-xs hover:bg-panel2"
                            >
                              View
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {(() => {
                const deltaVersions: DeltaVersion[] = visibleVersions
                  .map((v): DeltaVersion | null => {
                    const val = artifacts[v.id]?.validation?.data as Validation | undefined;
                    if (!val?.criteria?.length) return null;
                    const criteria: Record<string, number> = {};
                    for (const c of val.criteria) criteria[c.name] = c.score;
                    return { id: v.id, n: v.n, label: v.label, criteria };
                  })
                  .filter((x): x is DeltaVersion => x !== null);
                return <CriteriaDeltaTable versions={deltaVersions} />;
              })()}
            </div>
          </div>
        )}

        {/* archived versions — hidden by default; each can be viewed or restored */}
        {showArchived && archivedVersions.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border/70 bg-panel/30 px-3 py-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Archived</span>
            {archivedVersions.map((v) => (
              <span
                key={v.id}
                className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-panel2/50 px-2.5 py-1 text-sm text-muted"
              >
                <button
                  onClick={() => switchVersion(v.id)}
                  className="flex items-center gap-1.5 hover:text-fg"
                  title={v.label ?? v.statement}
                >
                  <span className="font-mono font-semibold">v{v.n}</span>
                  {v.score != null ? (
                    <span className="font-mono font-bold" style={{ color: scoreColor(v.score, goalBands) }}>
                      {v.score}
                    </span>
                  ) : (
                    <span className="text-xs">—</span>
                  )}
                </button>
                <button
                  onClick={() => unarchiveVersion(v.id)}
                  className="rounded border border-border/70 px-1.5 py-px font-mono text-[10px] uppercase tracking-wide text-accent2 hover:bg-accent2/10"
                  title="Restore this version to the switcher"
                >
                  ⤴ restore
                </button>
              </span>
            ))}
          </div>
        )}

        {/* ≥lg with Ask open: two columns — the report flow left, a sticky chat aside right
            that scrolls independently. Otherwise a plain single-column flow. */}
        <div
          className={
            chatting && deskChat
              ? "lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(20rem,23rem)] lg:items-start lg:gap-6"
              : ""
          }
        >
          <div className="min-w-0">
        {/* ONE decision surface — score, why, open question, primary CTA. No peer cards. */}
        {hasValidate && activeValidation && decisionScore != null ? (
          <DecisionCard
            d={activeValidation}
            bands={decisionBands}
            color={decisionColor}
            goal={activeValidation.goal_scored ?? goalBucket}
            title={idea.title}
            statement={activeVersion.statement}
            versionLabel={`v${activeVersion.n}`}
            versionN={activeVersion.n}
            variantCount={visibleVersions.length}
            rationale={
              activeVersion.rationale
                ? `${activeVersion.label ? `${activeVersion.label}: ` : ""}${activeVersion.rationale}`
                : null
            }
            goalLabel={
              goalBucket === "lifestyle"
                ? t("studio.goalLifestyle")
                : goalBucket === "side_hustle"
                  ? t("studio.goalSideHustle")
                  : goalBucket === "venture"
                    ? t("studio.goalVenture")
                    : goalBucket === "unsure"
                      ? t("studio.goalUnsure")
                      : goalLabel(goalBucket)
            }
            goalDetail={goalDetail || null}
            testStatus={testStatus}
            primary={{
              label:
                exhausted && scoringPrimary
                  ? t("workspace.noScoringPrimary")
                  : campaignNextMove.label,
              href: exhausted && scoringPrimary ? undefined : campaignNextMove.href,
              onClick:
                exhausted && scoringPrimary ? undefined : campaignNextMove.onClick,
            }}
            primaryBusy={!!campaignNextMove.busy || busy.has(bk(activeVersionId, "validation"))}
            primaryDisabled={
              anyBusy ||
              locked ||
              !!campaignNextMove.busy ||
              (exhausted && scoringPrimary)
            }
            primaryHint={
              exhausted && scoringPrimary
                ? t("workspace.scoringHintExhausted")
                : campaignNextMove.hint
            }
            secondary={
              <>
                <button
                  type="button"
                  disabled={anyBusy}
                  onClick={() => (chatting ? setChatting(false) : openChat())}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition disabled:opacity-50 ${
                    chatting
                      ? "border-accent2/50 bg-accent2/15 text-accent2"
                      : "border-border text-muted hover:border-accent/30 hover:text-fg"
                  }`}
                  title="Conversational Q&A about this report — does not create a version or re-score"
                >
                  {t("workspaceExtra.ask")}
                  <span className="hidden font-mono text-[10px] uppercase tracking-wide text-muted sm:inline">
                    {t("workspaceExtra.noRescoreHint")}
                  </span>
                </button>
                <button
                  type="button"
                  disabled={anyBusy || locked /* new versions ok when exhausted; validate gated later */}
                  onClick={() =>
                    composerMode ? closeComposer() : openComposer("write")
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition disabled:opacity-50 ${
                    composerMode
                      ? "border-accent/50 bg-accent/15 text-accent2"
                      : "border-border text-muted hover:border-accent/30 hover:text-fg"
                  }`}
                  title="Create a new version — edit, sharpen, add context, or run advanced modes"
                >
                  {(wedgeFetching || wedgeRunning || iterating || suggesting) && (
                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                  )}
                  {wedgeFetching
                    ? t("workspaceExtra.draftingAngles")
                    : wedgeRunning
                      ? t("workspaceExtra.tournamentShort")
                      : iterating
                        ? t("workspaceExtra.climbing")
                        : suggesting
                          ? t("workspaceExtra.draftingShort")
                          : t("workspace.newVersion")}
                  {!wedgeFetching && !wedgeRunning && !iterating && !suggesting && (
                    <span className="hidden font-mono text-[10px] uppercase tracking-wide text-muted sm:inline">
                      {t("workspaceExtra.runOnce")}
                    </span>
                  )}
                </button>
                {showBestOther && bestOther && (
                  <button
                    type="button"
                    onClick={() => switchVersion(bestOther.id)}
                    className="text-xs text-muted hover:text-fg"
                    title={bestOther.label ?? bestOther.statement}
                  >
                    {t("workspaceExtra.bestVersion", {
                      n: bestOther.n,
                      score: bestOther.score ?? "—",
                    })}
                  </button>
                )}
                <div className="ml-auto">
                  <DropMenu
                    trigger={<span aria-hidden className="px-0.5 text-base leading-none">⋯</span>}
                    label={t("common.moreActions")}
                    align="right"
                    caret={false}
                    items={[
                      {
                        label: "⎙ Download PDF",
                        onClick: () => {
                          const a = document.createElement("a");
                          a.href = `/api/versions/${activeVersionId}/pdf`;
                          a.download = "";
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                        },
                      },
                      {
                        label: `◆ ${t("workspaceExtra.deepValidation")}`,
                        hint: exhausted
                          ? "Campaign analyses complete — chat still open."
                          : "Slower deep pass · uses one full analysis.",
                        onClick: () => runValidate(true),
                        disabled: anyBusy || scoreBlocked,
                      },
                      {
                        label: exhausted
                          ? "⟳ Analyses complete"
                          : `⟳ ${t("workspaceExtra.reRunAnalysis")}`,
                        onClick: () => runValidate(),
                        disabled: anyBusy || scoreBlocked,
                      },
                      {
                        label: "✎ New version (edit statement)",
                        onClick: () => openComposer("write"),
                      },
                      {
                        label: "✎ Edit goal only",
                        onClick: openGoalEditor,
                      },
                      { label: t("workspaceExtra.deleteIdea"), danger: true, onClick: remove },
                    ]}
                  />
                </div>
              </>
            }
            ideaExtras={
              editingGoal ? (
                <div className="mt-3 rounded-lg border border-border bg-panel2 p-2">
                  <VariantGoalFields
                    goalDraft={goalDraft}
                    setGoalDraft={setGoalDraft}
                    goalDetailDraft={goalDetailDraft}
                    setGoalDetailDraft={setGoalDetailDraft}
                  />
                  <div className="mt-1.5 flex items-center gap-2">
                    <button onClick={saveGoal} className="rounded-md bg-accent px-2 py-1 text-xs font-medium text-on-accent">
                      Save
                    </button>
                    <button
                      onClick={() => setEditingGoal(false)}
                      className="rounded-md border border-border px-2 py-1 text-xs hover:bg-panel"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null
            }
          />
        ) : (
          /* not yet validated — idea + ONE path (auto-start usually already running) */
          <div className="folio mb-5 p-5">
            <h1 className="font-display text-lg font-bold tracking-tight">{idea.title}</h1>
            <p className="mt-1 text-sm text-muted line-clamp-3">{activeVersion.statement}</p>
            {busy.has(bk(activeVersionId, "validation")) ? (
              <p className="mt-3 font-mono text-xs uppercase tracking-wide text-accent2">
                {t("workspaceExtra.startingAnalysis")}
              </p>
            ) : (
              <button
                onClick={() => runValidate()}
                disabled={anyBusy || scoreBlocked}
                className="mt-3 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-on-accent disabled:opacity-50"
              >
                {locked
                  ? t("workspace.unlockToValidate")
                  : exhausted
                    ? t("workspace.analysesComplete")
                    : t("workspace.validateThis")}
              </button>
            )}
          </div>
        )}

        {/* wedge tournament progress */}
        {(wedgeFetching || wedgeSet || wedgeError) && (
          <div
            ref={wedgePanelRef}
            className="mb-5 scroll-mt-4 rounded-xl border border-accent/40 bg-accent/5 p-4 shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent)_12%,transparent)]"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-accent">
                {(wedgeFetching || wedgeRunning) && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                )}
                🧭 Wedge tournament
                {wedgeFetching && (
                  <span className="font-mono text-[11px] font-normal uppercase tracking-wide text-accent2">
                    drafting…
                  </span>
                )}
                {wedgeRunning && (
                  <span className="font-mono text-[11px] font-normal uppercase tracking-wide text-accent2">
                    running…
                  </span>
                )}
              </div>
              {!wedgeRunning && !wedgeFetching && (
                <button
                  onClick={() => {
                    setWedgeSet(null);
                    setWedgeResults(null);
                    setWedgeLog([]);
                    setWedgeEntrants([]);
                    setWedgeError(null);
                  }}
                  className="text-xs text-muted hover:text-fg"
                >
                  close
                </button>
              )}
            </div>

            {wedgeError && !wedgeFetching && !wedgeSet && (
              <div className="mt-3 rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-sm text-bad">
                {wedgeError}
                <button
                  onClick={() => {
                    setWedgeError(null);
                    void exploreWedges();
                  }}
                  className="ml-3 font-medium text-accent underline-offset-2 hover:underline"
                >
                  Retry
                </button>
              </div>
            )}

            {wedgeFetching && (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-fg/90">
                  Drafting 3–5 divergent angles from the evidence…
                </p>
                <ul className="space-y-2 text-sm">
                  {[
                    "Reading the validation & evidence corpus",
                    "Finding alternate ICPs, wedges & positionings",
                    "Writing tournament entrants",
                  ].map((step, i) => (
                    <li key={step} className="flex items-center gap-2.5">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          i === 0
                            ? "animate-pulse bg-accent"
                            : "bg-border"
                        }`}
                      />
                      <span className={i === 0 ? "text-fg" : "text-muted/70"}>{step}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted">
                  Usually 15–40 seconds. Other actions stay disabled until proposals are ready.
                </p>
              </div>
            )}

            {/* phase 1: pick entrants (idle) or live progress (running) */}
            {wedgeSet && !wedgeResults && !wedgeFetching && (
              <>
                {wedgeRunning ? (
                  <div className="mt-2 space-y-3">
                    <div className="flex items-start gap-3 rounded-lg border border-accent/35 bg-accent/10 px-3.5 py-3">
                      <span className="mt-0.5 h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-accent">
                          Running head-to-head · {wedgeEntrants.length} angle
                          {wedgeEntrants.length === 1 ? "" : "s"}
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          Creating versions, then validating them in parallel on the same evidence corpus.
                          Wall-clock is roughly one full analysis — hang tight.
                        </p>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {wedgeEntrants.map((e, i) => {
                        const spinning = e.status === "creating" || e.status === "validating";
                        const statusLabel =
                          e.status === "queued"
                            ? "Queued"
                            : e.status === "creating"
                              ? "Creating version…"
                              : e.status === "validating"
                                ? "Validating…"
                                : e.status === "done"
                                  ? "Done"
                                  : "Failed";
                        const statusCls =
                          e.status === "done"
                            ? "text-good"
                            : e.status === "failed"
                              ? "text-bad"
                              : e.status === "queued"
                                ? "text-muted"
                                : "text-accent2";
                        return (
                          <li
                            key={i}
                            className="flex items-center gap-2.5 rounded-lg border border-border bg-panel2 px-3 py-2.5"
                          >
                            {spinning ? (
                              <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-accent2/30 border-t-accent2" />
                            ) : e.status === "done" ? (
                              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-good/20 text-[10px] text-good">
                                ✓
                              </span>
                            ) : e.status === "failed" ? (
                              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-bad/20 text-[10px] text-bad">
                                !
                              </span>
                            ) : (
                              <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border bg-panel" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{e.label}</div>
                              {e.detail && (
                                <div className="truncate font-mono text-[11px] text-muted">{e.detail}</div>
                              )}
                            </div>
                            <span className={`shrink-0 font-mono text-[11px] uppercase tracking-wide ${statusCls}`}>
                              {statusLabel}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <>
                    <p className="mb-3 text-xs text-muted">
                      Each is a different strategic angle on the same core idea. Selected wedges become versions and are
                      validated <b>in parallel on the same evidence corpus</b> — a fair head-to-head. Cost ≈ one validation
                      per wedge.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {wedgeSet.wedges.map((w, i) => (
                        <label
                          key={i}
                          className={`flex cursor-pointer flex-col rounded-lg border p-3 transition ${
                            wedgeSelected.has(i) ? "border-accent/50 bg-panel2" : "border-border bg-panel2/50 opacity-60"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              checked={wedgeSelected.has(i)}
                              onChange={(e) =>
                                setWedgeSelected((prev) => {
                                  const n = new Set(prev);
                                  if (e.target.checked) n.add(i);
                                  else n.delete(i);
                                  return n;
                                })
                              }
                              className="mt-0.5"
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-medium">{w.wedge}</div>
                              <p className="mt-1 text-xs leading-relaxed text-fg/80">{w.statement}</p>
                              <p className="mt-1 text-xs leading-relaxed text-muted">
                                {w.rationale} <span className="text-accent2">→ {w.targets}</span>
                              </p>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        onClick={runWedgeTournament}
                        disabled={wedgeSelected.size === 0 || anyBusy}
                        className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent disabled:opacity-50"
                      >
                        Run tournament ({wedgeSelected.size} wedge{wedgeSelected.size === 1 ? "" : "s"})
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {/* phase 2: results, ranked */}
            {wedgeResults && wedgeBaseline && (
              <div className="mt-1">
                <p className="mb-2 text-xs text-muted">
                  Ranked on the same evidence as baseline v{wedgeBaseline.n} ({wedgeBaseline.score}/100). Differences
                  within ±{acceptanceMargin()} are scoring noise, not signal.
                </p>
                <div className="space-y-2">
                  {wedgeResults.map((r) => {
                    const delta = r.score != null ? r.score - wedgeBaseline.score : null;
                    const clears = delta != null && delta >= acceptanceMargin();
                    return (
                      <div
                        key={r.versionId}
                        className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${
                          clears ? "border-good/50 bg-good/5" : "border-border bg-panel2"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium">
                            v{r.n} · {r.proposal.wedge}
                            {clears && <span className="ml-2 text-xs text-good">← clears the noise margin</span>}
                          </div>
                          <div className="mt-0.5 text-xs text-muted">
                            {r.error ? (
                              <span className="text-bad">failed: {r.error}</span>
                            ) : (
                              <>
                                <b className="font-mono text-fg/90">{r.score}/100</b>
                                {delta != null && (
                                  <span className="font-mono"> ({delta >= 0 ? "+" : ""}{delta})</span>
                                )}
                                {r.verdict ? ` · ${verdictLabel(r.verdict, t)}` : ""}
                                {r.revenue ? ` · ${r.revenue}` : ""}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => switchVersion(r.versionId)}
                            className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-panel"
                          >
                            View report
                          </button>
                          {!r.error && (
                            <button
                              onClick={() => adoptWedge(r.versionId)}
                              className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-on-accent"
                            >
                              Adopt (archive the rest)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-muted">
                  Adopting keeps every entrant’s report (archived, not deleted). Or keep all and compare manually in the
                  version switcher.
                </p>
              </div>
            )}

            {wedgeLog.length > 0 && (
              <pre
                ref={wedgeLogRef}
                className="mt-3 max-h-48 overflow-auto rounded-lg bg-bg/60 p-3 font-mono text-xs leading-relaxed text-muted"
              >
                {wedgeLog.join("\n")}
              </pre>
            )}
          </div>
        )}

        {/* Alternate path — the non-primary fork (iterate vs field-test) */}
        {hasValidate && iterateHint && !composerMode && !chatting && (
          <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border/80 bg-panel/40 px-3.5 py-2.5 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              {t("workspaceExtra.also")}
            </span>
            <button
              type="button"
              onClick={iterateHint.onClick}
              disabled={anyBusy || locked}
              className="font-medium text-accent hover:underline disabled:opacity-50"
            >
              {iterateHint.label} →
            </button>
            <span className="text-xs text-muted">{iterateHint.detail}</span>
          </div>
        )}

        {/* Ask — Q&A only, never creates a version (inline below lg; sticky aside ≥lg) */}
        {chatting && !deskChat && (
          <div className="folio mb-5 border-accent2/30 p-5">{chatPanel(false)}</div>
        )}

        {/* New version composer — one surface for write / suggest / context / advanced */}
        {composerMode && (
          <div
            ref={composerRef}
            className="folio mb-5 scroll-mt-4 border-accent/35 p-5"
          >
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-display text-base font-bold text-accent2">
                  {t("workspace.newVersion")}
                </div>
                <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-accent">
                  {t("workspaceExtra.createsV", { n: versions.length + 1 })}
                </span>
              </div>
              <button onClick={closeComposer} className="text-xs text-muted hover:text-fg">
                {t("common.close")}
              </button>
            </div>
            <p className="mb-3 text-xs text-muted">{t("workspaceExtra.composerBlurb")}</p>

            {/* mode chips */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {(
                [
                  { key: "write" as const, label: t("workspace.writeIt") },
                  { key: "suggest" as const, label: t("workspace.suggestSharper") },
                  { key: "context" as const, label: t("workspace.addContext") },
                  { key: "advanced" as const, label: t("workspace.advanced") },
                ] as const
              ).map((m) => (
                <button
                  key={m.key}
                  type="button"
                  disabled={anyBusy && m.key === "suggest"}
                  onClick={() => {
                    if (m.key === composerMode) return;
                    if (m.key === "suggest") openComposer("suggest");
                    else {
                      setProposal(null);
                      setComposerMode(m.key);
                      if (m.key === "write") setDraft(activeVersion.statement);
                    }
                  }}
                  className={`rounded-md border px-2.5 py-1 text-xs transition ${
                    composerMode === m.key
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border text-muted hover:text-fg"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {composerMode === "write" && (
              <div>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  placeholder="Rewrite the idea statement…"
                  className="w-full resize-none rounded-lg border border-border bg-panel2 p-3 text-sm outline-none focus:border-accent"
                />
                <VariantGoalFields
                  className="mt-3"
                  goalDraft={goalDraft}
                  setGoalDraft={setGoalDraft}
                  goalDetailDraft={goalDetailDraft}
                  setGoalDetailDraft={setGoalDetailDraft}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => saveManual(true)}
                    disabled={anyBusy || scoreBlocked || draft.trim().length < 8}
                    className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent disabled:opacity-50"
                  >
                    {exhausted
                      ? "Analyses complete — create only"
                      : `Create v${versions.length + 1} & validate`}
                  </button>
                  <button
                    onClick={() => saveManual(false)}
                    disabled={anyBusy || draft.trim().length < 8}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-panel2 disabled:opacity-50"
                  >
                    Create only
                  </button>
                  <button onClick={closeComposer} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-panel2">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {composerMode === "suggest" && (
              <div>
                {suggesting && (
                  <div className="flex items-center gap-2 text-sm text-accent">
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                    Drafting a sharper version targeting weak criteria…
                  </div>
                )}
                {!suggesting && proposal && (
                  <>
                    <div className="mb-1 text-xs font-medium text-muted">
                      Suggested — {proposal.label}
                    </div>
                    <textarea
                      value={proposalDraft}
                      onChange={(e) => setProposalDraft(e.target.value)}
                      rows={4}
                      className="w-full resize-none rounded-lg border border-border bg-panel2 p-3 text-sm outline-none focus:border-accent"
                    />
                    <p className="mt-2 text-xs text-muted">
                      <b className="text-fg/80">Why:</b> {proposal.rationale}{" "}
                      <span className="text-fg/60">{proposal.expected_effect}</span>
                    </p>
                    <ul className="mt-2 space-y-1">
                      {proposal.changes.map((c, i) => (
                        <li key={i} className="text-xs text-muted">
                          <span className="text-accent">•</span> {c.change}{" "}
                          <span className="text-fg/50">→ {c.targets}</span>
                        </li>
                      ))}
                    </ul>
                    <VariantGoalFields
                      className="mt-3"
                      goalDraft={goalDraft}
                      setGoalDraft={setGoalDraft}
                      goalDetailDraft={goalDetailDraft}
                      setGoalDetailDraft={setGoalDetailDraft}
                    />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={acceptProposal}
                        disabled={anyBusy || scoreBlocked}
                        className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent disabled:opacity-50"
                      >
                        {exhausted
                          ? "Analyses complete"
                          : `Create v${versions.length + 1} & validate`}
                      </button>
                      <button
                        onClick={() => void runSuggest()}
                        disabled={anyBusy}
                        className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-panel2 disabled:opacity-50"
                      >
                        Try another
                      </button>
                      <button onClick={closeComposer} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-panel2">
                        Cancel
                      </button>
                    </div>
                  </>
                )}
                {!suggesting && !proposal && (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => void runSuggest()}
                      disabled={anyBusy}
                      className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent disabled:opacity-50"
                    >
                      Draft a sharper version
                    </button>
                    <button onClick={closeComposer} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-panel2">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            )}

            {composerMode === "context" && (
              <div>
                <p className="mb-2 text-xs text-muted">
                  Push back on what it got wrong or add facts about you (skills, network, capital).
                  Market claims still get verified — not taken on faith. Creates a{" "}
                  <b className="font-medium text-fg/70">new scored version</b>.
                </p>
                {activeQuestions.length > 0 && (
                  <div className="mb-2 rounded-lg border border-border bg-panel2 p-3">
                    <div className="mb-1 text-xs font-medium text-muted">The validator asked:</div>
                    <ul className="space-y-1">
                      {activeQuestions.map((q, i) => (
                        <li key={i} className="flex gap-2 text-xs">
                          <button
                            onClick={() =>
                              setResponseDraft((d) => (d ? d + "\n" : "") + `Q: ${q}\nA: `)
                            }
                            className="shrink-0 text-accent hover:underline"
                            title="add this question to your response"
                          >
                            ＋
                          </button>
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <textarea
                  value={responseDraft}
                  onChange={(e) => setResponseDraft(e.target.value)}
                  rows={4}
                  placeholder={`e.g. "Those competitors are CLI tools — mine is a team workspace. I have warm intros to 20 Shopify agencies."`}
                  className="w-full resize-none rounded-lg border border-border bg-panel2 p-3 text-sm outline-none focus:border-accent"
                />
                <VariantGoalFields
                  className="mt-3"
                  goalDraft={goalDraft}
                  setGoalDraft={setGoalDraft}
                  goalDetailDraft={goalDetailDraft}
                  setGoalDetailDraft={setGoalDetailDraft}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={respondToValidator}
                    disabled={anyBusy || responseDraft.trim().length < 4}
                    className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-on-accent disabled:opacity-50"
                  >
                    Create v{versions.length + 1} &amp; validate
                  </button>
                  <button onClick={closeComposer} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-panel2">
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {composerMode === "advanced" && (
              <div className="space-y-3">
                <p className="text-xs text-muted">
                  Multi-run modes. Prefer a single rewrite or context pass unless you need parallel
                  experiments.
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={anyBusy || locked}
                    onClick={() => {
                      closeComposer();
                      void exploreWedges();
                    }}
                    className="rounded-lg border border-border bg-panel2 p-3 text-left transition hover:border-accent/40 disabled:opacity-50"
                  >
                    <div className="text-sm font-medium">{t("workspace.compareAngles")}</div>
                    <p className="mt-1 text-xs text-muted">
                      3–5 divergent wedges, scored head-to-head on the same evidence. ~1 full
                      analysis each
                      {remaining !== null
                        ? ` · ${remaining} remaining in this campaign`
                        : ""}
                      .
                    </p>
                  </button>
                  <button
                    type="button"
                    disabled={anyBusy || scoreBlocked}
                    onClick={() => {
                      closeComposer();
                      void autoIterate();
                    }}
                    className="rounded-lg border border-border bg-panel2 p-3 text-left transition hover:border-accent/40 disabled:opacity-50"
                  >
                    <div className="text-sm font-medium">{t("workspace.climbScore")}</div>
                    <p className="mt-1 text-xs text-muted">
                      Auto-iterate: propose → validate → keep climbs until target or max rounds.
                    </p>
                  </button>
                </div>
                <button onClick={closeComposer} className="text-xs text-muted hover:text-fg">
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* auto-iterate config + log */}
        {(iterating || iterLog.length > 0) && (
          <div className="mb-5 rounded-xl border border-border bg-panel p-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold">⟳ Auto-iterate</span>
              <label className="flex items-center gap-1 text-muted">
                target
                <input type="number" value={target} onChange={(e) => setTarget(+e.target.value)} disabled={iterating} className="w-16 rounded-md border border-border bg-panel2 px-2 py-0.5 text-right font-mono" />
              </label>
              <label className="flex items-center gap-1 text-muted">
                max rounds
                <input type="number" value={maxRounds} onChange={(e) => setMaxRounds(+e.target.value)} disabled={iterating} className="w-14 rounded-md border border-border bg-panel2 px-2 py-0.5 text-right font-mono" />
              </label>
              {!iterating && (
                <button onClick={autoIterate} disabled={anyBusy} className="rounded-lg bg-accent px-3 py-1 text-sm font-medium text-on-accent disabled:opacity-50">
                  Run
                </button>
              )}
              {iterating && <span className="animate-pulse text-accent2">running…</span>}
            </div>
            {iterLog.length > 0 && (
              <pre className="mt-3 max-h-48 overflow-auto rounded-lg bg-bg/60 p-3 font-mono text-xs leading-relaxed text-muted">
                {iterLog.join("\n")}
              </pre>
            )}
            {iterBest &&
              versions.filter(
                (v) => !v.archived && v.origin === "ai" && v.n !== 1 && v.id !== iterBest.id && v.id !== activeVersionId
              ).length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-sm">
                  <span>
                    Best is <b className="font-mono">v{iterBest.n}</b> at {iterBest.score}/100. Clear the
                    intermediate tries?
                  </span>
                  <button onClick={cleanupVersions} className="ml-auto rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-on-accent">
                    Keep best, remove the rest
                  </button>
                  <button onClick={() => setIterBest(null)} className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-panel2">
                    Keep all
                  </button>
                </div>
              )}
          </div>
        )}

        {campaignNotice && (
          <div
            role="status"
            className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-xl border border-accent/35 bg-accent/8 px-4 py-3 text-sm text-fg/90"
          >
            <p className="min-w-0 flex-1 leading-relaxed">
              <span className="font-medium text-accent">{t("workspace.youreIn")}</span>{" "}
              {campaignNotice}
            </p>
            <button
              type="button"
              onClick={() => setCampaignNotice(null)}
              className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-muted hover:text-fg"
            >
              {t("common.dismiss")}
            </button>
          </div>
        )}

        {error && (
          <div role="alert" aria-live="assertive" className="mb-4 rounded-lg border border-bad/30 bg-bad/10 px-4 py-2 text-sm text-bad">
            {error}
          </div>
        )}

        {(
          <div>
            {/* campaign paywall — one payment unlocks THIS idea's full campaign */}
            {locked && (
              <div className="mb-6 rounded-xl border border-accent/40 bg-accent/5 p-5">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent">
                      {t("workspace.fullCampaign")}
                    </div>
                    <div className="mt-1 text-base font-semibold">
                      {t("workspace.pressureTest", {
                        price: (billing!.priceCents / 100).toFixed(0),
                      })}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {t("workspace.unlockBodyBefore")}{" "}
                      <span className="text-fg/80">
                        {t("workspace.unlockReports", { n: billing!.runCap })}
                      </span>
                      {t("workspace.unlockBodyAfter")}{" "}
                      <a href="/pricing" className="text-accent hover:underline">
                        {t("workspace.pricingDetails")}
                      </a>
                      {" · "}
                      <a
                        href="/help/campaigns-and-pricing"
                        className="text-accent hover:underline"
                      >
                        {t("help.learnCampaigns")}
                      </a>
                    </p>
                  </div>
                  <button
                    onClick={startCheckout}
                    className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition hover:opacity-90"
                  >
                    {t("workspace.unlockFor", {
                      price: (billing!.priceCents / 100).toFixed(0),
                    })}
                  </button>
                </div>
              </div>
            )}

            {/* included analyses finished — report & chat stay live */}
            {exhausted && (
              <div className="mb-6 rounded-xl border border-accent2/35 bg-accent2/5 p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-accent2">
                      {t("workspace.reportsComplete")}
                    </div>
                    <div className="mt-1 text-base font-semibold">
                      {t("workspace.usedReports", { n: billing!.runCap })}
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted">
                      {t("workspace.usedBody")}{" "}
                      <a
                        href="/help/cant-run-analysis"
                        className="text-accent hover:underline"
                      >
                        {t("help.cantRunLink")}
                      </a>
                    </p>
                  </div>
                  <a
                    href="/studio"
                    className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-on-accent transition hover:opacity-90"
                  >
                    {t("workspace.validateNew")}
                  </a>
                </div>
              </div>
            )}

            {/* soft nudge when nearly through included analyses */}
            {low && !exhausted && remaining !== null && (
              <div className="mb-4 rounded-lg border border-accent/25 bg-accent/5 px-3.5 py-2.5 text-sm text-fg/90">
                <span className="font-medium text-accent">
                  {remaining === 1
                    ? t("workspace.reportsRemaining", { n: remaining })
                    : t("workspace.reportsRemainingPlural", { n: remaining })}
                </span>
                <span className="text-muted">{t("workspace.remainingHint")}</span>{" "}
                <a
                  href="/help/iterate"
                  className="font-medium text-accent hover:underline"
                >
                  {t("help.iterateLink")}
                </a>
              </div>
            )}

            {/* Zone 2–3 body lives inside ValidationView (test + evidence chapters).
                Rigor controls sit in the decision ⋯ menu so they don't compete with the CTA. */}
            {billing?.enabled && billing.paid && (
              <div
                className="mb-3 flex flex-wrap items-center gap-2"
                title={t("workspace.meterTitle", { n: billing.runCap })}
              >
                <span
                  className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] ${
                    exhausted
                      ? "border-accent2/40 bg-accent2/10 text-accent2"
                      : low
                        ? "border-accent/40 bg-accent/10 text-accent"
                        : "border-border bg-panel/60 text-muted"
                  }`}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: exhausted
                        ? "var(--color-accent2)"
                        : low
                          ? "var(--color-accent)"
                          : "var(--color-good, var(--color-accent))",
                    }}
                  />
                  <span className="font-medium text-fg/85">
                    {t("workspace.meterIncluded", { n: billing.runCap })}
                  </span>
                  {remaining !== null && !exhausted ? (
                    <span className="text-fg/65">
                      {t("workspace.meterRemaining", { n: remaining })}
                    </span>
                  ) : null}
                  {exhausted ? (
                    <span className="text-fg/65">{t("workspace.meterComplete")}</span>
                  ) : null}
                </span>
                <a
                  href={
                    exhausted
                      ? "/help/cant-run-analysis"
                      : "/help/campaigns-and-pricing"
                  }
                  className="text-[11px] text-muted underline-offset-2 hover:text-accent hover:underline"
                >
                  {exhausted ? t("help.cantRunLink") : t("help.learnCampaigns")}
                </a>
                {/* progress through included analyses */}
                <div className="flex h-1.5 max-w-[7rem] flex-1 gap-0.5 overflow-hidden rounded-full">
                  {Array.from({ length: billing.runCap }, (_, i) => (
                    <div
                      key={i}
                      className="min-w-0 flex-1 rounded-sm"
                      style={{
                        background:
                          i < billing.runsUsed
                            ? exhausted
                              ? "var(--color-accent2)"
                              : low
                                ? "var(--color-accent)"
                                : "var(--color-accent)"
                            : "var(--color-border)",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* the one comprehensive analysis */}
            {busy.has(bk(activeVersionId, "validation")) ? (
              <GenerationProgress label={t("progress.fullAnalysis")} grounded />
            ) : activeArtifacts.validation ? (
              <div>
                <SafeArtifact
                  key={`${activeVersionId}:validation`}
                  kind="validation"
                  data={activeArtifacts.validation.data}
                  onRegenerate={() => runValidate()}
                  extra={{
                    goal: goalBucket,
                    provenance: idea.provenance,
                    evidence: evidence[activeVersionId] ?? null,
                    onRefreshEvidence: refreshEvidence,
                    refreshingEvidence,
                    // Where the score sits across all ideas (percentile) + the active
                    // k for the k-sample scoring mechanics HowScored documents.
                    scorePercentile: activePercentile,
                    scoringSamples,
                    // the kill-test execution kit (its own artifact, rendered under NextTest)
                    kitData: activeArtifacts.kit?.data ?? null,
                    onGenerateKit: generateKit,
                    generatingKit,
                    // the market-intel pack (cited competitor facts + one-liner)
                    intelData: activeArtifacts.intel?.data ?? null,
                    onGenerateIntel: generateIntel,
                    generatingIntel,
                    // the real-world kill-test result loop
                    testResultData: activeArtifacts.test_result?.data ?? null,
                    onRecordResult: recordResult,
                    recordingResult,
                    onRevalidateWithResult: revalidateWithResult,
                    // DecisionCard owns the score — report is test (when ready) + chapters
                    compactHero: true,
                  }}
                />
                <SourcesList sources={activeArtifacts.validation.sources} />
              </div>
            ) : null}

            {/* edges to test — derived from the verdict */}
            {activeArtifacts.validation && activeAlphas.length > 0 && (
              <div className="folio mt-10 border-accent/30 p-5">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <div className="font-display text-base font-bold text-accent2">
                    {t("workspaceExtra.possibleAlpha")}
                  </div>
                  <button
                    onClick={exploreWedges}
                    disabled={anyBusy}
                    title={t("workspaceExtra.alphasBlurb")}
                    className="inline-flex items-center gap-1.5 rounded-md border border-accent/40 px-2.5 py-1 text-xs font-medium text-accent transition hover:bg-accent/10 disabled:opacity-50"
                  >
                    {(wedgeFetching || wedgeRunning) && (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                    )}
                    {wedgeFetching
                      ? t("workspaceExtra.draftingAngles")
                      : wedgeRunning
                        ? t("workspaceExtra.tournamentRunning")
                        : t("workspaceExtra.compareAnglesCta")}
                  </button>
                </div>
                <p className="mb-3 text-xs text-muted">{t("workspaceExtra.alphasBlurb")}</p>
                {(wedgeFetching || wedgeRunning) && (
                  <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2.5 text-sm text-fg/90">
                    <span className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                    <div>
                      <div className="font-medium text-accent">
                        {wedgeFetching
                          ? t("workspaceExtra.draftingTournament")
                          : t("workspaceExtra.validatingWedges")}
                      </div>
                      <p className="mt-0.5 text-xs text-muted">
                        {wedgeFetching
                          ? t("workspaceExtra.draftingHint")
                          : t("workspaceExtra.validatingHint")}
                      </p>
                    </div>
                  </div>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  {activeAlphas.map((a, i) => (
                    <div key={i} className="flex flex-col rounded-lg border border-border bg-panel2 p-3">
                      <div className="text-sm font-medium">{a.alpha}</div>
                      <p className="mt-1 flex-1 text-xs leading-relaxed text-muted">{a.rationale}</p>
                      <button
                        onClick={() => revalidateWithAlpha(a.alpha, a.rationale)}
                        disabled={anyBusy || scoreBlocked}
                        className="mt-2 self-start rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-on-accent disabled:opacity-50"
                      >
                        {exhausted
                          ? t("workspace.analysesComplete")
                          : t("workspaceExtra.revalidateAlpha")}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
          </div>

          {/* Sticky chat aside (≥lg): fills the viewport height, scrolls its own messages. */}
          {chatting && deskChat && (
            <aside className="sticky top-[4.25rem] flex max-h-[calc(100vh-5.25rem)] min-h-[24rem] flex-col self-start">
              <div className="folio flex min-h-0 flex-1 flex-col border-accent2/30 p-5">
                {chatPanel(true)}
              </div>
            </aside>
          )}
        </div>
      </div>

      {/* Confirm before using remaining included full analyses */}
      {scoreConfirm &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-bg/70 p-4 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="score-confirm-title"
            onClick={() => setScoreConfirm(null)}
          >
            <div
              className="w-full max-w-md rounded-xl border border-border bg-panel p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">
                Full analysis
              </div>
              <div
                id="score-confirm-title"
                className="mt-1 font-display text-base font-bold tracking-tight"
              >
                {scoreConfirm.title}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{scoreConfirm.body}</p>
              <div className="mt-4 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setScoreConfirm(null)}
                  className="rounded-lg border border-border px-3.5 py-2 text-sm hover:bg-panel2"
                >
                  Not now
                </button>
                <button
                  type="button"
                  onClick={scoreConfirm.onConfirm}
                  className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-on-accent"
                >
                  {scoreConfirm.confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* print-only: active version's full report. Always in the DOM so native Cmd+P
          captures it (gating on beforeprint risks React not flushing in time), but
          MEMOIZED so typing in chat / tournament log lines don't re-render this whole
          second report tree — it only rebuilds when its actual inputs change. */}
      <PrintReport
        idea={idea}
        activeVersion={activeVersion}
        activeVersionId={activeVersionId}
        activeArtifacts={activeArtifacts}
        meta={meta}
        goalBucket={goalBucket}
        scoringSamples={scoringSamples}
      />
    </div>
  );
}

// Memoized print-only tree: re-renders only when the active version's artifacts/goal
// change, not on every keystroke in the live workspace above it.
const PrintReport = React.memo(function PrintReport({
  idea,
  activeVersion,
  activeVersionId,
  activeArtifacts,
  meta,
  goalBucket,
  scoringSamples,
}: {
  idea: Idea;
  activeVersion: Version;
  activeVersionId: string;
  activeArtifacts: Record<string, Artifact>;
  meta: GeneratorMeta[];
  goalBucket: string | null;
  scoringSamples: number;
}) {
  return (
    <div className="print-only">
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>
        {idea.title} — v{activeVersion.n}
      </h1>
      <p style={{ color: "#555" }}>{activeVersion.statement}</p>
      {meta.map((m) =>
        activeArtifacts[m.kind] ? (
          <div key={m.kind} className="print-section" style={{ marginTop: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{m.label}</h2>
            {/* print: expand the collapsed sections + unclamp prose so the PDF is the FULL report */}
            <SafeArtifact
              key={`${activeVersionId}:${m.kind}`}
              kind={m.kind}
              data={activeArtifacts[m.kind].data}
              extra={{ print: true, goal: goalBucket, provenance: idea.provenance, scoringSamples, kitData: activeArtifacts.kit?.data ?? null, intelData: activeArtifacts.intel?.data ?? null }}
            />
            {/* the "model estimate — see sources" tags need the sources in the PDF too */}
            <SourcesList sources={activeArtifacts[m.kind].sources} />
          </div>
        ) : null
      )}
    </div>
  );
});
