"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * One person's leave position for the year — vacation is the only type with
 * an enforced allowance (the progress bar), sick/unpaid/other are shown as
 * plain used-day counts since nothing caps them in v1 (see migration 39's
 * comment on leave_entitlements).
 */
export function LeaveBalanceCard({
  title = "My Time Off",
  vacationEntitled,
  vacationUsed,
  sickUsed,
  unpaidUsed,
  otherUsed,
  action,
}: {
  title?: string;
  vacationEntitled: number;
  vacationUsed: number;
  sickUsed: number;
  unpaidUsed: number;
  otherUsed: number;
  action?: ReactNode;
}) {
  const remaining = Math.max(vacationEntitled - vacationUsed, 0);
  const progressPct = vacationEntitled
    ? Math.min((vacationUsed / vacationEntitled) * 100, 100)
    : 0;

  return (
    <div className="glass-panel relative flex h-full flex-col overflow-hidden rounded-2xl p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-text-secondary">{title}</p>
        {action}
      </div>

      <div className="mt-4">
        <p className="text-xs text-text-tertiary">Vacation Remaining</p>
        <p className="mt-1 text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">
          {remaining}
          <span className="ml-1 text-sm font-medium text-text-tertiary">
            / {vacationEntitled} days
          </span>
        </p>
      </div>

      <div className="mt-5">
        <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/[0.07]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <p className="mt-1.5 text-xs text-text-tertiary">
          {vacationUsed} of {vacationEntitled} vacation days used this year
        </p>
      </div>

      <div className="mt-auto grid grid-cols-3 gap-3 pt-5 text-sm">
        <div>
          <p className="text-xs text-text-tertiary">Sick</p>
          <p className="mt-0.5 font-medium text-foreground">{sickUsed}d</p>
        </div>
        <div>
          <p className="text-xs text-text-tertiary">Unpaid</p>
          <p className="mt-0.5 font-medium text-foreground">{unpaidUsed}d</p>
        </div>
        <div>
          <p className="text-xs text-text-tertiary">Other</p>
          <p className="mt-0.5 font-medium text-foreground">{otherUsed}d</p>
        </div>
      </div>
    </div>
  );
}
