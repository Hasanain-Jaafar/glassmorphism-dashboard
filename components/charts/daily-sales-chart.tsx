"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatUSD } from "@/lib/format";

export type DailySalesPoint = { label: string; amount: number };

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: DailySalesPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-xl border border-glass-border bg-popover/95 px-3.5 py-2.5 text-xs shadow-lg backdrop-blur-2xl">
      <p className="font-medium text-foreground">{point.label}</p>
      <p className="mt-1 text-text-secondary">{formatUSD(point.amount)}</p>
    </div>
  );
}

/** 7-bar Saturday→Friday sales chart for the weekly report — see lib/weekly-report.ts. */
export function DailySalesChart({ data }: { data: DailySalesPoint[] }) {
  return (
    <div className="h-[220px] w-full sm:h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--foreground)" strokeOpacity={0.06} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
            dy={8}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "var(--foreground)", fillOpacity: 0.04 }}
          />
          <Bar
            dataKey="amount"
            radius={[6, 6, 0, 0]}
            fill="var(--chart-1)"
            isAnimationActive
            animationDuration={600}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
