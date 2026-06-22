"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Artifact, ArtifactKind, Idea, Version } from "@/lib/db";
import type { GeneratorMeta } from "@/lib/generators";
import type { Refinement } from "@/lib/generators/refine";
import {
  BrandView,
  FinancialsView,
  LogoView,
  MarketingView,
  MarketView,
  PitchView,
  PlanView,
  SourcesList,
  ValidationView,
} from "./artifacts";
import type { ZodType } from "zod";
import { ValidationSchema } from "@/lib/generators/validation";
import { MarketSchema } from "@/lib/generators/market";
import { FinancialsSchema } from "@/lib/generators/financials";
import { PlanSchema } from "@/lib/generators/plan";
import { BrandSchema } from "@/lib/generators/brand";
import { LogoSchema } from "@/lib/generators/logo";
import { MarketingSchema } from "@/lib/generators/marketing";
import { PitchSchema } from "@/lib/generators/pitch";

// Validate persisted artifacts against the current schema so results saved under an
// older schema show a regenerate prompt instead of crashing the render.
const SCHEMAS: Record<ArtifactKind, ZodType> = {
  validation: ValidationSchema,
  market: MarketSchema,
  financials: FinancialsSchema,
  plan: PlanSchema,
  brand: BrandSchema,
  logo: LogoSchema,
  marketing: MarketingSchema,
  pitch: PitchSchema,
};
function isCurrent(kind: ArtifactKind, data: unknown): boolean {
  return SCHEMAS[kind].safeParse(data).success;
}

const VIEWS: Record<ArtifactKind, React.ComponentType<{ d: never }>> = {
  validation: ValidationView as never,
  market: MarketView as never,
  financials: FinancialsView as never,
  plan: PlanView as never,
  brand: BrandView as never,
  logo: LogoView as never,
  marketing: MarketingView as never,
  pitch: PitchView as never,
};

function renderView(kind: ArtifactKind, data: unknown) {
  const View = VIEWS[kind];
  return <View d={data as never} />;
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
              className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white"
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
          className="mt-3 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white"
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
}: {
  kind: ArtifactKind;
  data: unknown;
  onRegenerate?: () => void;
}) {
  if (!isCurrent(kind, data)) return <StaleNotice onRegenerate={onRegenerate} />;
  return <ArtifactBoundary onRegenerate={onRegenerate}>{renderView(kind, data)}</ArtifactBoundary>;
}

const scoreColor = (n: number) =>
  n >= 70 ? "var(--color-good)" : n >= 45 ? "var(--color-warn)" : "var(--color-bad)";

const fmtCost = (n: number) => "$" + (n < 1 ? n.toFixed(n < 0.1 ? 4 : 3) : n.toFixed(2));

const GOAL_OPTIONS = [
  { key: "lifestyle", label: "Lifestyle / replace my job" },
  { key: "side_hustle", label: "Side hustle" },
  { key: "venture", label: "Venture-scale / raise" },
  { key: "unsure", label: "Not sure yet" },
];
const goalLabel = (k: string | null) =>
  GOAL_OPTIONS.find((o) => o.key === k)?.label ?? "Not set";

type ArtMap = Record<string, Record<string, Artifact>>;
const bk = (vid: string, kind: string) => `${vid}:${kind}`;

export default function IdeaWorkspace({
  idea,
  versions: versionsProp,
  artifactsByVersion,
  meta,
  initialCost,
}: {
  idea: Idea;
  versions: Version[];
  artifactsByVersion: Record<string, Artifact[]>;
  meta: GeneratorMeta[];
  initialCost: number;
}) {
  const router = useRouter();
  const [cost, setCost] = useState(initialCost);

  const [versions, setVersions] = useState<Version[]>(versionsProp);
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
  const [activeTab, setActiveTab] = useState<ArtifactKind>(() => {
    const first = artifactsByVersion[versionsProp[versionsProp.length - 1]?.id ?? ""]?.[0];
    return (first?.kind as ArtifactKind) ?? "validation";
  });
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // panels
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [proposal, setProposal] = useState<Refinement | null>(null);
  const [proposalDraft, setProposalDraft] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [responding, setResponding] = useState(false);
  const [responseDraft, setResponseDraft] = useState("");
  const [goalBucket, setGoalBucket] = useState(idea.goal ?? "unsure");
  const [goalDetail, setGoalDetail] = useState(idea.goal_detail ?? "");
  const [editingGoal, setEditingGoal] = useState(false);

  async function saveGoal() {
    try {
      await fetch(`/api/ideas/${idea.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goalBucket, goalDetail }),
      });
      setEditingGoal(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save goal");
    }
  }

  // auto-iterate
  const [iterating, setIterating] = useState(false);
  const [target, setTarget] = useState(80);
  const [maxRounds, setMaxRounds] = useState(5);
  const [iterLog, setIterLog] = useState<string[]>([]);

  const metaByKind = useMemo(() => Object.fromEntries(meta.map((m) => [m.kind, m])), [meta]);
  const activeVersion = versions.find((v) => v.id === activeVersionId) ?? versions[0];
  const activeArtifacts = artifacts[activeVersionId] ?? {};
  const bestScore = Math.max(...versions.map((v) => v.score ?? -1));
  const anyBusy = busy.size > 0 || iterating;

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
    setProposal(null);
    setEditing(false);
    setResponding(false);
    const first = artifacts[id] ? Object.keys(artifacts[id])[0] : undefined;
    setActiveTab((first as ArtifactKind) ?? "validation");
  }

  async function generate(kind: ArtifactKind, versionId: string): Promise<Artifact> {
    setError(null);
    setBusyKey(bk(versionId, kind), true);
    try {
      const res = await fetch(`/api/generate/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      const art = json as Artifact;
      setArtifacts((prev) => ({ ...prev, [versionId]: { ...(prev[versionId] ?? {}), [kind]: art } }));
      setCost((c) => c + (art.cost ?? 0));
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
      }
      return art;
    } finally {
      setBusyKey(bk(versionId, kind), false);
    }
  }

  async function generateActive(kind: ArtifactKind) {
    setActiveTab(kind);
    try {
      await generate(kind, activeVersionId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    }
  }

  async function generateAll() {
    for (const m of meta) {
      if (!activeArtifacts[m.kind]) {
        try {
          await generate(m.kind, activeVersionId);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Generation failed");
          break;
        }
      }
    }
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
    setError(null);
    try {
      const v = await createVersionFrom(
        activeVersion.statement,
        "context",
        activeVersionId,
        "Responded to validator",
        text,
        text
      );
      setResponding(false);
      setResponseDraft("");
      switchVersion(v.id);
      await generate("validation", v.id);
      await generate("market", v.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not re-validate");
    }
  }

  // --- manual refine ----------------------------------------------------------
  function startManual() {
    setProposal(null);
    setDraft(activeVersion.statement);
    setEditing(true);
  }
  async function saveManual() {
    if (draft.trim().length < 8) return;
    try {
      const v = await createVersionFrom(draft.trim(), "manual", activeVersionId);
      setEditing(false);
      switchVersion(v.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create version");
    }
  }

  // --- AI suggest -------------------------------------------------------------
  async function suggest() {
    setEditing(false);
    setSuggesting(true);
    setError(null);
    try {
      const res = await fetch(`/api/versions/${activeVersionId}/refine`, { method: "POST" });
      const p = await res.json();
      if (!res.ok) throw new Error(p.error ?? "Refinement failed");
      setCost((c) => c + (p._cost ?? 0));
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
    try {
      const v = await createVersionFrom(
        proposalDraft.trim() || proposal.statement,
        "ai",
        activeVersionId,
        proposal.label,
        proposal.rationale
      );
      setProposal(null);
      switchVersion(v.id);
      await generate("validation", v.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept proposal");
    }
  }

  // --- auto-iterate -----------------------------------------------------------
  async function autoIterate() {
    setIterating(true);
    setError(null);
    setProposal(null);
    setEditing(false);
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
      if (!artifacts[curId]?.market) {
        log(`Market scan for v${curN}…`);
        await generate("market", curId);
      }
      let bestId = curId;
      let bestN = curN;
      let best = curScore;
      log(`Baseline v${curN}: ${curScore}/100.`);

      // Greedy hill-climb: always refine from the BEST version so far, so a
      // regression in one round doesn't trap the search at a worse statement.
      for (let r = 1; r <= maxRounds; r++) {
        if (best >= target) {
          log(`✓ Target ${target} reached at v${bestN} (${best}).`);
          break;
        }
        log(`Round ${r}/${maxRounds}: refining best so far (v${bestN}, ${best})…`);
        const pRes = await fetch(`/api/versions/${bestId}/refine`, { method: "POST" });
        const prop = await pRes.json();
        if (!pRes.ok) throw new Error(prop.error ?? "Refinement failed");
        setCost((c) => c + (prop._cost ?? 0));
        const v = await createVersionFrom(prop.statement, "ai", bestId, prop.label, prop.rationale);
        setActiveVersionId(v.id);
        setActiveTab("validation");
        log(`→ v${v.n} "${prop.label}". Validating…`);
        const val = await generate("validation", v.id);
        const newScore = scoreOf(val);
        const newRev = revOf(val);
        log(`Market scan for v${v.n}…`);
        await generate("market", v.id);
        log(
          `v${v.n}: ${newScore}/100${newRev ? ` · forecast ${newRev}` : ""}${
            newScore > best ? "  ← new best" : ""
          }`
        );
        if (newScore > best) {
          best = newScore;
          bestId = v.id;
          bestN = v.n;
        }
      }
      log(`Done. Best version: v${bestN} at ${best}/100.`);
      switchVersion(bestId);
    } catch (e) {
      const m = e instanceof Error ? e.message : "Iteration failed";
      setError(m);
      setIterLog((prev) => [...prev, `Stopped: ${m}`]);
    } finally {
      setIterating(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this idea, all versions and artifacts?")) return;
    await fetch(`/api/ideas/${idea.id}`, { method: "DELETE" });
    router.push("/");
  }

  const activeMeta = metaByKind[activeTab];
  const activeArtifact = activeArtifacts[activeTab];
  const activeQuestions =
    (activeArtifacts.validation?.data as { clarifying_questions?: string[] } | undefined)
      ?.clarifying_questions ?? [];

  return (
    <div>
      <div className="no-print">
        {/* version switcher */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {versions.map((v) => {
            const vbusy = [...busy].some((k) => k.startsWith(v.id + ":"));
            const isActive = v.id === activeVersionId;
            const isBest = v.score != null && v.score === bestScore && versions.length > 1;
            return (
              <button
                key={v.id}
                onClick={() => switchVersion(v.id)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
                  isActive ? "border-accent bg-panel2" : "border-border text-muted hover:text-fg"
                }`}
                title={v.label ?? v.statement}
              >
                <span className="font-mono font-semibold">v{v.n}</span>
                {v.score != null ? (
                  <span className="font-mono font-bold" style={{ color: scoreColor(v.score) }}>
                    {v.score}
                  </span>
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
                {v.origin === "ai" && <span title="AI refinement">✨</span>}
                {v.origin === "manual" && <span title="manual edit">✎</span>}
                {v.origin === "context" && <span title="re-validated with founder context">💬</span>}
                {isBest && <span title="best score">★</span>}
                {vbusy && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent2" />}
              </button>
            );
          })}
        </div>

        {/* header */}
        <div className="mb-5 rounded-xl border border-border bg-panel p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold">
                {idea.title}{" "}
                <span className="font-mono text-sm font-normal text-muted">· v{activeVersion.n}</span>
                {activeVersion.revenue && (
                  <span
                    className="ml-2 rounded-md border border-accent2/30 bg-accent2/10 px-2 py-0.5 align-middle font-mono text-xs font-normal text-accent2"
                    title="Forecast: realistic obtainable revenue / yr for this version"
                  >
                    ~{activeVersion.revenue}
                  </span>
                )}
                <span
                  className="ml-2 rounded-md border border-border bg-panel2 px-2 py-0.5 align-middle font-mono text-xs font-normal text-muted"
                  title="Total OpenRouter spend on this idea (all versions)"
                >
                  spent {fmtCost(cost)}
                </span>
              </h1>
              {editing ? (
                <div className="mt-2">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-lg border border-border bg-panel2 p-3 text-sm outline-none focus:border-accent"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={saveManual}
                      disabled={draft.trim().length < 8}
                      className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      Save as v{versions.length + 1}
                    </button>
                    <button onClick={() => setEditing(false)} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-panel2">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 max-w-3xl text-sm text-muted">{activeVersion.statement}</p>
              )}
              {!editing && activeVersion.rationale && (
                <p className="mt-2 text-xs text-accent">
                  {activeVersion.label ? <b>{activeVersion.label}: </b> : null}
                  {activeVersion.rationale}
                </p>
              )}
              {!editing && (
                <div className="mt-2 text-xs">
                  {editingGoal ? (
                    <div className="rounded-lg border border-border bg-panel2 p-2">
                      <div className="flex flex-wrap gap-1.5">
                        {GOAL_OPTIONS.map((o) => (
                          <button
                            key={o.key}
                            onClick={() => setGoalBucket(o.key)}
                            className={`rounded-md border px-2 py-1 ${
                              goalBucket === o.key
                                ? "border-accent bg-accent/15 text-accent"
                                : "border-border text-muted hover:text-fg"
                            }`}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                      <input
                        value={goalDetail}
                        onChange={(e) => setGoalDetail(e.target.value)}
                        placeholder="time, effort & budget — e.g. “~$200k/yr, solo, nights & weekends”"
                        className="mt-1.5 w-full rounded-md border border-border bg-panel px-2 py-1 outline-none focus:border-accent"
                      />
                      <div className="mt-1.5 flex items-center gap-2">
                        <button onClick={saveGoal} className="rounded-md bg-accent px-2 py-1 font-medium text-white">
                          Save
                        </button>
                        <button onClick={() => setEditingGoal(false)} className="rounded-md border border-border px-2 py-1 hover:bg-panel">
                          Cancel
                        </button>
                        <span className="text-muted">Then regenerate validation to apply.</span>
                      </div>
                    </div>
                  ) : (
                    <span className="text-muted">
                      Goal: <span className="text-fg/80">{goalLabel(goalBucket)}</span>
                      {goalDetail ? ` · ${goalDetail}` : ""}{" "}
                      <button onClick={() => setEditingGoal(true)} className="text-accent hover:underline">
                        ✎ edit
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {!editing && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={generateAll} disabled={anyBusy} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
                {anyBusy ? "Working…" : "Generate all"}
              </button>
              <button onClick={startManual} disabled={anyBusy} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-panel2 disabled:opacity-50">
                ✎ Refine manually
              </button>
              <button
                onClick={() => {
                  setProposal(null);
                  setEditing(false);
                  setResponseDraft("");
                  setResponding((r) => !r);
                }}
                disabled={anyBusy}
                className="rounded-lg border border-accent2/40 px-3 py-1.5 text-sm text-accent2 hover:bg-accent2/10 disabled:opacity-50"
              >
                💬 Respond to validator
              </button>
              <button onClick={suggest} disabled={anyBusy} className="rounded-lg border border-accent/40 px-3 py-1.5 text-sm text-accent hover:bg-accent/10 disabled:opacity-50">
                {suggesting ? "Thinking…" : "✨ Suggest improvement"}
              </button>
              <button onClick={autoIterate} disabled={anyBusy} className="rounded-lg border border-accent/40 px-3 py-1.5 text-sm text-accent hover:bg-accent/10 disabled:opacity-50">
                ⟳ Auto-iterate
              </button>
              <div className="ml-auto flex gap-2">
                <button onClick={() => window.print()} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-panel2">
                  Print / PDF
                </button>
                <button onClick={remove} className="rounded-lg border border-border px-3 py-1.5 text-sm text-bad hover:bg-panel2">
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>

        {/* respond-to-validator panel */}
        {responding && (
          <div className="mb-5 rounded-xl border border-accent2/40 bg-accent2/5 p-4">
            <div className="mb-1 text-sm font-semibold text-accent2">
              💬 Respond to the validator
            </div>
            <p className="mb-2 text-xs text-muted">
              Push back on what it got wrong, add context, or answer its questions. The next validation
              treats your input as authoritative and re-evaluates (e.g. competitors, market) accordingly.
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
                        className="shrink-0 text-accent2 hover:underline"
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
              placeholder={`e.g. "The competitors you listed (X, Y) are CLI tools for individual developers — my product is a team workspace, 'Jira for AI-agent intent management'. Re-evaluate competition with that in mind."`}
              className="w-full resize-none rounded-lg border border-border bg-panel2 p-3 text-sm outline-none focus:border-accent2"
            />
            <div className="mt-3 flex gap-2">
              <button
                onClick={respondToValidator}
                disabled={anyBusy || responseDraft.trim().length < 4}
                className="rounded-lg bg-accent2 px-3 py-1.5 text-sm font-medium text-bg disabled:opacity-50"
              >
                Re-validate with this context (v{versions.length + 1})
              </button>
              <button onClick={() => setResponding(false)} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-panel2">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* AI proposal panel */}
        {proposal && (
          <div className="mb-5 rounded-xl border border-accent/40 bg-accent/5 p-4">
            <div className="mb-1 text-sm font-semibold text-accent">✨ Suggested refinement — {proposal.label}</div>
            <textarea
              value={proposalDraft}
              onChange={(e) => setProposalDraft(e.target.value)}
              rows={3}
              className="mt-1 w-full resize-none rounded-lg border border-border bg-panel2 p-3 text-sm outline-none focus:border-accent"
            />
            <p className="mt-2 text-xs text-muted">
              <b className="text-fg/80">Why:</b> {proposal.rationale} <span className="text-fg/60">{proposal.expected_effect}</span>
            </p>
            <ul className="mt-2 space-y-1">
              {proposal.changes.map((c, i) => (
                <li key={i} className="text-xs text-muted">
                  <span className="text-accent">•</span> {c.change} <span className="text-fg/50">→ {c.targets}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <button onClick={acceptProposal} disabled={anyBusy} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
                Create v{versions.length + 1} & validate
              </button>
              <button onClick={() => setProposal(null)} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-panel2">
                Dismiss
              </button>
            </div>
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
                <button onClick={autoIterate} disabled={anyBusy} className="rounded-lg bg-accent px-3 py-1 text-sm font-medium text-white disabled:opacity-50">
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
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-lg border border-bad/30 bg-bad/10 px-4 py-2 text-sm text-bad">{error}</div>
        )}

        {/* tabs */}
        <div className="mb-6 flex flex-wrap gap-1.5 border-b border-border pb-3">
          {meta.map((m) => {
            const done = !!activeArtifacts[m.kind];
            const loading = busy.has(bk(activeVersionId, m.kind));
            return (
              <button
                key={m.kind}
                onClick={() => setActiveTab(m.kind)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
                  activeTab === m.kind ? "bg-panel2 text-fg" : "text-muted hover:text-fg"
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${loading ? "animate-pulse bg-accent2" : done ? "bg-good" : "bg-border"}`} />
                {m.label}
              </button>
            );
          })}
        </div>

        {/* active panel */}
        {busy.has(bk(activeVersionId, activeTab)) ? (
          <div className="grid place-items-center rounded-xl border border-border bg-panel py-16 text-sm text-muted">
            <div className="animate-pulse">
              Generating {activeMeta.label}
              {activeMeta.grounded ? " (searching the web)" : ""}…
            </div>
          </div>
        ) : activeArtifact ? (
          <div>
            <SafeArtifact
              key={`${activeVersionId}:${activeTab}`}
              kind={activeTab}
              data={activeArtifact.data}
              onRegenerate={() => generateActive(activeTab)}
            />
            <SourcesList sources={activeArtifact.sources} />
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
              <span>
                Model: {activeArtifact.model ?? "—"}
                {activeArtifact.cost != null ? ` · ${fmtCost(activeArtifact.cost)}` : ""}
              </span>
              <button onClick={() => generateActive(activeTab)} className="rounded-md border border-border px-2 py-1 hover:bg-panel2">
                Regenerate
              </button>
            </div>
          </div>
        ) : (
          <div className="grid place-items-center rounded-xl border border-dashed border-border bg-panel/50 py-16 text-center">
            <div className="max-w-sm">
              <div className="text-sm text-muted">{activeMeta.blurb}</div>
              {activeMeta.uses.length > 0 && (
                <div className="mt-2 text-xs text-muted">Tip: generate {activeMeta.uses.join(", ")} first for best results.</div>
              )}
              <button onClick={() => generateActive(activeTab)} disabled={anyBusy} className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
                Generate {activeMeta.label}
                {activeMeta.grounded ? " 🌐" : ""}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* print-only: active version's full report */}
      <div className="print-only">
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>
          {idea.title} — v{activeVersion.n}
        </h1>
        <p style={{ color: "#555" }}>{activeVersion.statement}</p>
        {meta.map((m) =>
          activeArtifacts[m.kind] ? (
            <div key={m.kind} className="print-section" style={{ marginTop: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{m.label}</h2>
              <SafeArtifact key={`${activeVersionId}:${m.kind}`} kind={m.kind} data={activeArtifacts[m.kind].data} />
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
