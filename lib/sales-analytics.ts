import {
  salespeople,
  company,
  revenueSeries,
  pipeline,
  pipelineConversion,
  salesForPeriod,
  currentYear,
  type Salesperson,
  type PipelineStage,
} from "@/lib/mock-data";

/**
 * Per-salesperson analytics for the KPI tab on /team. Real appointment/
 * quotation/deal/invoice counts don't exist yet (see lib/supabase/team.ts),
 * so period and funnel figures here are derived from the mock roster's
 * monthly/yearly totals using the company's seasonal curve — swap this file
 * for Supabase aggregations once the sales workflow tables are live.
 */

export type Period = "month" | "quarter" | "year";

export const periodOptions: { value: Period; label: string }[] = [
  { value: "month", label: "This Month" },
  { value: "quarter", label: "This Quarter" },
  { value: "year", label: "Current Year" },
];

const monthOrder = revenueSeries.map((point) => point.month);

function currentQuarterMonths(): string[] {
  const idx = monthOrder.indexOf(company.currentMonthLabel.slice(0, 3));
  const quarterStart = Math.floor(idx / 3) * 3;
  return monthOrder.slice(quarterStart, idx + 1);
}

function periodMonths(period: Period): string[] {
  if (period === "month") return monthOrder.slice(-1);
  if (period === "quarter") return currentQuarterMonths();
  return monthOrder;
}

/** Distributes a flat monthly target across a month using the company's seasonal curve — exported for reuse by lib/target-period.ts. */
export function seasonalTarget(monthlyTarget: number, month: string): number {
  const point = revenueSeries.find((p) => p.month === month);
  if (!point) return monthlyTarget;
  return monthlyTarget * (point.current / company.monthlyActual);
}

function periodSales(person: Salesperson, period: Period): number {
  if (period === "year") return person.yearlySales;
  return periodMonths(period).reduce(
    (sum, month) => sum + salesForPeriod(person, currentYear, month),
    0
  );
}

function periodTarget(person: Salesperson, period: Period): number {
  if (period === "year") return person.yearlyTarget;
  return periodMonths(period).reduce(
    (sum, month) => sum + seasonalTarget(person.monthlyTarget, month),
    0
  );
}

/** How many "months' worth" this period represents for a given person, used to scale count-based fields (deals, appointments). */
function periodRatio(person: Salesperson, period: Period): number {
  if (period === "month") return 1;
  return person.monthlySales
    ? periodSales(person, period) / person.monthlySales
    : periodMonths(period).length;
}

export type PersonOverview = {
  totalSales: number;
  target: number;
  achievementPct: number;
  dealsClosed: number;
  conversionRate: number;
  avgDealValue: number;
};

export function overviewForPerson(
  person: Salesperson,
  period: Period
): PersonOverview {
  const totalSales = periodSales(person, period);
  const target = periodTarget(person, period);
  const dealsClosed = Math.max(
    0,
    Math.round(person.closedDeals * periodRatio(person, period))
  );

  return {
    totalSales,
    target,
    achievementPct: target ? (totalSales / target) * 100 : 0,
    dealsClosed,
    conversionRate: person.conversionRate,
    avgDealValue: dealsClosed ? totalSales / dealsClosed : person.avgDeal,
  };
}

export function overviewForTeam(period: Period): PersonOverview {
  const totals = salespeople.reduce(
    (acc, person) => {
      const overview = overviewForPerson(person, period);
      acc.totalSales += overview.totalSales;
      acc.target += overview.target;
      acc.dealsClosed += overview.dealsClosed;
      acc.conversionSum += overview.conversionRate;
      return acc;
    },
    { totalSales: 0, target: 0, dealsClosed: 0, conversionSum: 0 }
  );

  return {
    totalSales: totals.totalSales,
    target: totals.target,
    achievementPct: totals.target ? (totals.totalSales / totals.target) * 100 : 0,
    dealsClosed: totals.dealsClosed,
    conversionRate: salespeople.length
      ? totals.conversionSum / salespeople.length
      : 0,
    avgDealValue: totals.dealsClosed
      ? totals.totalSales / totals.dealsClosed
      : 0,
  };
}

export function getOverview(personId: string, period: Period): PersonOverview {
  if (personId === "all") return overviewForTeam(period);
  const person = salespeople.find((p) => p.id === personId);
  return person ? overviewForPerson(person, period) : overviewForTeam(period);
}

export type TrendPoint = { month: string; actual: number; target: number };

/** Monthly actual-vs-target trend, always shown YTD regardless of the period filter. */
export function trendFor(personId: string): TrendPoint[] {
  if (personId === "all") {
    return revenueSeries.map((point) => ({
      month: point.month,
      actual: point.current,
      target: seasonalTarget(company.monthlyTarget, point.month),
    }));
  }

  const person = salespeople.find((p) => p.id === personId);
  if (!person) return [];

  return revenueSeries.map((point) => ({
    month: point.month,
    actual: salesForPeriod(person, currentYear, point.month),
    target: seasonalTarget(person.monthlyTarget, point.month),
  }));
}

export type FunnelResult = {
  stages: PipelineStage[];
  conversions: number[];
};

function buildFunnel(baseAppointments: number, baseClosed: number, ratio: number): FunnelResult {
  const appointments = Math.max(0, Math.round(baseAppointments * ratio));
  const quotations = Math.max(
    0,
    Math.round(appointments * (pipelineConversion.appointmentToQuotation / 100))
  );
  const closed = Math.max(0, Math.round(baseClosed * ratio));
  const paid = Math.max(
    0,
    Math.round(closed * (pipelineConversion.closedToPaid / 100))
  );

  const stages: PipelineStage[] = [
    { key: "appointments", label: "Appointments", value: appointments },
    { key: "quotations", label: "Quotations", value: quotations },
    { key: "deals", label: "Closed Deals", value: closed },
    { key: "invoices", label: "Paid Invoices", value: paid },
  ];

  return {
    stages,
    conversions: [
      appointments ? Math.round((quotations / appointments) * 100) : 0,
      quotations ? Math.round((closed / quotations) * 100) : 0,
      closed ? Math.round((paid / closed) * 100) : 0,
    ],
  };
}

export function funnelFor(personId: string, period: Period): FunnelResult {
  if (personId === "all") {
    if (period === "month") {
      return buildFunnel(
        pipeline[0].value,
        pipeline[2].value,
        1
      );
    }
    const teamSales = overviewForTeam(period).totalSales;
    const monthSales = overviewForTeam("month").totalSales;
    const ratio = monthSales ? teamSales / monthSales : periodMonths(period).length;
    return buildFunnel(pipeline[0].value, pipeline[2].value, ratio);
  }

  const person = salespeople.find((p) => p.id === personId);
  if (!person) return buildFunnel(0, 0, 1);

  return buildFunnel(
    person.totalAppointments,
    person.closedDeals,
    periodRatio(person, period)
  );
}

export type AttentionReason =
  | "Below target"
  | "Low conversion"
  | "Too few appointments"
  | "Quotes not converting"
  | "Deals unpaid";

export type AttentionEntry = {
  person: Salesperson;
  overview: PersonOverview;
  reasons: AttentionReason[];
};

export function needsAttention(period: Period): AttentionEntry[] {
  const avgAppointments =
    salespeople.reduce((sum, p) => sum + p.totalAppointments, 0) /
    (salespeople.length || 1);

  return salespeople
    .map((person) => {
      const overview = overviewForPerson(person, period);
      const funnel = funnelFor(person.id, period);
      const [appointments, quotations, closed, paid] = funnel.stages.map(
        (s) => s.value
      );
      const reasons: AttentionReason[] = [];

      if (overview.achievementPct < 80) reasons.push("Below target");
      if (person.conversionRate < 55) reasons.push("Low conversion");
      if (appointments < avgAppointments * 0.7) reasons.push("Too few appointments");
      if (quotations > 0 && closed / quotations < 0.45)
        reasons.push("Quotes not converting");
      if (closed > 0 && paid / closed < 0.75) reasons.push("Deals unpaid");

      return { person, overview, reasons };
    })
    .filter((entry) => entry.reasons.length > 0)
    .sort(
      (a, b) =>
        b.reasons.length - a.reasons.length ||
        a.overview.achievementPct - b.overview.achievementPct
    );
}

export type ComparisonRow = {
  id: string;
  name: string;
  initials: string;
  rank: number;
  sales: number;
  target: number;
  achievementPct: number;
  deals: number;
  conversionRate: number;
};

export function comparisonRows(period: Period): ComparisonRow[] {
  return salespeople
    .map((person) => {
      const overview = overviewForPerson(person, period);
      return {
        id: person.id,
        name: person.name,
        initials: person.initials,
        sales: overview.totalSales,
        target: overview.target,
        achievementPct: overview.achievementPct,
        deals: overview.dealsClosed,
        conversionRate: overview.conversionRate,
      };
    })
    .sort((a, b) => b.sales - a.sales)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}
