"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, Section, Badge } from "@/components/ui";
import { criterionLabel } from "@/lib/i18n/t";
import { useT } from "../LocaleProvider";

type Criterion = {
  name: string;
  score: number;
  group: "demand" | "build";
  category: string;
  explanation: string;
};

export function CriteriaRadar({ criteria }: { criteria: Criterion[] }) {
  const t = useT();
  const items = Array.isArray(criteria) ? criteria.filter(Boolean) : [];

  if (items.length === 0) {
    return (
      <Section title={t("report.criteriaRadar")}>
        <Card>
          <p className="text-sm text-muted">{t("report.noCriteriaYet")}</p>
        </Card>
      </Section>
    );
  }

  const data = items.map((c) => ({
    name: criterionLabel(c.name, t),
    score: Math.max(0, Math.min(100, Number(c.score) || 0)),
  }));

  return (
    <Section
      title={t("report.criteriaRadar")}
      right={
        <Badge tone="accent">
          {t("report.criteriaCount", { n: items.length })}
        </Badge>
      }
    >
      <Card>
        <p className="mb-3 text-xs text-muted">{t("report.criteriaRadarHint")}</p>
        {/* on-screen: responsive (measures its container) */}
        <div className="no-print h-[360px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} outerRadius="72%">
              <PolarGrid stroke="var(--color-border)" />
              <PolarAngleAxis
                dataKey="name"
                tick={{ fill: "var(--color-muted)", fontSize: 11 }}
              />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              <Radar
                dataKey="score"
                stroke="var(--color-accent)"
                fill="var(--color-accent)"
                fillOpacity={0.35}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--color-panel2)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-fg)",
                  borderRadius: 8,
                }}
                itemStyle={{ color: "var(--color-fg)" }}
                labelStyle={{ color: "var(--color-muted)" }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        {/* print: fixed size so it renders without needing to measure a hidden box.
            (.print-only hides it on screen; an inline display:none would also beat
            the @media print rule and blank the radar in the PDF) */}
        <div className="print-only keep-color">
          <RadarChart width={560} height={360} data={data} outerRadius="72%">
            <PolarGrid stroke="#bbbbbb" />
            <PolarAngleAxis dataKey="name" tick={{ fill: "#444444", fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="score" stroke="#5a8fcf" fill="#5a8fcf" fillOpacity={0.35} />
          </RadarChart>
        </div>
      </Card>
    </Section>
  );
}
