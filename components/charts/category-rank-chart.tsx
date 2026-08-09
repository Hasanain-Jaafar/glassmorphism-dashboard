"use client";

import { motion } from "framer-motion";
import { formatPercent } from "@/lib/format";

export type RankedCategory = {
  id: string;
  name: string;
  count: number;
  pct: number;
  colorVar: string;
};

export function CategoryRankChart({
  categories,
}: {
  categories: RankedCategory[];
}) {
  const max = Math.max(...categories.map((category) => category.pct), 1);

  return (
    <ul className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
      {categories.map((category) => (
        <li key={category.id} className="flex items-center gap-3">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: category.colorVar }}
          />

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-medium text-foreground">
                {category.name}
              </span>
              <span className="shrink-0 text-text-secondary">
                {category.count}
                <span className="ml-1.5 text-text-tertiary">
                  {formatPercent(category.pct, 0)}
                </span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.07]">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: category.colorVar }}
                initial={{ width: 0 }}
                animate={{ width: `${(category.pct / max) * 100}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
