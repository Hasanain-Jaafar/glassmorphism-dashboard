"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";
import { formatPercent } from "@/lib/format";

export type RankedCategory = {
  id: string;
  name: string;
  count: number;
  pct: number;
  colorVar: string;
};

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: RankedCategory }[];
}) {
  if (!active || !payload?.length) return null;
  const category = payload[0].payload;

  return (
    <div className="rounded-xl border border-glass-border bg-popover/95 px-3.5 py-2.5 text-xs shadow-lg backdrop-blur-2xl">
      <p className="font-medium text-foreground">{category.name}</p>
      <p className="mt-1 text-text-secondary">
        {category.count} products
        <span className="ml-1.5 text-text-tertiary">
          {formatPercent(category.pct, 0)}
        </span>
      </p>
    </div>
  );
}

/** Real vertical bar chart (Recharts) — deliberately a different shape from the
 * horizontal ranked-bar list used by Salesperson Performance. */
export function CategoryBarChart({
  categories,
}: {
  categories: RankedCategory[];
}) {
  return (
    <div className="h-[220px] w-full sm:h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={categories}
          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
        >
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            interval={0}
            tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
            tickFormatter={(value: string) =>
              value.length > 10 ? `${value.slice(0, 9)}…` : value
            }
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--foreground)", fillOpacity: 0.04 }} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={600}>
            {categories.map((category) => (
              <Cell key={category.id} fill={category.colorVar} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
