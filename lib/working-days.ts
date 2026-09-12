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

/**
 * Working days in an inclusive date range — e.g. a Sun–Tue leave request is
 * 3 days, not 2. Used to price a leave request against entitlements instead
 * of counting calendar days, so a request spanning a Friday doesn't cost the
 * requester a day they were never going to work.
 */
export function countWorkingDaysInclusive(start: Date, end: Date): number {
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  let count = 0;
  while (cursor <= last) {
    if (!isWeekendDay(cursor)) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}
