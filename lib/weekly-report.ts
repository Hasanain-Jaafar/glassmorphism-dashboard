import { format } from "date-fns";
import type { TeamMember } from "@/lib/supabase/team";
import type { Appointment } from "@/lib/supabase/appointments";
import type { Quotation } from "@/lib/supabase/quotations";
import type { Deal } from "@/lib/supabase/deals";
import type { Invoice } from "@/lib/supabase/invoices";
import type { RankedPerson } from "@/components/charts/salesperson-chart";
import type { PipelineStage } from "@/lib/mock-data";

/**
 * Data layer for /reports/weekly — the admin-only weekly performance report
 * linked from the "weekly_summary" notification (see
 * supabase/migrations/20260101000044_weekly_summary_saturday_week.sql, which
 * sends that notification and must stay in sync with the week-boundary math
 * here). Weeks run Saturday through Friday inclusive (a Sun-Thu work week),
 * not the calendar's Monday-Sunday week — the report is reached by picking a
 * week rather than filtering a live table, so everything here works off an
 * explicit `start`/`end` range instead of the app's usual year/month
 * convention (see lib/company-performance.ts).
 */

export type WeekRange = {
  /** Saturday, 00:00 local. */
  start: Date;
  /** The following Saturday, 00:00 local — exclusive upper bound. */
  end: Date;
};

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/**
 * The Saturday that starts the most recently *completed* Sat-Fri week —
 * e.g. on any day from Saturday through the following Friday, this returns
 * the Saturday 7 days before that. Mirrors this_saturday/week_start_date in
 * the migration's send_weekly_summaries() exactly (JS Date#getDay() and
 * Postgres's extract(dow from ...) use the same 0=Sun..6=Sat convention).
 */
export function mostRecentCompletedWeekStart(today: Date = new Date()): Date {
  const day = startOfDay(today);
  const thisSaturday = addDays(day, -((day.getDay() + 1) % 7));
  return addDays(thisSaturday, -7);
}

export function weekRangeFromStart(start: Date): WeekRange {
  return { start, end: addDays(start, 7) };
}

/** URL-safe identifier for a week — the ISO date of its Saturday, matching the `week` query param the notification link uses. */
export function weekParamFor(start: Date): string {
  return format(start, "yyyy-MM-dd");
}

/** Parses a `week` query param back into that Saturday, falling back to the most recently completed week when missing or invalid. */
export function parseWeekParam(param: string | null | undefined): Date {
  if (param) {
    const parsed = new Date(`${param}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return startOfDay(parsed);
  }
  return mostRecentCompletedWeekStart();
}

/** "Sep 6 – 12, 2026" (or "Aug 30 – Sep 5, 2026" when the week crosses a month boundary) — the report's date-range subtitle. */
export function weekRangeLabel(start: Date): string {
  const end = addDays(start, 6); // Friday, inclusive
  return start.getMonth() === end.getMonth()
    ? `${format(start, "MMM d")} – ${format(end, "d, yyyy")}`
    : `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

export type WeekOption = { value: string; label: string; start: Date };

/** The most recent `count` completed weeks, newest first — backs the report page's week picker. */
export function recentWeekOptions(count = 12, today: Date = new Date()): WeekOption[] {
  const mostRecent = mostRecentCompletedWeekStart(today);
  return Array.from({ length: count }, (_, i) => {
    const start = addDays(mostRecent, -7 * i);
    return { value: weekParamFor(start), label: weekRangeLabel(start), start };
  });
}

export type WeeklyReportData = {
  totalSales: number;
  priorWeekSales: number;
  /** 0 when there's no prior-week sales to compare against. */
  salesDeltaPct: number;
  dealsClosed: number;
  appointmentsBooked: number;
  quotationsSent: number;
  /** 7 points, Saturday through Friday. */
  dailySales: { label: string; amount: number }[];
  pipelineStages: PipelineStage[];
  pipelineConversions: number[];
  ranking: RankedPerson[];
  monthlyTarget: number;
  /** This week's paid sales as a % of the monthly target it falls in — 0 when no target is set. */
  weekContributionPct: number;
};

function inRange(iso: string | null, start: Date, end: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d >= start && d < end;
}

/**
 * Computes the full weekly report from already-fetched arrays (same
 * fetch-once-compute-many convention as lib/company-performance.ts).
 * `monthlyTarget` is looked up by the caller (fetchCompanyTargets), keyed to
 * whichever month the week's Friday falls in — an approximation when a week
 * spans two months, but good enough for a "pace toward target" indicator.
 */
export function computeWeeklyReport(
  range: WeekRange,
  data: {
    teamMembers: TeamMember[];
    appointments: Appointment[];
    quotations: Quotation[];
    deals: Deal[];
    invoices: Invoice[];
  },
  monthlyTarget: number
): WeeklyReportData {
  const { start, end } = range;
  const priorStart = addDays(start, -7);

  const paidInRange = (s: Date, e: Date) =>
    data.invoices.filter((inv) => inv.status === "paid" && inRange(inv.paidAt, s, e));

  const weekInvoices = paidInRange(start, end);
  const totalSales = weekInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const priorWeekSales = paidInRange(priorStart, start).reduce(
    (sum, inv) => sum + inv.amount,
    0
  );
  const salesDeltaPct = priorWeekSales
    ? ((totalSales - priorWeekSales) / priorWeekSales) * 100
    : 0;

  const dealsClosed = data.deals.filter(
    (d) => d.status === "won" && inRange(d.closedAt, start, end)
  ).length;
  const appointmentsBooked = data.appointments.filter((a) =>
    inRange(a.scheduledAt, start, end)
  ).length;
  // Keyed by creation, matching the dashboard's own pipeline funnel
  // (computePipelineCounts in lib/company-performance.ts), not by sentAt.
  const quotationsSent = data.quotations.filter((q) =>
    inRange(q.createdAt, start, end)
  ).length;

  const dailySales = Array.from({ length: 7 }, (_, i) => {
    const dayStart = addDays(start, i);
    const dayEnd = addDays(dayStart, 1);
    const amount = paidInRange(dayStart, dayEnd).reduce((sum, inv) => sum + inv.amount, 0);
    return { label: format(dayStart, "EEE d"), amount };
  });

  const pct = (num: number, den: number) => (den ? Math.round((num / den) * 100) : 0);
  const invoiceCount = weekInvoices.length;
  const pipelineStages: PipelineStage[] = [
    { key: "appointments", label: "Appointments", value: appointmentsBooked },
    { key: "quotations", label: "Quotations", value: quotationsSent },
    { key: "deals", label: "Closed Deals", value: dealsClosed },
    { key: "invoices", label: "Paid Invoices", value: invoiceCount },
  ];
  const pipelineConversions = [
    pct(quotationsSent, appointmentsBooked),
    pct(dealsClosed, quotationsSent),
    pct(invoiceCount, dealsClosed),
  ];

  const salesByRep = new Map<string, number>();
  for (const inv of weekInvoices) {
    salesByRep.set(inv.salesRepId, (salesByRep.get(inv.salesRepId) ?? 0) + inv.amount);
  }
  const ranking: RankedPerson[] = data.teamMembers
    .filter((m) => m.role === "sales_rep")
    .map((rep) => ({
      id: rep.id,
      name: rep.name,
      initials: rep.initials,
      value: salesByRep.get(rep.id) ?? 0,
      contributionPct: 0,
      rank: 0,
    }))
    .sort((a, b) => b.value - a.value)
    .map((person, index) => ({
      ...person,
      rank: index + 1,
      contributionPct: totalSales ? (person.value / totalSales) * 100 : 0,
    }));

  return {
    totalSales,
    priorWeekSales,
    salesDeltaPct,
    dealsClosed,
    appointmentsBooked,
    quotationsSent,
    dailySales,
    pipelineStages,
    pipelineConversions,
    ranking,
    monthlyTarget,
    weekContributionPct: monthlyTarget ? (totalSales / monthlyTarget) * 100 : 0,
  };
}
