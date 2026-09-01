import type { MonthlyRevenuePoint, PipelineStage } from "@/lib/mock-data";

/**
 * Company-wide real aggregates, computed from the pipeline tables — the
 * company-level counterpart to lib/customers-data.ts's per-customer
 * aggregates. Revenue only counts paid invoices, keyed by paid_at
 * (CLAUDE.md §3); all functions take already-fetched arrays so callers can
 * fetch once per page and reuse across widgets.
 *
 * `year`/`month` (month is 1–12, matching lib/target-period.ts's
 * currentMonthNumber and lib/supabase/targets.ts's convention) are always
 * passed in explicitly rather than read from the system clock here — the
 * app's targets are keyed by lib/mock-data.ts's `currentYear` /
 * lib/target-period.ts's `currentMonthNumber` (the "current period" the
 * rest of the app already agrees on), and revenue has to be computed for
 * that same period or a target's progress bar would compare against the
 * wrong window.
 */

type InvoiceLike = { status: string; amount: number; paidAt: string | null };
type RepInvoiceLike = InvoiceLike & { salesRepId: string };
type RepAppointmentLike = { salesRepId: string; scheduledAt: string };
type RepDealLike = { salesRepId: string; status: string; closedAt: string | null };

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function paidInYearMonth(inv: InvoiceLike, year: number, month: number): boolean {
  if (inv.status !== "paid" || !inv.paidAt) return false;
  const d = new Date(inv.paidAt);
  return d.getFullYear() === year && d.getMonth() + 1 === month;
}

/** Sum of paid invoices for one calendar month (month is 1–12). */
export function computeMonthlyTotal(
  invoices: InvoiceLike[],
  year: number,
  month: number
): number {
  return invoices
    .filter((inv) => paidInYearMonth(inv, year, month))
    .reduce((sum, inv) => sum + inv.amount, 0);
}

/**
 * One rep's real paid total for a set of months in `year` — the /targets
 * page's Individual tab's "Actual" column, replacing the old
 * personActualForSelection() stub that always returned 0. Empty `months`
 * means the whole year (matches lib/target-period.ts's
 * monthsForSelection()'s "empty = year" convention).
 */
export function computePersonActualForMonths(
  invoices: RepInvoiceLike[],
  repId: string,
  year: number,
  months: number[]
): number {
  return invoices
    .filter((inv) => inv.salesRepId === repId && inv.status === "paid" && inv.paidAt)
    .filter((inv) => {
      const paid = new Date(inv.paidAt as string);
      if (paid.getFullYear() !== year) return false;
      return months.length === 0 || months.includes(paid.getMonth() + 1);
    })
    .reduce((sum, inv) => sum + inv.amount, 0);
}

/**
 * One rep's appointment count for a set of months in `year` — the Targets
 * page's Individual tab's "Appointments" column. Counts every appointment
 * regardless of status, matching computeAppointmentStats' unfiltered "Total"
 * in lib/supabase/appointments.ts. Empty `months` means the whole year.
 */
export function computePersonAppointmentCountForMonths(
  appointments: RepAppointmentLike[],
  repId: string,
  year: number,
  months: number[]
): number {
  return appointments.filter((a) => {
    if (a.salesRepId !== repId) return false;
    const scheduled = new Date(a.scheduledAt);
    if (scheduled.getFullYear() !== year) return false;
    return months.length === 0 || months.includes(scheduled.getMonth() + 1);
  }).length;
}

/**
 * One rep's closed-won deal count for a set of months in `year` — the
 * Targets page's Individual tab's "Deals" column. Matches the "closedDeals"
 * definition already used in withTeamAggregates (lib/supabase/team.ts):
 * status === "won", keyed by closedAt. Empty `months` means the whole year.
 */
export function computePersonDealCountForMonths(
  deals: RepDealLike[],
  repId: string,
  year: number,
  months: number[]
): number {
  return deals.filter((d) => {
    if (d.salesRepId !== repId || d.status !== "won" || !d.closedAt) return false;
    const closed = new Date(d.closedAt);
    if (closed.getFullYear() !== year) return false;
    return months.length === 0 || months.includes(closed.getMonth() + 1);
  }).length;
}

/**
 * Year-to-date total for `year` vs. the same period the year before
 * (day-for-day, using today's real day-of-month as the cutoff) — matches
 * the mock data's own "previousYearToDateTotal" semantics rather than
 * comparing to all of last year.
 */
export function computeYearToDateTotals(
  invoices: InvoiceLike[],
  year: number,
  month: number
): { currentYearTotal: number; previousYearToDateTotal: number } {
  // End of day, not start — `new Date(y, m, d)` defaults to midnight, which
  // would exclude anything paid later today (i.e. almost everything paid
  // "today") since its timestamp falls after a start-of-day cutoff.
  const day = new Date().getDate();
  const cutoffThisYear = new Date(year, month - 1, day, 23, 59, 59, 999);
  const cutoffLastYear = new Date(year - 1, month - 1, day, 23, 59, 59, 999);

  let currentYearTotal = 0;
  let previousYearToDateTotal = 0;

  for (const inv of invoices) {
    if (inv.status !== "paid" || !inv.paidAt) continue;
    const paid = new Date(inv.paidAt);
    if (paid.getFullYear() === year && paid <= cutoffThisYear) {
      currentYearTotal += inv.amount;
    } else if (paid.getFullYear() === year - 1 && paid <= cutoffLastYear) {
      previousYearToDateTotal += inv.amount;
    }
  }

  return { currentYearTotal, previousYearToDateTotal };
}

/** Jan..`month` of `year`, that year vs. the same months the year before. */
export function computeCompanyRevenueSeries(
  invoices: InvoiceLike[],
  year: number,
  month: number
): MonthlyRevenuePoint[] {
  return Array.from({ length: month }, (_, i) => {
    const m = i + 1;
    return {
      month: MONTH_LABELS[i],
      current: computeMonthlyTotal(invoices, year, m),
      previous: computeMonthlyTotal(invoices, year - 1, m),
    };
  });
}

/**
 * The dashboard's Sales Pipeline funnel — one calendar month only:
 * appointments scheduled, quotations created, deals won, invoices paid.
 */
export function computePipelineCounts(
  appointments: { scheduledAt: string }[],
  quotations: { createdAt: string }[],
  deals: { status: string; closedAt: string | null }[],
  invoices: InvoiceLike[],
  year: number,
  month: number
): { stages: PipelineStage[]; conversions: number[] } {
  const inThisMonth = (iso: string | null) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  };

  const appointmentCount = appointments.filter((a) =>
    inThisMonth(a.scheduledAt)
  ).length;
  const quotationCount = quotations.filter((q) =>
    inThisMonth(q.createdAt)
  ).length;
  const dealCount = deals.filter(
    (d) => d.status === "won" && inThisMonth(d.closedAt)
  ).length;
  const invoiceCount = invoices.filter(
    (i) => i.status === "paid" && inThisMonth(i.paidAt)
  ).length;

  const stages: PipelineStage[] = [
    { key: "appointments", label: "Appointments", value: appointmentCount },
    { key: "quotations", label: "Quotations", value: quotationCount },
    { key: "deals", label: "Closed Deals", value: dealCount },
    { key: "invoices", label: "Paid Invoices", value: invoiceCount },
  ];

  // Not capped at 100% — these compare two independently-counted monthly
  // snapshots (e.g. a deal closed this month may trace back to a quotation
  // from an earlier month), not a true same-cohort funnel, so the raw ratio
  // can mathematically exceed 100% on a small/uneven dataset. Showing the
  // real ratio (even over 100%) is more honest than silently capping it,
  // which would hide the mismatch behind a falsely-perfect "100%".
  const pct = (num: number, den: number) =>
    den ? Math.round((num / den) * 100) : 0;

  return {
    stages,
    conversions: [
      pct(quotationCount, appointmentCount),
      pct(dealCount, quotationCount),
      pct(invoiceCount, dealCount),
    ],
  };
}

export type TeamSnapshotAxis = { axis: string; value: number };

/**
 * The dashboard's Team Snapshot radar — five metrics that are already
 * naturally 0–100 percentages, so no invented scale is needed: monthly
 * target achievement, the three pipeline-stage conversions (see
 * computePipelineCounts), and the company-wide deal win rate (won /
 * (won + lost), all-time — same definition as the /deals page's Win Rate KPI).
 */
export function computeTeamSnapshot(
  monthlyProgressPct: number,
  pipelineConversions: number[],
  deals: { status: string }[]
): TeamSnapshotAxis[] {
  const won = deals.filter((d) => d.status === "won").length;
  const lost = deals.filter((d) => d.status === "lost").length;
  const winRate = won + lost ? Math.round((won / (won + lost)) * 100) : 0;

  return [
    { axis: "Target", value: Math.min(Math.round(monthlyProgressPct), 100) },
    { axis: "Appt → Quote", value: pipelineConversions[0] ?? 0 },
    { axis: "Quote → Deal", value: pipelineConversions[1] ?? 0 },
    { axis: "Deal → Paid", value: pipelineConversions[2] ?? 0 },
    { axis: "Win Rate", value: winRate },
  ];
}
