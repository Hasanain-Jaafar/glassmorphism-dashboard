"use client";

import { useCallback, useSyncExternalStore } from "react";

/** 0 = Sunday, matching Date#getDay() and react-day-picker's weekStartsOn. */
export type WeekStart = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const WEEK_START_OPTIONS: { value: WeekStart; label: string }[] = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export const WEEK_START_STORAGE_KEY = "week-start-day";
// Saturday — matches the Sat–Fri work week this dashboard was built around.
const DEFAULT_WEEK_START: WeekStart = 6;

const listeners = new Set<() => void>();

function isWeekStart(value: string | null): value is `${WeekStart}` {
  if (value === null) return false;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= 6;
}

/**
 * Plain (non-hook) read of the same preference, for use outside components
 * — e.g. date-range math in lib/supabase/*.ts stat helpers. SSR-safe: falls
 * back to the default when there's no `window` (server) to read from.
 */
export function getWeekStart(): WeekStart {
  if (typeof window === "undefined") return DEFAULT_WEEK_START;
  const stored = window.localStorage.getItem(WEEK_START_STORAGE_KEY);
  return isWeekStart(stored) ? (Number(stored) as WeekStart) : DEFAULT_WEEK_START;
}

/**
 * The Settings > Appearance "first day of week" preference, synced with
 * localStorage (same useSyncExternalStore pattern as useAccentColor) and
 * read by the Calendar/DatePicker components used across Appointments,
 * Quotations, and Invoices.
 */
export function useWeekStart(): [WeekStart, (next: WeekStart) => void] {
  const subscribe = useCallback((listener: () => void) => {
    listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    const stored = window.localStorage.getItem(WEEK_START_STORAGE_KEY);
    return isWeekStart(stored) ? (Number(stored) as WeekStart) : DEFAULT_WEEK_START;
  }, []);

  const getServerSnapshot = useCallback(() => DEFAULT_WEEK_START, []);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback((next: WeekStart) => {
    window.localStorage.setItem(WEEK_START_STORAGE_KEY, String(next));
    listeners.forEach((listener) => listener());
  }, []);

  return [value, setValue];
}
