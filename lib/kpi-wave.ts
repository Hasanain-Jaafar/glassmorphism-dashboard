/**
 * Decorative trend waves for KPI cards (components/dashboard/kpi-wave.tsx) —
 * Apple Card-style background motifs, not data charts. Each helper buckets
 * real records into a trailing time window so the wave still reflects actual
 * activity instead of being random noise.
 */

function monthKey(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth();
}

function trailingMonthKeys(months: number, from = new Date()): number[] {
  return Array.from({ length: months }, (_, i) =>
    monthKey(new Date(from.getFullYear(), from.getMonth() - (months - 1 - i), 1))
  );
}

function weekKey(date: Date): number {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - start.getDay());
  return Math.floor(start.getTime() / (7 * 86400000));
}

function trailingWeekKeys(weeks: number, from = new Date()): number[] {
  const current = weekKey(from);
  return Array.from({ length: weeks }, (_, i) => current - (weeks - 1 - i));
}

/** Count of items per trailing month, keyed by an ISO date string. */
export function monthlyCountWave(
  dates: (string | null | undefined)[],
  months = 12
): number[] {
  const keys = trailingMonthKeys(months);
  const counts = new Map(keys.map((k) => [k, 0]));
  for (const raw of dates) {
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    const key = monthKey(d);
    if (counts.has(key)) counts.set(key, (counts.get(key) as number) + 1);
  }
  return keys.map((k) => counts.get(k) ?? 0);
}

/** Sum of `amount` per trailing month, keyed by `date`. */
export function monthlySumWave(
  entries: { date: string | null | undefined; amount: number }[],
  months = 12
): number[] {
  const keys = trailingMonthKeys(months);
  const sums = new Map(keys.map((k) => [k, 0]));
  for (const { date, amount } of entries) {
    if (!date) continue;
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) continue;
    const key = monthKey(d);
    if (sums.has(key)) sums.set(key, (sums.get(key) as number) + amount);
  }
  return keys.map((k) => sums.get(k) ?? 0);
}

/** Running total through each trailing month — always non-decreasing. */
export function cumulativeCountWave(
  dates: (string | null | undefined)[],
  months = 12
): number[] {
  const keys = trailingMonthKeys(months);
  const perMonth = monthlyCountWave(dates, months);
  const earliestKey = keys[0];
  let running = dates.reduce((total, raw) => {
    if (!raw) return total;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return total;
    return monthKey(d) < earliestKey ? total + 1 : total;
  }, 0);
  return perMonth.map((count) => (running += count));
}

/** Count of items per trailing week, keyed by an ISO date string. */
export function weeklyCountWave(
  dates: (string | null | undefined)[],
  weeks = 10
): number[] {
  const keys = trailingWeekKeys(weeks);
  const counts = new Map(keys.map((k) => [k, 0]));
  for (const raw of dates) {
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    const key = weekKey(d);
    if (counts.has(key)) counts.set(key, (counts.get(key) as number) + 1);
  }
  return keys.map((k) => counts.get(k) ?? 0);
}
