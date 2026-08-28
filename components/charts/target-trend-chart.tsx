"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import type { TrendPoint } from "@/lib/sales-analytics";
import { formatUSD } from "@/lib/format";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  const actual = payload.find((p) => p.dataKey === "actual")?.value;
  const target = payload.find((p) => p.dataKey === "target")?.value;

  return (
    <div className="rounded-xl border border-glass-border bg-popover/95 px-3.5 py-2.5 text-xs shadow-lg backdrop-blur-2xl">
      <p className="font-medium text-foreground">{label}</p>
      {typeof actual === "number" && (
        <p className="mt-1 flex items-center gap-1.5 text-text-secondary">
          <span className="size-1.5 rounded-full bg-primary" />
          Actual — <span className="font-medium text-foreground">{formatUSD(actual)}</span>
        </p>
      )}
      {typeof target === "number" && (
        <p className="mt-0.5 flex items-center gap-1.5 text-text-secondary">
          <span className="size-1.5 rounded-full bg-[#fb923c]" />
          Target — <span className="font-medium text-foreground">{formatUSD(target)}</span>
        </p>
      )}
    </div>
  );
}

export function TargetTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-[220px] w-full sm:h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="targetTrendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--foreground)"
            strokeOpacity={0.06}
          />
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
            dy={8}
          />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="target"
            stroke="#fb923c"
            strokeOpacity={0.55}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            fill="none"
            isAnimationActive
            animationDuration={700}
          />
          <Area
            type="monotone"
            dataKey="actual"
            stroke="var(--chart-1)"
            strokeWidth={2.5}
            fill="url(#targetTrendFill)"
            isAnimationActive
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
