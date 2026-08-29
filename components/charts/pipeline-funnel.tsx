"use client";

import { useId } from "react";
import { motion } from "framer-motion";
import type { PipelineStage } from "@/lib/mock-data";
import { formatNumber } from "@/lib/format";

const STAGE_HEIGHT = 52;
const STAGE_GAP = 14;
const MIN_WIDTH_FRACTION = 0.24;

/**
 * A real converging funnel (trapezoid stack with one continuous gradient
 * running through it), unlike every other progress visualization in the app
 * (horizontal ranked bars, radial rings, area/line charts) — deliberately
 * distinct so the dashboard's single funnel-shaped metric reads as one at a
 * glance. See components/charts/pipeline-chart.tsx for the plain
 * horizontal-bar version still used on /team's "Sales Funnel" card.
 */
export function PipelineFunnel({
  stages,
  conversions,
}: {
  stages: PipelineStage[];
  conversions: number[];
}) {
  const gradientId = useId();
  const max = stages[0]?.value || 1;
  const fractions = stages.map((s) =>
    Math.max(s.value / max, MIN_WIDTH_FRACTION)
  );

  const totalHeight = stages.length * STAGE_HEIGHT + (stages.length - 1) * STAGE_GAP;

  return (
    <div className="relative" style={{ height: totalHeight }}>
      <svg
        viewBox={`0 0 100 ${totalHeight}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
      >
        <defs>
          <linearGradient
            id={gradientId}
            gradientUnits="userSpaceOnUse"
            x1="0"
            y1="0"
            x2="0"
            y2={totalHeight}
          >
            <stop offset="0%" stopColor="var(--chart-1)" />
            <stop offset="45%" stopColor="#8f7fff" />
            <stop offset="75%" stopColor="var(--chart-2)" />
            <stop offset="100%" stopColor="var(--chart-3)" />
          </linearGradient>
        </defs>
        {stages.map((stage, index) => {
          const topFrac = fractions[index];
          const bottomFrac = fractions[index + 1] ?? fractions[index];
          const yTop = index * (STAGE_HEIGHT + STAGE_GAP);
          const yBottom = yTop + STAGE_HEIGHT;
          const points = [
            [50 - topFrac * 50, yTop],
            [50 + topFrac * 50, yTop],
            [50 + bottomFrac * 50, yBottom],
            [50 - bottomFrac * 50, yBottom],
          ]
            .map((p) => p.join(","))
            .join(" ");

          return (
            <motion.polygon
              key={stage.key}
              points={points}
              fill={`url(#${gradientId})`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.1 }}
              style={{ transformOrigin: `50px ${(yTop + yBottom) / 2}px` }}
            />
          );
        })}
      </svg>

      {stages.map((stage, index) => {
        const yTop = index * (STAGE_HEIGHT + STAGE_GAP);
        const yCenter = yTop + STAGE_HEIGHT / 2;
        return (
          <div
            key={stage.key}
            className="absolute inset-x-0 flex flex-col items-center justify-center text-center"
            style={{ top: yCenter, height: 0, transform: "translateY(-50%)" }}
          >
            <span className="text-base font-semibold text-white drop-shadow-sm">
              {formatNumber(stage.value)}
            </span>
            <span className="text-[11px] font-medium text-white/80">
              {stage.label}
            </span>
          </div>
        );
      })}

      {conversions.map((pct, index) => {
        const yGapCenter =
          index * (STAGE_HEIGHT + STAGE_GAP) + STAGE_HEIGHT + STAGE_GAP / 2;
        return (
          <div
            key={index}
            className="absolute inset-x-0 flex justify-center"
            style={{ top: yGapCenter, height: 0, transform: "translateY(-50%)" }}
          >
            <span className="rounded-full border border-glass-border bg-background/80 px-2 py-0.5 text-[10px] font-semibold text-text-secondary shadow-sm backdrop-blur-sm">
              {pct}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
