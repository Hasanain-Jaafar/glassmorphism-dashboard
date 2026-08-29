"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { RadialTarget, MonthlyTargetCard } from "@/components/dashboard/target-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { SalespersonRanking } from "@/components/sales/salesperson-ranking";
import { PipelineSummary } from "@/components/sales/pipeline-summary";
import { TeamSnapshot } from "@/components/sales/team-snapshot";
import { PulseRow } from "@/components/dashboard/pulse-row";
import { CatalogOverview } from "@/components/products/catalog-overview";
import { ProductStatusOverview } from "@/components/products/product-status-overview";
import { BrandOverview } from "@/components/products/brand-overview";
import { Reveal } from "@/components/motion/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { currentYear } from "@/lib/mock-data";
import type { Product } from "@/lib/mock-data";
import { currentMonthLabel, currentMonthNumber } from "@/lib/target-period";
import {
  fetchTeamMembers,
  withTeamAggregates,
  computeRanking,
  type RankedTeamMember,
} from "@/lib/supabase/team";
import { fetchAppointments } from "@/lib/supabase/appointments";
import { fetchQuotations } from "@/lib/supabase/quotations";
import { fetchDeals } from "@/lib/supabase/deals";
import { fetchInvoices } from "@/lib/supabase/invoices";
import { fetchCompanyTargets } from "@/lib/supabase/targets";
import { fetchProducts } from "@/lib/supabase/products";
import {
  computeCompanyRevenueSeries,
  computeMonthlyTotal,
  computePipelineCounts,
  computeTeamSnapshot,
  computeYearToDateTotals,
  type TeamSnapshotAxis,
} from "@/lib/company-performance";
import type { MonthlyRevenuePoint, PipelineStage } from "@/lib/mock-data";
import { formatUSD } from "@/lib/format";

type DashboardData = {
  currentYearTotal: number;
  yoyGrowthPct: number;
  yearTarget: number;
  yearTargetProgressPct: number;
  monthlyActual: number;
  monthlyTarget: number;
  monthlyRemaining: number;
  monthlyProgressPct: number;
  avgSalesPerRep: number;
  activeReps: number;
  revenueSeries: MonthlyRevenuePoint[];
  ranking: RankedTeamMember[];
  pipelineStages: PipelineStage[];
  pipelineConversions: number[];
  teamSnapshot: TeamSnapshotAxis[];
  products: Product[];
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    Promise.all([
      fetchTeamMembers(),
      fetchAppointments(),
      fetchQuotations(),
      fetchDeals(),
      fetchInvoices(),
      fetchCompanyTargets(currentYear),
      fetchProducts(),
    ])
      .then(
        ([
          teamMembers,
          appointments,
          quotations,
          deals,
          invoices,
          companyTargets,
          products,
        ]) => {
          const reps = teamMembers.filter((m) => m.role === "sales_rep");
          const repsWithAggregates = withTeamAggregates(
            reps,
            { appointments, deals, invoices },
            currentYear,
            currentMonthNumber
          );

          const { currentYearTotal, previousYearToDateTotal } =
            computeYearToDateTotals(invoices, currentYear, currentMonthNumber);
          const yoyGrowthPct = previousYearToDateTotal
            ? ((currentYearTotal - previousYearToDateTotal) /
                previousYearToDateTotal) *
              100
            : 0;

          const monthlyActual = computeMonthlyTotal(
            invoices,
            currentYear,
            currentMonthNumber
          );
          const monthlyTarget = companyTargets.monthlyTargets[currentMonthNumber] ?? 0;

          const pipeline = computePipelineCounts(
            appointments,
            quotations,
            deals,
            invoices,
            currentYear,
            currentMonthNumber
          );

          setData({
            currentYearTotal,
            yoyGrowthPct,
            yearTarget: companyTargets.yearlyTarget,
            yearTargetProgressPct: companyTargets.yearlyTarget
              ? (currentYearTotal / companyTargets.yearlyTarget) * 100
              : 0,
            monthlyActual,
            monthlyTarget,
            monthlyRemaining: Math.max(monthlyTarget - monthlyActual, 0),
            monthlyProgressPct: monthlyTarget
              ? (monthlyActual / monthlyTarget) * 100
              : 0,
            avgSalesPerRep: reps.length ? monthlyActual / reps.length : 0,
            activeReps: reps.length,
            revenueSeries: computeCompanyRevenueSeries(
              invoices,
              currentYear,
              currentMonthNumber
            ),
            ranking: computeRanking(repsWithAggregates),
            pipelineStages: pipeline.stages,
            pipelineConversions: pipeline.conversions,
            teamSnapshot: computeTeamSnapshot(
              monthlyTarget ? (monthlyActual / monthlyTarget) * 100 : 0,
              pipeline.conversions,
              deals
            ),
            products,
          });
        }
      )
      .catch((err) => {
        toast.error(err.message ?? "Couldn't load the dashboard");
      });
  }, []);

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader
          title="Sales Overview"
          description="Current year performance across the team"
        />
      </Reveal>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        <Reveal delay={0.05}>
          {data ? (
            <MetricCard
              label="Total Sales"
              value={formatUSD(data.currentYearTotal)}
              delta={{ value: data.yoyGrowthPct, label: "vs last year" }}
              wave={data.revenueSeries.map((point) => point.current)}
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
              footnote={`This month · ${data.activeReps} active reps`}
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
              current={data.currentYearTotal}
              target={data.yearTarget}
              progressPct={data.yearTargetProgressPct}
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
            description="Paid sales, current year vs. last year"
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
              monthLabel={currentMonthLabel}
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
