"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { RadialTarget, MonthlyTargetCard } from "@/components/dashboard/target-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { SalespersonRanking } from "@/components/sales/salesperson-ranking";
import { PipelineSummary } from "@/components/sales/pipeline-summary";
import { TeamSnapshot } from "@/components/sales/team-snapshot";
import { NeedsFollowUp } from "@/components/sales/needs-follow-up";
import { WeeklyActivityCard } from "@/components/dashboard/weekly-activity-card";
import { PulseRow } from "@/components/dashboard/pulse-row";
import { CatalogOverview } from "@/components/products/catalog-overview";
import { ProductStatusOverview } from "@/components/products/product-status-overview";
import { BrandOverview } from "@/components/products/brand-overview";
import { Reveal } from "@/components/motion/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currentYear } from "@/lib/mock-data";
import type { Product } from "@/lib/mock-data";
import { currentMonthNumber } from "@/lib/target-period";
import {
  fetchTeamMembers,
  withTeamAggregates,
  computeRanking,
  type TeamMember,
  type RankedTeamMember,
} from "@/lib/supabase/team";
import { fetchAppointments, type Appointment } from "@/lib/supabase/appointments";
import { fetchQuotations, type Quotation } from "@/lib/supabase/quotations";
import { fetchDeals, type Deal } from "@/lib/supabase/deals";
import { fetchInvoices, type Invoice } from "@/lib/supabase/invoices";
import { fetchCompanyTargets, type CompanyTargets } from "@/lib/supabase/targets";
import { fetchProducts } from "@/lib/supabase/products";
import {
  computeCompanyRevenueSeries,
  computeMonthlyTotal,
  computePipelineCounts,
  computeTeamSnapshot,
  computeYearToDateTotals,
  sumPaidInYear,
  type TeamSnapshotAxis,
} from "@/lib/company-performance";
import type { MonthlyRevenuePoint, PipelineStage } from "@/lib/mock-data";
import { formatUSD } from "@/lib/format";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type RawData = {
  teamMembers: TeamMember[];
  appointments: Appointment[];
  quotations: Quotation[];
  deals: Deal[];
  invoices: Invoice[];
  products: Product[];
};

type DashboardData = {
  // Reflect the Year/Month filters below.
  selectedYearTotal: number;
  yoyGrowthPct: number;
  yearTarget: number;
  yearTargetProgressPct: number;
  monthlyActual: number;
  monthlyTarget: number;
  monthlyRemaining: number;
  monthlyProgressPct: number;
  avgSalesPerRep: number;
  avgSalesPerRepFootnote: string;
  activeReps: number;
  revenueSeries: MonthlyRevenuePoint[];
  // Always the real current period — the funnel/ranking/radar answer "how's
  // the team doing right now", not "how did the selected period go".
  ranking: RankedTeamMember[];
  pipelineStages: PipelineStage[];
  pipelineConversions: number[];
  teamSnapshot: TeamSnapshotAxis[];
  products: Product[];
};

export default function DashboardPage() {
  const [raw, setRaw] = useState<RawData | null>(null);
  // Targets are fetched per-year (the Supabase query is scoped that way).
  // currentYearTargets is always kept (needed for the true-current-period
  // Team Snapshot regardless of the filter); pastYearTargets only exists
  // while a different year is selected, so switching back to the current
  // year needs no refetch.
  const [currentYearTargets, setCurrentYearTargets] = useState<CompanyTargets | null>(null);
  const [pastYearTargets, setPastYearTargets] = useState<CompanyTargets | null>(null);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthNumber);

  useEffect(() => {
    Promise.all([
      fetchTeamMembers(),
      fetchAppointments(),
      fetchQuotations(),
      fetchDeals(),
      fetchInvoices(),
      fetchProducts(),
    ])
      .then(([teamMembers, appointments, quotations, deals, invoices, products]) => {
        setRaw({ teamMembers, appointments, quotations, deals, invoices, products });
      })
      .catch((err) => toast.error(err.message ?? "Couldn't load the dashboard"));

    fetchCompanyTargets(currentYear)
      .then(setCurrentYearTargets)
      .catch((err) => toast.error(err.message ?? "Couldn't load targets"));
  }, []);

  useEffect(() => {
    // Nothing to do — activeTargets below falls back to currentYearTargets
    // whenever selectedYear is the current year, ignoring any stale value
    // left over here from a previous non-current selection.
    if (selectedYear === currentYear) return;
    fetchCompanyTargets(selectedYear)
      .then(setPastYearTargets)
      .catch((err) => toast.error(err.message ?? "Couldn't load targets"));
  }, [selectedYear]);

  const activeTargets = selectedYear === currentYear ? currentYearTargets : pastYearTargets;

  // Every year that has at least one paid invoice, plus the current year
  // even if it has none yet — sorted newest first.
  const yearOptions = useMemo(() => {
    const years = new Set<number>([currentYear]);
    for (const inv of raw?.invoices ?? []) {
      if (inv.status === "paid" && inv.paidAt) {
        years.add(new Date(inv.paidAt).getFullYear());
      }
    }
    return [...years].sort((a, b) => b - a);
  }, [raw]);

  const data: DashboardData | null = useMemo(() => {
    if (!raw || !activeTargets) return null;
    const { teamMembers, appointments, quotations, deals, invoices, products } = raw;
    const reps = teamMembers.filter((m) => m.role === "sales_rep");
    const isRealCurrentYear = selectedYear === currentYear;
    const isRealCurrentMonth = isRealCurrentYear && selectedMonth === currentMonthNumber;

    // A year still in progress needs a like-for-like "as of today" cutoff
    // against last year, or it'd look artificially behind a complete year.
    // A fully-elapsed past year has no such asymmetry — compare full totals.
    let selectedYearTotal: number;
    let yoyGrowthPct: number;
    if (isRealCurrentYear) {
      const { currentYearTotal, previousYearToDateTotal } = computeYearToDateTotals(
        invoices,
        selectedYear,
        currentMonthNumber
      );
      selectedYearTotal = currentYearTotal;
      yoyGrowthPct = previousYearToDateTotal
        ? ((currentYearTotal - previousYearToDateTotal) / previousYearToDateTotal) * 100
        : 0;
    } else {
      const thisYearTotal = sumPaidInYear(invoices, selectedYear);
      const lastYearTotal = sumPaidInYear(invoices, selectedYear - 1);
      selectedYearTotal = thisYearTotal;
      yoyGrowthPct = lastYearTotal
        ? ((thisYearTotal - lastYearTotal) / lastYearTotal) * 100
        : 0;
    }

    const monthlyActual = computeMonthlyTotal(invoices, selectedYear, selectedMonth);
    const monthlyTarget = activeTargets.monthlyTargets[selectedMonth] ?? 0;

    const revenueSeries = computeCompanyRevenueSeries(
      invoices,
      selectedYear,
      isRealCurrentYear ? currentMonthNumber : 12
    );

    // True-current-period widgets — unaffected by the Year/Month filters.
    const repsWithAggregates = withTeamAggregates(
      reps,
      { appointments, deals, invoices },
      currentYear,
      currentMonthNumber
    );
    const pipeline = computePipelineCounts(
      appointments,
      quotations,
      deals,
      invoices,
      currentYear,
      currentMonthNumber
    );
    const trueMonthlyTarget = currentYearTargets?.monthlyTargets[currentMonthNumber] ?? 0;
    const trueMonthlyActual = computeMonthlyTotal(invoices, currentYear, currentMonthNumber);

    return {
      selectedYearTotal,
      yoyGrowthPct,
      yearTarget: activeTargets.yearlyTarget,
      yearTargetProgressPct: activeTargets.yearlyTarget
        ? (selectedYearTotal / activeTargets.yearlyTarget) * 100
        : 0,
      monthlyActual,
      monthlyTarget,
      monthlyRemaining: Math.max(monthlyTarget - monthlyActual, 0),
      monthlyProgressPct: monthlyTarget ? (monthlyActual / monthlyTarget) * 100 : 0,
      avgSalesPerRep: reps.length ? monthlyActual / reps.length : 0,
      avgSalesPerRepFootnote: `${isRealCurrentMonth ? "This month" : MONTH_NAMES[selectedMonth - 1]} · ${reps.length} active reps`,
      activeReps: reps.length,
      revenueSeries,
      ranking: computeRanking(repsWithAggregates),
      pipelineStages: pipeline.stages,
      pipelineConversions: pipeline.conversions,
      teamSnapshot: computeTeamSnapshot(
        trueMonthlyTarget ? (trueMonthlyActual / trueMonthlyTarget) * 100 : 0,
        pipeline.conversions,
        deals
      ),
      products,
    };
  }, [raw, activeTargets, currentYearTargets, selectedYear, selectedMonth]);

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader
          title="Sales Overview"
          description="Current year performance across the team"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={String(selectedYear)}
                onValueChange={(value) => value && setSelectedYear(Number(value))}
              >
                <SelectTrigger className="glass-panel filter-control h-8 gap-1.5 px-2.5 text-xs">
                  <SelectValue>{(value: string) => `Year ${value}`}</SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={String(selectedMonth)}
                onValueChange={(value) => value && setSelectedMonth(Number(value))}
              >
                <SelectTrigger className="glass-panel filter-control h-8 gap-1.5 px-2.5 text-xs">
                  <SelectValue>
                    {(value: string) => MONTH_NAMES[Number(value) - 1]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="end">
                  {MONTH_NAMES.map((name, i) => (
                    <SelectItem key={name} value={String(i + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
      </Reveal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        <Reveal delay={0.05}>
          {data ? (
            <MetricCard
              label="Total Sales"
              value={formatUSD(data.selectedYearTotal)}
              delta={{ value: data.yoyGrowthPct, label: "vs last year" }}
              wave={data.revenueSeries.map((point) => point.current)}
              badge={
                selectedYear !== currentYear && (
                  <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                    {selectedYear}
                  </span>
                )
              }
            />
          ) : (
            <Skeleton className="h-[132px] w-full rounded-2xl" />
          )}
        </Reveal>
        <Reveal delay={0.1}>
          {data ? (
            <MetricCard
              label="Avg. Sales / Rep"
              value={formatUSD(data.avgSalesPerRep)}
              footnote={data.avgSalesPerRepFootnote}
              wave={data.revenueSeries.map(
                (point) => point.current / (data.activeReps || 1)
              )}
            />
          ) : (
            <Skeleton className="h-[132px] w-full rounded-2xl" />
          )}
        </Reveal>
        <Reveal delay={0.15} className="sm:col-span-2 lg:col-span-1">
          {data ? (
            <RadialTarget
              label="Year Target"
              current={data.selectedYearTotal}
              target={data.yearTarget}
              progressPct={data.yearTargetProgressPct}
              action={
                selectedYear !== currentYear && (
                  <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                    {selectedYear}
                  </span>
                )
              }
            />
          ) : (
            <Skeleton className="h-[132px] w-full rounded-2xl" />
          )}
        </Reveal>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <Reveal delay={0.2} className="lg:col-span-2">
          <ChartCard
            title="Revenue Performance"
            description={`Paid sales, ${selectedYear} vs. ${selectedYear - 1}`}
          >
            {data ? (
              <RevenueChart data={data.revenueSeries} />
            ) : (
              <Skeleton className="h-[220px] w-full rounded-xl sm:h-[250px]" />
            )}
          </ChartCard>
        </Reveal>
        <Reveal delay={0.25}>
          {data ? (
            <MonthlyTargetCard
              label="Monthly Target"
              monthLabel={`${MONTH_NAMES[selectedMonth - 1].slice(0, 3)} ${selectedYear}`}
              current={data.monthlyActual}
              target={data.monthlyTarget}
              remaining={data.monthlyRemaining}
              progressPct={data.monthlyProgressPct}
            />
          ) : (
            <Skeleton className="h-64 w-full rounded-2xl" />
          )}
        </Reveal>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <Reveal delay={0.3}>
          {data ? (
            <SalespersonRanking people={data.ranking} />
          ) : (
            <Skeleton className="h-72 w-full rounded-2xl" />
          )}
        </Reveal>
        <Reveal delay={0.35}>
          {data ? (
            <PipelineSummary
              stages={data.pipelineStages}
              conversions={data.pipelineConversions}
            />
          ) : (
            <Skeleton className="h-72 w-full rounded-2xl" />
          )}
        </Reveal>
        <Reveal delay={0.38}>
          {data ? (
            <TeamSnapshot data={data.teamSnapshot} />
          ) : (
            <Skeleton className="h-72 w-full rounded-2xl" />
          )}
        </Reveal>
      </div>

      <Reveal delay={0.4}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <NeedsFollowUp />
          <WeeklyActivityCard />
        </div>
      </Reveal>

      <Reveal delay={0.42}>
        <PulseRow />
      </Reveal>

      <Reveal delay={0.45}>
        {data ? (
          <CatalogOverview products={data.products} />
        ) : (
          <Skeleton className="h-64 w-full rounded-2xl" />
        )}
      </Reveal>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <Reveal delay={0.5}>
          {data ? (
            <ProductStatusOverview products={data.products} />
          ) : (
            <Skeleton className="h-64 w-full rounded-2xl" />
          )}
        </Reveal>
        <Reveal delay={0.55}>
          {data ? (
            <BrandOverview products={data.products} />
          ) : (
            <Skeleton className="h-64 w-full rounded-2xl" />
          )}
        </Reveal>
      </div>
    </div>
  );
}
