"use client";

import { motion } from "framer-motion";
import { formatNumber } from "@/lib/format";

export type DonutSegment = {
  id: string;
  label: string;
  value: number;
  colorVar: string;
};

export function DonutChart({
  segments,
  centerLabel,
  centerValue,
}: {
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: string;
}) {
  const size = 152;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;

  const { arcs } = segments
    .filter((segment) => segment.value > 0)
    .reduce<{
      cumulative: number;
      arcs: (DonutSegment & { dash: number; offset: number })[];
    }>(
      (acc, segment) => {
        const fraction = segment.value / total;
        const dash = fraction * circumference;
        const offset = -acc.cumulative * circumference;
        return {
          cumulative: acc.cumulative + fraction,
          arcs: [...acc.arcs, { ...segment, dash, offset }],
        };
      },
      { cumulative: 0, arcs: [] }
    );

  return (
    <div className="flex items-center gap-6">
      <motion.div
        className="relative shrink-0"
        style={{ width: size, height: size }}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          {arcs.map((arc) => (
            <circle
              key={arc.id}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={arc.colorVar}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
              strokeDashoffset={arc.offset}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold text-foreground">
            {centerValue}
          </span>
          <span className="text-[11px] text-text-tertiary">{centerLabel}</span>
        </div>
      </motion.div>

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
