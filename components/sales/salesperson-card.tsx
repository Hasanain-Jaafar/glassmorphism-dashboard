"use client";

import { motion } from "framer-motion";
import { formatUSD, formatPercent } from "@/lib/format";
import type { TeamMember } from "@/lib/supabase/team";
import { cn } from "@/lib/utils";

const roleLabels: Record<TeamMember["role"], string> = {
  admin: "Administrator",
  sales_rep: "Sales Representative",
};

export function SalespersonCard({
  person,
  highlighted,
}: {
  person: TeamMember;
  highlighted?: boolean;
}) {
  const progressPct = person.monthlyTarget
    ? Math.min((person.monthlySales / person.monthlyTarget) * 100, 100)
    : 0;

  return (
    <div
      id={`salesperson-${person.id}`}
      className={cn(
        "glass-panel flex h-full flex-col rounded-2xl p-5 shadow-sm ring-primary/50 transition-shadow duration-500 sm:p-6",
        highlighted && "ring-2"
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
          {person.initials}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {person.name}
          </p>
          <p className="truncate text-xs text-text-tertiary">
            {roleLabels[person.role]}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-text-tertiary">Sales</p>
          <p className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">
            {formatUSD(person.monthlySales)}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-tertiary">Target</p>
          <p className="mt-0.5 text-lg font-semibold tracking-tight text-foreground">
            {formatUSD(person.monthlyTarget)}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/[0.07]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-[#8f7fff]"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <p className="mt-1.5 text-xs text-text-tertiary">
          {formatPercent(progressPct, 0)} of monthly target
        </p>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3 pt-5 text-sm">
        <div>
          <p className="text-xs text-text-tertiary">Closed Deals</p>
          <p className="mt-0.5 font-medium text-foreground">
            {person.closedDeals}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-tertiary">Conversion</p>
          <p className="mt-0.5 font-medium text-foreground">
            {formatPercent(person.conversionRate, 0)}
          </p>
        </div>
      </div>
    </div>
  );
}
