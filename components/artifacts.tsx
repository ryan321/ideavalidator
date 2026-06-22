import React from "react";
import { Bullets, Card, Field, Prose, Section } from "./ui";
import type { Source } from "@/lib/ai/client";
import type { Validation } from "@/lib/generators/validation";
import type { Market } from "@/lib/generators/market";
import type { Plan } from "@/lib/generators/plan";
import type { Brand } from "@/lib/generators/brand";
import type { Logo } from "@/lib/generators/logo";
import type { Marketing } from "@/lib/generators/marketing";
import type { Pitch } from "@/lib/generators/pitch";

// Report subcomponents (built as standalone files).
import { CriteriaRadar } from "./report/CriteriaRadar";
import { FactorBars } from "./report/FactorBars";
import { ValidationSummary } from "./report/ValidationSummary";
import { ValidationScorecard } from "./report/ValidationScorecard";
import { ActionPlan } from "./report/ActionPlan";
import { RiskMatrix } from "./report/RiskMatrix";
import { MarketHeader } from "./report/MarketHeader";
import { MarketSizing } from "./report/MarketSizing";
import { MarketTrajectory } from "./report/MarketTrajectory";
import { MarketStage } from "./report/MarketStage";
import { DemandSignals } from "./report/DemandSignals";
import { CompetitiveLandscape } from "./report/CompetitiveLandscape";
import { TargetDiscovery } from "./report/TargetDiscovery";
import { FinancialsView } from "./report/FinancialsView";

export { FinancialsView };

function scoreColor(n: number): string {
  if (n >= 70) return "var(--color-good)";
  if (n >= 45) return "var(--color-warn)";
  return "var(--color-bad)";
}

export function ScoreGauge({ score, size = 120 }: { score: number; size?: number }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const dash = (Math.max(0, Math.min(100, score)) / 100) * c;
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-border)" strokeWidth={8} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x="50%" y="48%" textAnchor="middle" fontSize={size * 0.28} fontWeight={700} fill={color} fontFamily="var(--font-mono)">
        {Math.round(score)}
      </text>
      <text x="50%" y="66%" textAnchor="middle" fontSize={size * 0.1} fill="var(--color-muted)">
        / 100
      </text>
    </svg>
  );
}

export function SourcesList({ sources }: { sources: Source[] }) {
  if (!sources?.length) return null;
  return (
    <Section title={`Sources (${sources.length})`}>
      <ul className="space-y-1">
        {sources.map((s, i) => (
          <li key={i} className="truncate text-sm">
            <a href={s.url} target="_blank" rel="noreferrer" className="text-accent2 hover:underline">
              {s.title}
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// Defense-in-depth for model-generated SVG rendered via dangerouslySetInnerHTML.
// Strip active/embedding elements and any vector for script execution or remote loads.
function sanitizeSvg(svg: string): string {
  return svg
    .replace(/<\s*(script|foreignObject|iframe|a|image|use|set|animate\w*)\b[\s\S]*?<\/\s*\1\s*>/gi, "")
    .replace(/<\s*(script|foreignObject|iframe|a|image|use|set|animate\w*)\b[^>]*\/?>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "") // quoted event handlers
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, "") // unquoted event handlers
    .replace(/(href|xlink:href)\s*=\s*(["'])\s*(javascript|data):[^"']*\2/gi, "") // dangerous URLs
    .replace(/(href|xlink:href)\s*=\s*(["'])\s*(https?:)?\/\/[^"']*\2/gi, "") // external refs
    .replace(/url\(\s*['"]?\s*(https?:)?\/\/[^)]*\)/gi, "none"); // external url() refs
}

export function SvgLogo({ svg }: { svg: string }) {
  return (
    <div
      className="grid h-44 w-44 place-items-center rounded-xl border border-border bg-white p-3 [&_svg]:h-full [&_svg]:w-full"
      dangerouslySetInnerHTML={{ __html: sanitizeSvg(svg) }}
    />
  );
}

// ---- Validation (composed) ---------------------------------------------------

// good if value===good, warn if ===mid, else bad.
function tone3(value: string, good: string, mid: string): string {
  return value === good
    ? "var(--color-good)"
    : value === mid
      ? "var(--color-warn)"
      : "var(--color-bad)";
}

function StatTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel2 p-2.5">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted">{label}</div>
      <div
        className="mt-0.5 text-sm font-semibold leading-snug [overflow-wrap:anywhere]"
        style={color ? { color } : undefined}
      >
        {value}
      </div>
    </div>
  );
}

function DetailRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</div>
      {children}
    </div>
  );
}

export function ValidationView({ d }: { d: Validation }) {
  return (
    <div className="space-y-8">
      <Card className="border-accent2/30 bg-accent2/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              Obtainable revenue / yr
            </div>
            <div className="mt-1 font-mono text-3xl font-bold leading-tight text-accent2 [overflow-wrap:anywhere]">
              {d.demand?.obtainable_revenue ?? "—"}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span
                className="rounded-lg px-2.5 py-1 text-base font-bold"
                style={{
                  color: scoreColor(d.score),
                  background: "color-mix(in srgb, " + scoreColor(d.score) + " 15%, transparent)",
                }}
              >
                {d.verdict}
              </span>
              <div className="mt-1 text-xs text-muted">{d.confidence}% confidence</div>
            </div>
            <ScoreGauge score={d.score} size={76} />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {d.demand && (
            <StatTile label="Demand" value={d.demand.strength} color={tone3(d.demand.strength, "Strong", "Moderate")} />
          )}
          {d.demand && <StatTile label="Pays" value={d.demand.willingness_to_pay} />}
          {d.operating && (
            <StatTile label="Effort to run" value={d.operating.effort_level} color={tone3(d.operating.effort_level, "Low", "Medium")} />
          )}
          {d.acquisition && (
            <StatTile label="Hard to sell" value={d.acquisition.difficulty} color={tone3(d.acquisition.difficulty, "Easy", "Moderate")} />
          )}
        </div>
        <p className="mt-4 text-sm leading-relaxed text-fg/90">{d.summary}</p>
      </Card>

      {d.narrative && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">
              Why they'll buy — pain → obvious solution
            </div>
            <span
              className="rounded-full border px-2.5 py-0.5 text-xs font-bold"
              style={{
                color:
                  d.narrative.verdict === "Painkiller" ? "var(--color-good)" : "var(--color-warn)",
                borderColor:
                  d.narrative.verdict === "Painkiller"
                    ? "color-mix(in srgb, var(--color-good) 40%, transparent)"
                    : "color-mix(in srgb, var(--color-warn) 40%, transparent)",
              }}
            >
              {d.narrative.verdict}
            </span>
          </div>
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-[150px_1fr]">
            {[
              ["Who feels it", d.narrative.who, ""],
              ["The pain", d.narrative.pain, ""],
              ["Today they", d.narrative.status_quo, "text-muted"],
              ["Cost of doing nothing", d.narrative.cost_of_inaction, "text-bad"],
              ["Your solution", d.narrative.solution, "text-accent"],
              ["After", d.narrative.after, "text-good"],
            ].map(([label, text, cls]) => (
              <React.Fragment key={label}>
                <div className="text-xs uppercase tracking-wide text-muted sm:pt-0.5">{label}</div>
                <div className={`leading-relaxed ${cls}`}>{text}</div>
              </React.Fragment>
            ))}
          </div>
          <p className="mt-3 border-t border-border pt-2 text-xs text-muted">
            <b className="text-fg/80">{d.narrative.verdict}:</b> {d.narrative.why}
          </p>
        </Card>
      )}

      {(d.demand || d.operating || d.acquisition || d.downside) && (
        <details className="group rounded-xl border border-border bg-panel">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-3 text-sm font-medium text-muted hover:text-fg">
            <span className="transition group-open:rotate-90">▸</span>
            Forecast detail — demand & pricing, day-to-day, sales & downside
          </summary>
          <div className="space-y-5 border-t border-border p-5">
            {d.demand && (
              <DetailRow title="Demand & pricing">
                <p className="text-sm">
                  <span className="text-muted">Willingness to pay: </span>
                  {d.demand.willingness_to_pay}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">{d.demand.reasoning}</p>
              </DetailRow>
            )}
            {d.operating && (
              <DetailRow title={`What running it is like · ${d.operating.effort_level} effort`}>
                <p className="text-sm leading-relaxed text-fg/90">{d.operating.description}</p>
              </DetailRow>
            )}
            {d.acquisition && (
              <DetailRow title={`How hard to sell · ${d.acquisition.difficulty}`}>
                <p className="text-sm leading-relaxed text-fg/90">{d.acquisition.reasoning}</p>
              </DetailRow>
            )}
            {d.downside && (
              <DetailRow title="Downside / what's at risk">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Capital at risk" value={d.downside.capital_at_risk} />
                  <Field label="Liability" value={d.downside.liability} />
                  <Field label="If it fails" value={d.downside.if_it_fails} />
                </div>
              </DetailRow>
            )}
          </div>
        </details>
      )}

      <Section title="Visual Overview">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card>
            <CriteriaRadar criteria={d.criteria} />
          </Card>
          <FactorBars criteria={d.criteria} />
        </div>
      </Section>

      <ValidationSummary go={d.go_signals} stop={d.stop_signals} />
      <ValidationScorecard validations={d.validations} criteria={d.criteria} />
      <ActionPlan steps={d.action_plan} />
      <RiskMatrix risks={d.risk_matrix} />
      {d.clarifying_questions && d.clarifying_questions.length > 0 && (
        <Section title="Open questions from the validator">
          <Card className="border-accent2/30 bg-accent2/5">
            <p className="mb-2 text-xs text-muted">
              Answer these via “💬 Respond to validator” to sharpen the next validation.
            </p>
            <Bullets items={d.clarifying_questions} />
          </Card>
        </Section>
      )}
    </div>
  );
}

// ---- Market (composed) -------------------------------------------------------

export function MarketView({ d }: { d: Market }) {
  return (
    <div className="space-y-8">
      <Prose>{d.summary}</Prose>
      <MarketHeader cagrLabel={d.cagr_label} maturity={d.maturity} competitorCount={d.competitors.length} />
      <MarketSizing sizing={d.sizing} cagrPct={d.cagr_pct} />
      <MarketTrajectory baseYear={d.trajectory.base_year} endYear={d.trajectory.end_year} cagrPct={d.cagr_pct} />
      <MarketStage
        maturity={d.maturity}
        maturityRationale={d.maturity_rationale}
        seasonality={d.seasonality}
        regions={d.regions}
      />
      <DemandSignals reddit={d.demand_signals.reddit} search={d.demand_signals.search_trends} />
      <CompetitiveLandscape competitors={d.competitors} />
      <TargetDiscovery persona={d.persona} discovery={d.discovery} />
      <Field label="Pricing recommendation" value={d.pricing_recommendation} />
    </div>
  );
}

// ---- Plan / Brand / Logo / Marketing / Pitch (unchanged schemas) -------------

export function PlanView({ d }: { d: Plan }) {
  const sections: [string, string][] = [
    ["Executive summary", d.executive_summary],
    ["Problem", d.problem],
    ["Solution", d.solution],
    ["Business model", d.business_model],
    ["Go-to-market", d.go_to_market],
    ["Team & operations", d.team_and_ops],
    ["Risks & mitigations", d.risks_and_mitigations],
  ];
  return (
    <div className="space-y-6">
      {sections.map(([title, body]) => (
        <Section key={title} title={title}>
          <Prose>{body}</Prose>
        </Section>
      ))}
      <Section title="Financials">
        <Card className="p-4">
          <Prose>{d.financials.summary}</Prose>
          <div className="mt-3">
            <Field label="Year 1 revenue" value={d.financials.year1_revenue} />
          </div>
          <div className="mt-3 text-xs font-medium text-muted">Assumptions</div>
          <Bullets items={d.financials.assumptions} />
        </Card>
      </Section>
      <Section title="Milestones">
        <div className="space-y-2">
          {d.milestones.map((m, i) => (
            <div key={i} className="flex gap-3 text-sm">
              <span className="w-28 shrink-0 font-mono text-accent2">{m.when}</span>
              <span>{m.goal}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function BrandView({ d }: { d: Brand }) {
  return (
    <div>
      <Card className="mb-6 p-5">
        <div className="text-xs uppercase tracking-wide text-muted">Archetype</div>
        <div className="text-xl font-bold text-accent">{d.archetype.name}</div>
        <p className="mt-1 text-sm text-muted">{d.archetype.why}</p>
      </Card>
      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="Mission" value={d.mission} />
        <Field label="Vision" value={d.vision} />
      </div>
      <div className="mt-6">
        <Field label="Value proposition" value={d.value_proposition} />
      </div>
      <div className="mt-6">
        <Field label="Positioning statement" value={d.positioning_statement} />
      </div>
      <Section title="Name ideas">
        <div className="mt-3 flex flex-wrap gap-2">
          {d.name_ideas.map((n, i) => (
            <span key={i} className="rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-xs text-accent">
              {n}
            </span>
          ))}
        </div>
      </Section>
      <Section title="Taglines">
        <Bullets items={d.tagline_options} />
      </Section>
      <div className="grid gap-6 sm:grid-cols-2">
        <Section title={`Voice — do (${d.tone})`}>
          <Bullets items={d.voice_dos} />
        </Section>
        <Section title="Voice — don't">
          <Bullets items={d.voice_donts} />
        </Section>
      </div>
    </div>
  );
}

export function LogoView({ d }: { d: Logo }) {
  return (
    <div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <SvgLogo svg={d.logo_svg} />
        <div className="flex-1">
          <div className="text-lg font-semibold">{d.wordmark}</div>
          <p className="mt-1 text-sm text-muted">{d.concept}</p>
        </div>
      </div>
      <Section title="Palette">
        <div className="mt-3 flex flex-wrap gap-3">
          {d.palette.map((c, i) => (
            <div key={i} className="w-32">
              <div className="h-16 rounded-lg border border-border" style={{ background: c.hex }} />
              <div className="mt-1 text-sm font-medium">{c.name}</div>
              <div className="font-mono text-xs text-muted">{c.hex}</div>
              <div className="text-xs text-muted">{c.usage}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Typography">
        <div className="grid gap-3 sm:grid-cols-2">
          <Card className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted">Heading</div>
            <div className="text-lg font-semibold">{d.typography.heading.font}</div>
            <p className="text-xs text-muted">{d.typography.heading.note}</p>
          </Card>
          <Card className="p-4">
            <div className="text-xs uppercase tracking-wide text-muted">Body</div>
            <div className="text-lg font-semibold">{d.typography.body.font}</div>
            <p className="text-xs text-muted">{d.typography.body.note}</p>
          </Card>
        </div>
      </Section>
      <Section title="Usage notes">
        <Bullets items={d.usage_notes} />
      </Section>
    </div>
  );
}

export function MarketingView({ d }: { d: Marketing }) {
  return (
    <div>
      <Section title="Ad creatives">
        <div className="grid gap-3 sm:grid-cols-2">
          {d.ads.map((a, i) => (
            <Card key={i} className="p-4">
              <span className="rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-xs text-accent">
                {a.platform}
              </span>
              <div className="mt-2 text-sm font-semibold">{a.headline}</div>
              <p className="mt-1 text-sm text-muted">{a.primary_text}</p>
              <div className="mt-2 text-xs">
                <span className="text-accent">CTA:</span> {a.cta}
              </div>
              <div className="mt-1 text-xs text-muted">Visual: {a.visual_idea}</div>
            </Card>
          ))}
        </div>
      </Section>
      <Section title="Landing page copy">
        <Card className="p-5">
          <div className="text-xl font-bold">{d.landing_copy.hero_headline}</div>
          <p className="mt-1 text-sm text-muted">{d.landing_copy.subheadline}</p>
          <div className="mt-3">
            <Bullets items={d.landing_copy.bullets} />
          </div>
          <div className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">
            {d.landing_copy.cta}
          </div>
        </Card>
      </Section>
      <Section title="Email sequence">
        <div className="space-y-3">
          {d.email_sequence.map((e, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-xs text-accent">
                  {e.stage}
                </span>
                <span className="text-sm font-semibold">{e.subject}</span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{e.body}</p>
            </Card>
          ))}
        </div>
      </Section>
      <Section title="UGC scripts">
        <div className="space-y-3">
          {d.ugc_scripts.map((u, i) => (
            <Card key={i} className="p-4">
              <span className="rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-xs text-accent">
                {u.platform}
              </span>
              <div className="mt-2 text-sm font-semibold">Hook: {u.hook}</div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-muted">{u.script}</p>
              <div className="mt-1 text-xs">
                <span className="text-accent">CTA:</span> {u.cta}
              </div>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}

export function PitchView({ d }: { d: Pitch }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {d.slides.map((s, i) => (
        <Card key={i} className="flex flex-col p-5">
          <div className="font-mono text-xs text-muted">Slide {i + 1}</div>
          <div className="mt-1 text-base font-bold">{s.title}</div>
          <div className="text-sm text-accent2">{s.subtitle}</div>
          <div className="mt-3 flex-1">
            <Bullets items={s.bullets} />
          </div>
          <p className="mt-3 border-t border-border pt-2 text-xs italic text-muted">{s.speaker_notes}</p>
        </Card>
      ))}
    </div>
  );
}
