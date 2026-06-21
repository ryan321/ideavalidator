"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, Badge } from "@/components/ui";

export function MarketTrajectory({
  baseYear,
  endYear,
  cagrPct,
}: {
  baseYear: number;
  endYear: number;
  cagrPct: number;
}) {
  const safeBase = Number.isFinite(baseYear) ? Math.round(baseYear) : 0;
  const safeCagr = Number.isFinite(cagrPct) ? cagrPct : 0;
  const safeEnd =
    Number.isFinite(endYear) && endYear > safeBase
      ? Math.round(endYear)
      : safeBase + 8;

  const data: { year: number; index: number }[] = [];
  for (let year = safeBase; year <= safeEnd; year++) {
    const value =
      Math.round(100 * Math.pow(1 + safeCagr / 100, year - safeBase) * 10) / 10;
    data.push({ year, index: value });
  }

  const last = data.length > 0 ? data[data.length - 1].index : 100;
  const growth = (last / 100).toFixed(1);

  return (
    <Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-fg">Market trajectory</h3>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Projection compounded from a baseline of 100 at {safeBase} using the
            reported CAGR.
          </p>
        </div>
        <Badge tone="accent">
          {safeCagr}% CAGR · {safeBase}–{safeEnd}
        </Badge>
      </div>

      <div className="mt-4 h-[300px] w-full">
        {data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            No projection data available.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="marketTrajectoryFill" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="var(--color-accent)"
                    stopOpacity={0.45}
                  />
                  <stop
                    offset="100%"
                    stopColor="var(--color-accent)"
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="year"
                stroke="var(--color-border)"
                tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                tickLine={false}
              />
              <YAxis
                width={36}
                stroke="var(--color-border)"
                tick={{ fill: "var(--color-muted)", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ stroke: "var(--color-border)" }}
                contentStyle={{
                  background: "var(--color-panel2)",
                  border: "1px solid var(--color-border)",
                  color: "var(--color-fg)",
                  borderRadius: 8,
                }}
                labelStyle={{ color: "var(--color-muted)" }}
                formatter={((value: unknown) => [
                  `${value} (index)`,
                  "Market size",
                ]) as never}
              />
              <Area
                type="monotone"
                dataKey="index"
                stroke="var(--color-accent)"
                strokeWidth={2}
                fill="url(#marketTrajectoryFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="mt-3 font-mono text-xs text-muted">
        {safeBase} baseline 100 · {safeEnd} projection ≈ {last} ({growth}× growth)
      </p>
    </Card>
  );
}
