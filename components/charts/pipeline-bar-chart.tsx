"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PipelineStage } from "@/lib/mock-data";
import { formatNumber } from "@/lib/format";

const STAGE_COLORS = ["var(--primary)", "#8f7fff", "var(--chart-2)", "var(--chart-3)"];

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: PipelineStage }[];
}) {
  if (!active || !payload?.length) return null;
  const stage = payload[0].payload;

  return (
    <div className="rounded-xl border border-glass-border bg-popover/95 px-3.5 py-2.5 text-xs shadow-lg backdrop-blur-2xl">
      <p className="font-medium text-foreground">{stage.label}</p>
      <p className="mt-1 text-text-secondary">{formatNumber(stage.value)}</p>
    </div>
  );
}

/** shadcn's "Bar Chart - Custom Label" pattern: horizontal bars with the
 * category labeled inside the bar and the value labeled at its end, instead
 * of a separate axis or legend. */
export function PipelineBarChart({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={stages}
          layout="vertical"
          margin={{ top: 4, right: 28, bottom: 4, left: 4 }}
        >
          <XAxis dataKey="value" type="number" hide />
          <YAxis dataKey="label" type="category" hide />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "var(--foreground)", fillOpacity: 0.04 }}
          />
          <Bar dataKey="value" radius={6} isAnimationActive animationDuration={600}>
            {stages.map((stage, index) => (
              <Cell key={stage.key} fill={STAGE_COLORS[index % STAGE_COLORS.length]} />
            ))}
            <LabelList
              dataKey="label"
              position="insideLeft"
              offset={10}
              fill="#ffffff"
              fontSize={12}
              fontWeight={500}
            />
            <LabelList
              dataKey="value"
              position="right"
              offset={8}
              fill="var(--foreground)"
              fontSize={13}
              fontWeight={600}
              formatter={(value?: unknown) => formatNumber(Number(value))}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
