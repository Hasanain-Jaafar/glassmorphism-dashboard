"use client";

import { useMemo } from "react";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { WeekStart } from "@/lib/use-week-start";

export const ALL_PERIODS = "all";
const TODAY = "today";
const THIS_WEEK = "this_week";
const THIS_MONTH = "this_month";

const periodLabels: Record<string, string> = {
  [ALL_PERIODS]: "All Time",
  [TODAY]: "Today",
  [THIS_WEEK]: "This Week",
  [THIS_MONTH]: "This Month",
};

/**
 * Returns a predicate for the chosen period — "all", "today", "this_week",
 * "this_month", or a year like "2026". Week boundaries follow the Settings >
 * Appearance "first day of week" preference. Build it once per filter pass,
 * not per row.
 */
export function createPeriodMatcher(
  period: string,
  weekStartsOn: WeekStart
): (date: string | Date) => boolean {
  if (period === ALL_PERIODS) return () => true;

  const now = new Date();
  let start: Date;
  let end: Date;
  if (period === TODAY) {
    start = startOfDay(now);
    end = endOfDay(now);
  } else if (period === THIS_WEEK) {
    start = startOfWeek(now, { weekStartsOn });
    end = endOfWeek(now, { weekStartsOn });
  } else if (period === THIS_MONTH) {
    start = startOfMonth(now);
    end = endOfMonth(now);
  } else {
    const year = Number(period);
    return (date) => new Date(date).getFullYear() === year;
  }
  return (date) => {
    const d = new Date(date);
    return d >= start && d <= end;
  };
}

/**
 * Every year that has at least one record, plus the current year even if it
 * has none yet — so a new year appears the moment its first record lands.
 */
export function usePeriodYearOptions(dates: (string | Date)[]): number[] {
  return useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    for (const date of dates) years.add(new Date(date).getFullYear());
    return [...years].sort((a, b) => a - b);
  }, [dates]);
}

export function PeriodFilter({
  value,
  onChange,
  years,
}: {
  value: string;
  onChange: (value: string) => void;
  years: number[];
}) {
  return (
    <Select value={value} onValueChange={(next) => next && onChange(next)}>
      <SelectTrigger className="glass-panel filter-control h-8 gap-1.5 px-2.5 text-xs">
        <SelectValue>{(v: string) => periodLabels[v] ?? v}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        <SelectItem value={ALL_PERIODS}>All Time</SelectItem>
        <SelectItem value={TODAY}>Today</SelectItem>
        <SelectItem value={THIS_WEEK}>This Week</SelectItem>
        <SelectItem value={THIS_MONTH}>This Month</SelectItem>
        {years.map((year) => (
          <SelectItem key={year} value={String(year)}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
