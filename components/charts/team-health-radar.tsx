"use client";

import {
  LabelList,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

export type TeamHealthAxis = { axis: string; value: number };

/** shadcn's "Radar Chart - Custom Label" pattern: the value is labeled
 * directly at each point instead of only appearing on hover — consolidates
 * what used to be a separate Target Progress ring and Win Rate metric card
 * into one team-health snapshot. */
export function TeamHealthRadar({ data }: { data: TeamHealthAxis[] }) {
  return (
    <div className="h-[220px] w-full sm:h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="65%">
          <PolarGrid stroke="var(--foreground)" strokeOpacity={0.08} />
          <PolarAngleAxis
            dataKey="axis"
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
          />
          <Radar
            dataKey="value"
            stroke="var(--primary)"
            fill="var(--primary)"
            fillOpacity={0.25}
            strokeWidth={2}
            isAnimationActive
            animationDuration={600}
          >
            <LabelList
              dataKey="value"
              position="outside"
              fill="var(--foreground)"
              fontSize={12}
              fontWeight={600}
              formatter={(value?: unknown) => `${value}%`}
            />
          </Radar>
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
