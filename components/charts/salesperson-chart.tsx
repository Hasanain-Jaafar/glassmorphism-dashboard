"use client";

import { motion } from "framer-motion";
import { formatCompactUSD, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export type RankedPerson = {
  id: string;
  name: string;
  initials: string;
  value: number;
  contributionPct: number;
  rank: number;
};

export function SalespersonRankChart({ people }: { people: RankedPerson[] }) {
  const max = people.length ? Math.max(...people.map((p) => p.contributionPct)) : 0;

  return (
    <ul className="space-y-4">
      {people.map((person) => (
        <li key={person.id} className="flex items-center gap-3">
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
              person.rank === 1
                ? "bg-primary text-primary-foreground"
                : "bg-foreground/[0.06] text-text-tertiary"
            )}
          >
            {person.rank}
          </span>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
              <span className="truncate font-medium text-foreground">
                {person.name}
              </span>
              <span className="shrink-0 text-text-secondary">
                {formatPercent(person.contributionPct, 0)}
                <span className="ml-1.5 text-text-tertiary">
                  {formatCompactUSD(person.value)}
                </span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.07]">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary to-[#8f7fff]"
                initial={{ width: 0 }}
                animate={{
                  width: max ? `${(person.contributionPct / max) * 100}%` : "0%",
                }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
