"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

const TONE_VAR: Record<string, string> = {
  primary: "var(--primary)",
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  neutral: "var(--text-tertiary)",
};

/** Minimal inline trend line for a table cell or compact card — no axes,
 * grid, or tooltip. See CLAUDE.md's chart guidance: sparklines are a
 * preferred chart type, meant to be glanced at, not read precisely. */
export function Sparkline({
  data,
  tone = "neutral",
  className,
}: {
  data: number[];
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
  className?: string;
}) {
  if (data.length < 2) {
    return <div className={cn("h-8 w-20", className)} />;
  }

  const chartData = data.map((value, index) => ({ index, value }));
  const color = TONE_VAR[tone];

  return (
    <div className={cn("h-8 w-20", className)}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 2, right: 1, bottom: 1, left: 1 }}
        >
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill={color}
            fillOpacity={0.15}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
