"use client";

import { motion } from "framer-motion";
import { formatPercent, formatUSD } from "@/lib/format";
import type { Salesperson } from "@/lib/mock-data";
import { EditTargetDialog } from "@/components/sales/edit-target-dialog";

function TargetBar({
  label,
  current,
  target,
}: {
  label: string;
  current: number;
  target: number;
}) {
  const progressPct = target ? Math.min((current / target) * 100, 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-tertiary">{label}</span>
        <span className="font-medium text-text-secondary">
          {formatPercent(progressPct, 0)}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-foreground/[0.07]">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-[#8f7fff]"
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between text-xs text-text-tertiary">
        <span>{formatUSD(current)}</span>
        <span>{formatUSD(target)}</span>
      </div>
    </div>
  );
}

export function IndividualTargetCard({
  person,
  canEdit,
  onSave,
}: {
  person: Salesperson;
  canEdit?: boolean;
  onSave?: (values: { monthlyTarget: number; yearlyTarget: number }) => void;
}) {
  return (
    <div className="glass-panel flex h-full flex-col rounded-2xl p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
            {person.initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {person.name}
            </p>
            <p className="truncate text-xs text-text-tertiary">
              {person.role}
            </p>
          </div>
        </div>
        {canEdit && onSave && (
          <EditTargetDialog
            title={`Edit ${person.name}'s Targets`}
            description="Update the monthly and yearly sales target for this representative."
            monthlyTarget={person.monthlyTarget}
            yearlyTarget={person.yearlyTarget}
            onSave={onSave}
          />
        )}
      </div>

      <div className="mt-5 space-y-4">
        <TargetBar
          label="Monthly Target"
          current={person.monthlySales}
          target={person.monthlyTarget}
        />
        <TargetBar
          label="Yearly Target"
          current={person.yearlySales}
          target={person.yearlyTarget}
        />
      </div>
    </div>
  );
}
