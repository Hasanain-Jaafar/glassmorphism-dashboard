"use client";

import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { RankedTeamMember } from "@/lib/supabase/team";
import { formatUSD, formatPercent } from "@/lib/format";

const REP_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

type Metric = { key: string; label: string; format: (n: number) => string };

const METRICS: Metric[] = [
  { key: "sales", label: "Sales", format: formatUSD },
  { key: "deals", label: "Deals", format: (n) => String(n) },
  { key: "conversion", label: "Conversion", format: (n) => formatPercent(n, 0) },
  { key: "avgDeal", label: "Avg Deal", format: formatUSD },
];

function ChartTooltip({
  active,
  payload,
  reps,
}: {
  active?: boolean;
  payload?: {
    dataKey: string;
    value: number;
    color: string;
    payload: { metric: string };
  }[];
  reps: RankedTeamMember[];
}) {
  if (!active || !payload?.length) return null;
  const metricLabel = payload[0]?.payload?.metric;
  const metric = METRICS.find((m) => m.label === metricLabel);

  return (
    <div className="rounded-xl border border-glass-border bg-popover/95 px-3.5 py-2.5 text-xs shadow-lg backdrop-blur-2xl">
      <p className="font-medium text-foreground">{metricLabel}</p>
      {payload.map((entry) => {
        const rep = reps.find((r) => r.id === entry.dataKey);
        if (!rep || !metric) return null;
        const raw =
          metric.key === "sales"
            ? rep.yearlySales
            : metric.key === "deals"
              ? rep.closedDeals
              : metric.key === "conversion"
                ? rep.conversionRate
                : rep.avgDeal;
        return (
          <p
            key={entry.dataKey}
            className="mt-1 flex items-center gap-1.5 text-text-secondary"
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            {rep.name} —{" "}
            <span className="font-medium text-foreground">
              {metric.format(raw)}
            </span>
          </p>
        );
      })}
    </div>
  );
}

/** shadcn's "Radar Chart - Multiple" + "Legend" patterns combined: the top
 * reps overlaid on one radar, each axis normalized to the leader on that
 * axis (so every rep's shape is comparable), replacing a plain ranked bar
 * list with a real multi-dimensional comparison. */
export function RepComparisonRadar({ reps }: { reps: RankedTeamMember[] }) {
  const top = reps.slice(0, 3);

  const data = METRICS.map((metric) => {
    const values = top.map((rep) =>
      metric.key === "sales"
        ? rep.yearlySales
        : metric.key === "deals"
          ? rep.closedDeals
          : metric.key === "conversion"
            ? rep.conversionRate
            : rep.avgDeal
    );
    const max = Math.max(...values, 1);

    const row: Record<string, string | number> = { metric: metric.label };
    top.forEach((rep, i) => {
      row[rep.id] = Math.round((values[i] / max) * 100);
    });
    return row;
  });

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="65%">
          <PolarGrid stroke="var(--foreground)" strokeOpacity={0.08} />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
          />
          <Tooltip content={<ChartTooltip reps={top} />} />
          {top.map((rep, i) => (
            <Radar
              key={rep.id}
              name={rep.name}
              dataKey={rep.id}
              stroke={REP_COLORS[i % REP_COLORS.length]}
              fill={REP_COLORS[i % REP_COLORS.length]}
              fillOpacity={0.15}
              strokeWidth={2}
              isAnimationActive
              animationDuration={600}
            />
          ))}
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
            iconType="circle"
            iconSize={8}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
