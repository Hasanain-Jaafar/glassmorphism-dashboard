"use client";

import { motion } from "framer-motion";
import type { PipelineStage } from "@/lib/mock-data";
import { formatNumber } from "@/lib/format";

const stageColors = [
  "var(--chart-1)",
  "#8f7fff",
  "var(--chart-2)",
  "var(--chart-3)",
];

export function PipelineChart({
  stages,
  conversions,
}: {
  stages: PipelineStage[];
  conversions: number[];
}) {
  const max = stages[0]?.value ?? 1;

  return (
    <div className="space-y-3">
      {stages.map((stage, index) => (
        <div key={stage.key}>
          <div className="flex items-center gap-3">
            <div className="w-28 shrink-0 text-sm text-text-secondary sm:w-32">
              {stage.label}
            </div>
            <div className="h-8 flex-1 overflow-hidden rounded-lg bg-foreground/[0.06]">
              <motion.div
                className="flex h-full items-center rounded-lg px-3"
                style={{ backgroundColor: stageColors[index % stageColors.length] }}
                initial={{ width: 0 }}
                animate={{ width: `${(stage.value / max) * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut", delay: index * 0.08 }}
              >
                <span className="text-sm font-semibold text-white">
                  {formatNumber(stage.value)}
                </span>
              </motion.div>
            </div>
          </div>
          {index < conversions.length && (
            <div className="ml-28 mt-1.5 pl-3 text-xs text-text-tertiary sm:ml-32">
              ↓ {conversions[index]}% conversion
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
