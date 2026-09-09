/** Sat–Thu work week (Friday only) — see feedback on the quotation follow-up highlight. */
const WEEKEND_DAYS = new Set([5]); // Date#getDay(): 0=Sun … 5=Fri, 6=Sat

export function isWeekendDay(date: Date): boolean {
  return WEEKEND_DAYS.has(date.getDay());
}

/**
 * Full working days strictly after `from`'s calendar date, up to and
 * including `to`'s calendar date. Same-day returns 0; each intervening
 * Friday is skipped.
 */
export function workingDaysElapsed(from: Date, to: Date = new Date()): number {
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  let count = 0;
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    if (!isWeekendDay(cursor)) count++;
  }
  return count;
}
