import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { RadialTarget, MonthlyTargetCard } from "@/components/dashboard/target-card";
import { RevenueChart } from "@/components/charts/revenue-chart";
import { SalespersonRanking } from "@/components/sales/salesperson-ranking";
import { PipelineSummary } from "@/components/sales/pipeline-summary";
import { PulseRow } from "@/components/dashboard/pulse-row";
import { CatalogOverview } from "@/components/products/catalog-overview";
import { ProductStatusOverview } from "@/components/products/product-status-overview";
import { BrandOverview } from "@/components/products/brand-overview";
import { Reveal } from "@/components/motion/reveal";
import {
  avgSalesPerRep,
  company,
  monthlyProgressPct,
  monthlyRemaining,
  revenueSeries,
  yearTargetProgressPct,
  yoyGrowthPct,
} from "@/lib/mock-data";
import { formatUSD } from "@/lib/format";

export default function DashboardPage() {
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
          <MetricCard
            label="Total Sales"
            value={formatUSD(company.currentYearTotal)}
            delta={{ value: yoyGrowthPct, label: "vs last year" }}
            wave={revenueSeries.map((point) => point.current)}
          />
        </Reveal>
        <Reveal delay={0.1}>
          <MetricCard
            label="Avg. Sales / Rep"
            value={formatUSD(avgSalesPerRep)}
            footnote={`This month · ${company.activeReps} active reps`}
            wave={revenueSeries.map(
              (point) => point.current / company.activeReps
            )}
          />
        </Reveal>
        <Reveal delay={0.15} className="sm:col-span-2 lg:col-span-1">
          <RadialTarget
            label="Year Target"
            current={company.currentYearTotal}
            target={company.yearTarget}
            progressPct={yearTargetProgressPct}
          />
        </Reveal>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <Reveal delay={0.2} className="lg:col-span-2">
          <ChartCard
            title="Revenue Performance"
            description="Paid sales, current year vs. last year"
          >
            <RevenueChart data={revenueSeries} />
          </ChartCard>
        </Reveal>
        <Reveal delay={0.25}>
          <MonthlyTargetCard
            label="Monthly Target"
            monthLabel={company.currentMonthLabel}
            current={company.monthlyActual}
            target={company.monthlyTarget}
            remaining={monthlyRemaining}
            progressPct={monthlyProgressPct}
          />
        </Reveal>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <Reveal delay={0.3}>
          <SalespersonRanking />
        </Reveal>
        <Reveal delay={0.35}>
          <PipelineSummary />
        </Reveal>
      </div>

      <Reveal delay={0.4}>
        <PulseRow />
      </Reveal>

      <Reveal delay={0.45}>
        <CatalogOverview />
      </Reveal>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <Reveal delay={0.5}>
          <ProductStatusOverview />
        </Reveal>
        <Reveal delay={0.55}>
          <BrandOverview />
        </Reveal>
      </div>
    </div>
  );
}
