"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { formatUSD, formatPercent } from "@/lib/format";
import { KpiBars } from "@/components/dashboard/kpi-bars";
import { KpiWave } from "@/components/dashboard/kpi-wave";

export function RadialTarget({
  label,
  current,
  target,
  progressPct,
  action,
  bars,
}: {
  label: string;
  current: number;
  target: number;
  progressPct: number;
  action?: ReactNode;
  bars?: number[];
}) {
  const size = 108;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(progressPct, 100);
  const offset = circumference * (1 - clamped / 100);

  return (
    <div className="glass-panel relative flex h-full flex-col overflow-hidden rounded-2xl p-5 shadow-sm sm:p-6">
      {bars && bars.length > 1 && <KpiBars data={bars} />}
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-text-secondary">{label}</p>
          {action}
        </div>

        <div className="mt-3 flex flex-1 items-center gap-4">
          <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--border)"
                strokeWidth={strokeWidth}
              />
              <motion.circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--primary)"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-semibold text-foreground">
                {formatPercent(progressPct, 1)}
              </span>
            </div>
          </div>

          <div className="min-w-0">
            <p className="truncate text-xl font-semibold tracking-tight text-foreground">
              {formatUSD(current)}
            </p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              of {formatUSD(target)} goal
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MonthlyTargetCard({
  label,
  monthLabel,
  current,
  target,
  remaining,
  progressPct,
  action,
  wave,
}: {
  label: string;
  monthLabel: string;
  current: number;
  target: number;
  remaining: number;
  progressPct: number;
  action?: ReactNode;
  wave?: number[];
}) {
  const clamped = Math.min(progressPct, 100);

  return (
    <div className="glass-panel relative flex h-full flex-col overflow-hidden rounded-2xl p-5 shadow-sm sm:p-6">
      {wave && wave.length > 1 && <KpiWave data={wave} />}
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-text-secondary">{label}</p>
          {action ?? (
            <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
              {monthLabel}
            </span>
          )}
        </div>

        <div className="mt-4">
          <p className="text-xs text-text-tertiary">Remaining</p>
          <p className="mt-1 text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">
            {formatUSD(remaining)}
          </p>
        </div>

        <div className="mt-5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-foreground/[0.07]">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary to-[#8f7fff]"
              initial={{ width: 0 }}
              animate={{ width: `${clamped}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <p className="mt-1.5 text-xs text-text-tertiary">
            {formatPercent(progressPct, 0)} achieved
          </p>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-3 pt-5 text-sm">
          <div>
            <p className="text-xs text-text-tertiary">Current</p>
            <p className="mt-0.5 font-medium text-foreground">{formatUSD(current)}</p>
          </div>
          <div>
            <p className="text-xs text-text-tertiary">Target</p>
            <p className="mt-0.5 font-medium text-foreground">{formatUSD(target)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
