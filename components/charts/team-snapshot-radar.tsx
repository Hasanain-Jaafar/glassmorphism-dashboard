"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { TeamSnapshotAxis } from "@/lib/company-performance";

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: TeamSnapshotAxis }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-xl border border-glass-border bg-popover/95 px-3.5 py-2.5 text-xs shadow-lg backdrop-blur-2xl">
      <p className="font-medium text-foreground">{point.axis}</p>
      <p className="mt-1 text-text-secondary">{point.value}%</p>
    </div>
  );
}

/** Five pipeline/target percentages on one radar — the only chart on the
 * dashboard built for comparing several dimensions at once, rather than
 * ranking or tracking a single value. */
export function TeamSnapshotRadar({ data }: { data: TeamSnapshotAxis[] }) {
  return (
    <div className="h-[220px] w-full sm:h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="72%">
          <PolarGrid stroke="var(--foreground)" strokeOpacity={0.08} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
          />
          <Tooltip content={<ChartTooltip />} />
          <Radar
            dataKey="value"
            stroke="var(--chart-1)"
            fill="var(--chart-1)"
            fillOpacity={0.25}
            strokeWidth={2}
            isAnimationActive
            animationDuration={600}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
