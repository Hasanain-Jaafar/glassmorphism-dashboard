import { createClient } from "@/lib/supabase/client";
import type { EducationLevel, UserRole } from "@/components/providers/auth-provider";
import { isDealStale, type DealStatus } from "@/lib/supabase/deals";
import { isQuotationOverdue, type QuotationStatus } from "@/lib/supabase/quotations";
import { computeActivityTrend, type ActivityTrend } from "@/lib/activity-trend";
import { monthlySumWave } from "@/lib/kpi-wave";

const SALES_TREND_MONTHS = 6;

export type TeamMember = {
  id: string;
  name: string;
  role: UserRole;
  initials: string;
  avatarUrl: string | null;
  email: string;
  phone: string | null;
  hasCar: boolean;
  /** ISO date, or null if not set. */
  startDate: string | null;
  education: EducationLevel | null;
  /** Current month, paid. Zero until real appointments/quotations/deals/invoices exist — see supabase/README.md. */
  monthlySales: number;
  monthlyTarget: number;
  /** Year to date, paid. */
  yearlySales: number;
  yearlyTarget: number;
  /** Current month. */
  closedDeals: number;
  conversionRate: number;
  avgDeal: number;
  totalAppointments: number;
  /** Trailing months of paid sales, oldest -> newest — a per-rep trend sparkline instead of a single-month snapshot. */
  salesTrend: number[];
  /** Sum of this rep's currently-open deal amounts — pipeline in flight toward their remaining target. */
  openPipelineValue: number;
  /** Week-over-week appointments-booked + quotations-sent trend — the leading indicator that predicts next month's revenue. */
  activityTrend: ActivityTrend;
  /** Count of this rep's stale open deals + overdue sent quotations. */
  stalledCount: number;
};

function initialsFromName(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/** All active accounts (sales reps and admins) — the roster shown on /team. */
export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, phone, avatar_url, role, is_active, has_car, start_date, education"
    )
    .eq("is_active", true)
    .order("full_name");

  if (error) throw error;

  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.full_name,
    role: p.role as UserRole,
    initials: initialsFromName(p.full_name),
    avatarUrl: p.avatar_url,
    email: p.email,
    phone: p.phone,
    hasCar: p.has_car,
    startDate: p.start_date,
    education: p.education as EducationLevel | null,
    // Performance metrics require real appointments/quotations/deals/invoices
    // data, which doesn't exist until the sales workflow pages are built —
    // see supabase/README.md for what's live vs. still pending.
    monthlySales: 0,
    monthlyTarget: 0,
    yearlySales: 0,
    yearlyTarget: 0,
    closedDeals: 0,
    conversionRate: 0,
    avgDeal: 0,
    totalAppointments: 0,
    salesTrend: [],
    openPipelineValue: 0,
    activityTrend: computeActivityTrend([]),
    stalledCount: 0,
  }));
}

/**
 * Overlays real per-rep performance onto the roster from fetchTeamMembers()
 * — same pattern as withCustomerAggregates in lib/customers-data.ts: group
 * each pipeline table by salesRepId once (O(n)), then O(1) lookups per
 * member, instead of scanning every table per member. Revenue only counts
 * paid invoices (CLAUDE.md §3); closedDeals/totalAppointments are scoped to
 * `month` (matching their field comments above), conversionRate is all-time
 * won/(won+lost) — the same definition already used for the company-wide
 * "Win Rate" KPI on /deals.
 *
 * `quotations` is optional — existing callers that only need the original
 * fields (monthlySales, closedDeals, etc.) don't need to fetch it. Without
 * it, `stalledCount` and `activityTrend` are derived from deals/appointments
 * alone (undercounting slightly, since overdue quotations and quotation
 * sends aren't included) — pass it whenever the caller actually renders
 * those two fields.
 *
 * `year`/`month` (1–12) are passed in explicitly rather than read from the
 * system clock — callers should pass lib/mock-data.ts's `currentYear` /
 * lib/target-period.ts's `currentMonthNumber`, the same "current period"
 * targets are already keyed by, so a rep's monthlySales lines up with the
 * monthlyTargets[currentMonthNumber] it gets compared against.
 */
export function withTeamAggregates(
  members: TeamMember[],
  data: {
    appointments: { salesRepId: string; scheduledAt: string; createdAt: string }[];
    deals: {
      salesRepId: string;
      status: DealStatus;
      amount: number;
      closedAt: string | null;
      createdAt: string;
    }[];
    invoices: {
      salesRepId: string;
      status: string;
      amount: number;
      paidAt: string | null;
    }[];
    quotations?: {
      salesRepId: string;
      status: QuotationStatus;
      sentAt: string | null;
    }[];
  },
  year: number,
  month: number
): TeamMember[] {
  const now = new Date();
  const isThisMonth = (iso: string | null) => {
    if (!iso) return false;
    const d = new Date(iso);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  };
  const isThisYear = (iso: string | null) => {
    if (!iso) return false;
    return new Date(iso).getFullYear() === year;
  };

  const byRep = <T>(items: T[], repId: (item: T) => string) => {
    const map = new Map<string, T[]>();
    for (const item of items) {
      const id = repId(item);
      const list = map.get(id);
      if (list) list.push(item);
      else map.set(id, [item]);
    }
    return map;
  };

  const appointmentsByRep = byRep(data.appointments, (a) => a.salesRepId);
  const dealsByRep = byRep(data.deals, (d) => d.salesRepId);
  const invoicesByRep = byRep(data.invoices, (i) => i.salesRepId);
  const quotationsByRep = byRep(data.quotations ?? [], (q) => q.salesRepId);

  return members.map((member) => {
    const invoices = invoicesByRep.get(member.id) ?? [];
    const deals = dealsByRep.get(member.id) ?? [];
    const appointments = appointmentsByRep.get(member.id) ?? [];
    const quotations = quotationsByRep.get(member.id) ?? [];

    let monthlySales = 0;
    let yearlySales = 0;
    for (const inv of invoices) {
      if (inv.status !== "paid" || !inv.paidAt) continue;
      if (isThisYear(inv.paidAt)) yearlySales += inv.amount;
      if (isThisMonth(inv.paidAt)) monthlySales += inv.amount;
    }

    const closedDeals = deals.filter(
      (d) => d.status === "won" && isThisMonth(d.closedAt)
    ).length;

    const won = deals.filter((d) => d.status === "won").length;
    const lost = deals.filter((d) => d.status === "lost").length;
    const conversionRate = won + lost ? Math.round((won / (won + lost)) * 100) : 0;

    const totalAppointments = appointments.filter((a) =>
      isThisMonth(a.scheduledAt)
    ).length;

    const salesTrend = monthlySumWave(
      invoices
        .filter((i) => i.status === "paid")
        .map((i) => ({ date: i.paidAt, amount: i.amount })),
      SALES_TREND_MONTHS
    );

    const openPipelineValue = deals
      .filter((d) => d.status === "open")
      .reduce((sum, d) => sum + d.amount, 0);

    const activityTrend = computeActivityTrend([
      ...appointments.map((a) => a.createdAt),
      ...quotations.map((q) => q.sentAt),
    ]);

    const stalledCount =
      deals.filter((d) => isDealStale(d, now)).length +
      quotations.filter((q) => isQuotationOverdue(q, now)).length;

    return {
      ...member,
      monthlySales,
      yearlySales,
      closedDeals,
      conversionRate,
      avgDeal: closedDeals ? monthlySales / closedDeals : 0,
      totalAppointments,
      salesTrend,
      openPipelineValue,
      activityTrend,
      stalledCount,
    };
  });
}

export function computeTeamStats(people: TeamMember[]) {
  const monthlySalesTotal = people.reduce(
    (sum, person) => sum + person.monthlySales,
    0
  );
  const monthlyTargetTotal = people.reduce(
    (sum, person) => sum + person.monthlyTarget,
    0
  );
  const closedDealsTotal = people.reduce(
    (sum, person) => sum + person.closedDeals,
    0
  );
  const avgConversionRate = people.length
    ? people.reduce((sum, person) => sum + person.conversionRate, 0) /
      people.length
    : 0;

  return {
    monthlySalesTotal,
    monthlyTargetTotal,
    monthlyProgressPct: monthlyTargetTotal
      ? (monthlySalesTotal / monthlyTargetTotal) * 100
      : 0,
    closedDealsTotal,
    avgConversionRate,
  };
}

export type RankedTeamMember = TeamMember & {
  rank: number;
  contributionPct: number;
};

export function computeRanking(people: TeamMember[]): RankedTeamMember[] {
  const yearlyTotal = people.reduce(
    (sum, person) => sum + person.yearlySales,
    0
  );

  return [...people]
    .sort((a, b) => b.yearlySales - a.yearlySales)
    .map((person, index) => ({
      ...person,
      rank: index + 1,
      contributionPct: yearlyTotal
        ? (person.yearlySales / yearlyTotal) * 100
        : 0,
    }));
}
