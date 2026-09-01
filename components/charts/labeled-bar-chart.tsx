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
import { formatNumber } from "@/lib/format";

export type LabeledBar = {
  key: string;
  label: string;
  value: number;
  colorVar: string;
};

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: LabeledBar }[];
}) {
  if (!active || !payload?.length) return null;
  const bar = payload[0].payload;

  return (
    <div className="rounded-xl border border-glass-border bg-popover/95 px-3.5 py-2.5 text-xs shadow-lg backdrop-blur-2xl">
      <p className="font-medium text-foreground">{bar.label}</p>
      <p className="mt-1 text-text-secondary">{formatNumber(bar.value)}</p>
    </div>
  );
}

/** shadcn's "Bar Chart - Custom Label" pattern, generalized with a per-bar
 * `colorVar` — horizontal bars with the category labeled inside the bar and
 * the value labeled at its end, instead of a separate axis or legend. */
export function LabeledBarChart({ bars }: { bars: LabeledBar[] }) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={bars}
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
            {bars.map((bar) => (
              <Cell key={bar.key} fill={bar.colorVar} />
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
