import React from "react";
import { Card, Section } from "@/components/ui";

type Persona = {
  title: string;
  roles: string[];
  region: string;
  pains: string[];
  current_solutions: string[];
  jobs_to_be_done: string[];
};

type Experiment = {
  name: string;
  timeline: string;
  budget: string;
  metric: string;
};

type Discovery = {
  interview_questions: string[];
  experiments: Experiment[];
};

function PersonaColumn({
  title,
  items,
  glyph,
  glyphClass,
}: {
  title: string;
  items: string[];
  glyph: string;
  glyphClass: string;
}) {
  const safe = Array.isArray(items) ? items : [];
  return (
    <div>
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted">
        {title}
      </div>
      {safe.length === 0 ? (
        <p className="text-xs italic text-muted">None identified.</p>
      ) : (
        <ul className="space-y-2">
          {safe.map((it, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-sm leading-relaxed text-fg/90"
            >
              <span className={`mt-0.5 shrink-0 font-mono text-xs ${glyphClass}`}>
                {glyph}
              </span>
              <span className="flex-1">{it}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TargetDiscovery({
  persona,
  discovery,
}: {
  persona: {
    title: string;
    roles: string[];
    region: string;
    pains: string[];
    current_solutions: string[];
    jobs_to_be_done: string[];
  };
  discovery: {
    interview_questions: string[];
    experiments: {
      name: string;
      timeline: string;
      budget: string;
      metric: string;
    }[];
  };
}) {
  const p: Persona = persona ?? ({} as Persona);
  const d: Discovery = discovery ?? ({} as Discovery);

  const roles = Array.isArray(p.roles) ? p.roles : [];
  const questions = Array.isArray(d.interview_questions)
    ? d.interview_questions
    : [];
  const experiments = Array.isArray(d.experiments) ? d.experiments : [];

  return (
    <Section title="Target Customer & Discovery">
      {/* PERSONA */}
      <Card className="mb-4">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-accent/80">
          Target Persona
        </div>
        <h4 className="mt-1 text-lg font-bold leading-tight text-fg sm:text-xl">
          {p.title || "Unknown persona"}
        </h4>

        {(roles.length > 0 || p.region) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {roles.map((role, i) => (
              <span
                key={i}
                className="inline-block rounded-full border border-border bg-panel2 px-2.5 py-0.5 text-xs font-medium text-fg/90"
              >
                {role}
              </span>
            ))}
            {p.region ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent">
                <span aria-hidden>📍</span>
                {p.region}
              </span>
            ) : null}
          </div>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <PersonaColumn
            title="Pain Points"
            items={p.pains}
            glyph="✕"
            glyphClass="text-bad"
          />
          <PersonaColumn
            title="Current Solutions"
            items={p.current_solutions}
            glyph="·"
            glyphClass="text-muted"
          />
          <PersonaColumn
            title="Jobs To Be Done"
            items={p.jobs_to_be_done}
            glyph="→"
            glyphClass="text-accent"
          />
        </div>
      </Card>

      {/* DISCOVERY */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* LEFT — Interview Questions */}
        <Card>
          <h4 className="mb-3 text-base font-semibold text-fg">
            Key Interview Questions
          </h4>
          {questions.length === 0 ? (
            <p className="text-xs italic text-muted">No questions drafted.</p>
          ) : (
            <ul className="space-y-2">
              {questions.map((q, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2.5 rounded-lg border border-border bg-panel2 px-3 py-2 text-sm leading-relaxed text-fg/90"
                >
                  <span className="mt-0.5 shrink-0 font-mono text-sm font-semibold text-muted">
                    ?
                  </span>
                  <span className="flex-1">{q}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* RIGHT — Validation Experiments */}
        <Card>
          <h4 className="mb-3 text-base font-semibold text-fg">
            Validation Experiments
          </h4>
          {experiments.length === 0 ? (
            <p className="text-xs italic text-muted">No experiments planned.</p>
          ) : (
            <div className="space-y-2.5">
              {experiments.map((ex, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-panel2 p-3"
                >
                  <div className="text-sm font-bold text-fg">
                    {ex?.name || `Experiment ${i + 1}`}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    Timeline:{" "}
                    <span className="font-mono">{ex?.timeline ?? "—"}</span>{" "}
                    · Budget:{" "}
                    <span className="font-mono">{ex?.budget ?? "—"}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    Metric:{" "}
                    <span className="font-mono text-accent2">
                      {ex?.metric ?? "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Section>
  );
}
