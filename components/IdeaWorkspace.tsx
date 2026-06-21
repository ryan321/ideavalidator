"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Artifact, ArtifactKind, Idea } from "@/lib/db";
import type { GeneratorMeta } from "@/lib/generators";
import {
  BrandView,
  LogoView,
  MarketingView,
  MarketView,
  PitchView,
  PlanView,
  SourcesList,
  ValidationView,
} from "./artifacts";

const VIEWS: Record<ArtifactKind, React.ComponentType<{ d: never }>> = {
  validation: ValidationView as never,
  market: MarketView as never,
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

export default function IdeaWorkspace({
  idea,
  initialArtifacts,
  meta,
}: {
  idea: Idea;
  initialArtifacts: Artifact[];
  meta: GeneratorMeta[];
}) {
  const router = useRouter();
  const [artifacts, setArtifacts] = useState<Record<string, Artifact>>(() =>
    Object.fromEntries(initialArtifacts.map((a) => [a.kind, a]))
  );
  const [active, setActive] = useState<ArtifactKind>(
    () => (initialArtifacts[0]?.kind as ArtifactKind) ?? meta[0].kind
  );
  const [busy, setBusy] = useState<Set<ArtifactKind>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const metaByKind = useMemo(
    () => Object.fromEntries(meta.map((m) => [m.kind, m])),
    [meta]
  );

  async function generate(kind: ArtifactKind) {
    setError(null);
    setBusy((b) => new Set(b).add(kind));
    setActive(kind);
    try {
      const res = await fetch(`/api/generate/${kind}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ideaId: idea.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Generation failed");
      setArtifacts((prev) => ({ ...prev, [kind]: json as Artifact }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy((b) => {
        const n = new Set(b);
        n.delete(kind);
        return n;
      });
    }
  }

  async function generateAll() {
    for (const m of meta) {
      if (!artifacts[m.kind]) await generate(m.kind);
    }
  }

  async function remove() {
    if (!confirm("Delete this idea and all its artifacts?")) return;
    await fetch(`/api/ideas/${idea.id}`, { method: "DELETE" });
    router.push("/");
  }

  const activeArtifact = artifacts[active];
  const activeMeta = metaByKind[active];
  const anyBusy = busy.size > 0;

  return (
    <div>
      <div className="no-print">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold">{idea.title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">{idea.prompt}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              onClick={generateAll}
              disabled={anyBusy}
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {anyBusy ? "Generating…" : "Generate all"}
            </button>
            <button
              onClick={() => window.print()}
              className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-panel2"
            >
              Print / PDF
            </button>
            <button
              onClick={remove}
              className="rounded-lg border border-border px-3 py-1.5 text-sm text-bad hover:bg-panel2"
            >
              Delete
            </button>
          </div>
        </div>

        {/* tabs */}
        <div className="mb-6 flex flex-wrap gap-1.5 border-b border-border pb-3">
          {meta.map((m) => {
            const done = !!artifacts[m.kind];
            const loading = busy.has(m.kind);
            return (
              <button
                key={m.kind}
                onClick={() => setActive(m.kind)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition ${
                  active === m.kind
                    ? "bg-panel2 text-fg"
                    : "text-muted hover:text-fg"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    loading
                      ? "animate-pulse bg-accent2"
                      : done
                        ? "bg-good"
                        : "bg-border"
                  }`}
                />
                {m.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-bad/30 bg-bad/10 px-4 py-2 text-sm text-bad">
            {error}
          </div>
        )}

        {/* active panel */}
        {busy.has(active) ? (
          <div className="grid place-items-center rounded-xl border border-border bg-panel py-16 text-sm text-muted">
            <div className="animate-pulse">
              Generating {activeMeta.label}
              {activeMeta.grounded ? " (searching the web)" : ""}…
            </div>
          </div>
        ) : activeArtifact ? (
          <div>
            {renderView(active, activeArtifact.data)}
            <SourcesList sources={activeArtifact.sources} />
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
              <span>Model: {activeArtifact.model ?? "—"}</span>
              <button
                onClick={() => generate(active)}
                className="rounded-md border border-border px-2 py-1 hover:bg-panel2"
              >
                Regenerate
              </button>
            </div>
          </div>
        ) : (
          <div className="grid place-items-center rounded-xl border border-dashed border-border bg-panel/50 py-16 text-center">
            <div className="max-w-sm">
              <div className="text-sm text-muted">{activeMeta.blurb}</div>
              {activeMeta.uses.length > 0 && (
                <div className="mt-2 text-xs text-muted">
                  Tip: generate {activeMeta.uses.join(", ")} first for best results.
                </div>
              )}
              <button
                onClick={() => generate(active)}
                disabled={anyBusy}
                className="mt-4 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                Generate {activeMeta.label}
                {activeMeta.grounded ? " 🌐" : ""}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* print-only: full stacked report for one-click PDF */}
      <div className="print-only">
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>{idea.title}</h1>
        <p style={{ color: "#555" }}>{idea.prompt}</p>
        {meta.map((m) =>
          artifacts[m.kind] ? (
            <div key={m.kind} style={{ marginTop: 24, breakInside: "avoid" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                {m.label}
              </h2>
              {renderView(m.kind, artifacts[m.kind].data)}
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
