"use client";

import { memo } from "react";
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

// Hoisted to module scope so these stay referentially stable across
// renders — Recharts' internal shouldComponentUpdate does a shallow prop
// comparison, so a fresh object/element literal here (even with identical
// values) reads as "changed" and restarts the bar/label entrance animation.
const CHART_MARGIN = { top: 4, right: 28, bottom: 4, left: 4 };
const TOOLTIP_CURSOR = { fill: "var(--foreground)", fillOpacity: 0.04 };
const BAR_BACKGROUND = { fill: "var(--muted)", radius: 6 };
const tooltipContent = <ChartTooltip />;

function valueLabelFormatter(value?: unknown) {
  return formatNumber(Number(value));
}

/** shadcn's "Bar Chart - Custom Label" pattern, generalized with a per-bar
 * `colorVar` — horizontal bars with the category labeled inside the bar and
 * the value labeled at its end, instead of a separate axis or legend.
 *
 * Memoized so a parent re-render (e.g. unrelated page state changing on
 * every keystroke) doesn't re-invoke this and recreate Recharts' props —
 * see CHART_MARGIN etc. above for why that matters. */
export const LabeledBarChart = memo(function LabeledBarChart({
  bars,
}: {
  bars: LabeledBar[];
}) {
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={bars} layout="vertical" margin={CHART_MARGIN}>
          <XAxis dataKey="value" type="number" hide />
          <YAxis dataKey="label" type="category" hide />
          <Tooltip content={tooltipContent} cursor={TOOLTIP_CURSOR} />
          <Bar
            dataKey="value"
            radius={6}
            isAnimationActive
            animationDuration={600}
            background={BAR_BACKGROUND}
          >
            {bars.map((bar) => (
              <Cell key={bar.key} fill={bar.colorVar} />
            ))}
            <LabelList
              dataKey="label"
              position="insideLeft"
              offset={10}
              fill="var(--foreground)"
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
              formatter={valueLabelFormatter}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
});
