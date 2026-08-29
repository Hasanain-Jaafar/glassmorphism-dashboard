"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatNumber } from "@/lib/format";

export type DonutSegment = {
  id: string;
  label: string;
  value: number;
  colorVar: string;
};

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DonutSegment }[];
}) {
  if (!active || !payload?.length) return null;
  const segment = payload[0].payload;

  return (
    <div className="rounded-xl border border-glass-border bg-popover/95 px-3.5 py-2.5 text-xs shadow-lg backdrop-blur-2xl">
      <p className="font-medium text-foreground">{segment.label}</p>
      <p className="mt-1 text-text-secondary">{formatNumber(segment.value)}</p>
    </div>
  );
}

/** Real Recharts pie chart (donut via innerRadius) — same segment shape as
 * before, now with real hover tooltips instead of a hand-drawn SVG ring. */
export function DonutChart({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: string;
}) {
  const visible = segments.filter((segment) => segment.value > 0);

  return (
    <div className="flex items-center gap-6">
      <div className="relative size-[152px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={visible}
              dataKey="value"
              nameKey="label"
              innerRadius={56}
              outerRadius={76}
              paddingAngle={visible.length > 1 ? 2 : 0}
              stroke="none"
              isAnimationActive
              animationDuration={600}
            >
              {visible.map((segment) => (
                <Cell key={segment.id} fill={segment.colorVar} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold text-foreground">
            {centerValue}
          </span>
          <span className="text-[11px] text-text-tertiary">{centerLabel}</span>
        </div>
      </div>

      <ul className="flex-1 space-y-2.5">
        {segments.map((segment) => (
          <li
            key={segment.id}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: segment.colorVar }}
              />
              <span className="truncate text-text-secondary">
                {segment.label}
              </span>
            </span>
            <span className="shrink-0 font-medium text-foreground">
              {formatNumber(segment.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
