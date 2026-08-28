"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { MonthlyTargetCard } from "@/components/dashboard/target-card";
import { TargetTrendChart } from "@/components/charts/target-trend-chart";
import { PipelineChart } from "@/components/charts/pipeline-chart";
import { AnalyticsFilterBar } from "@/components/sales/analytics-filter-bar";
import { NeedsAttention } from "@/components/sales/needs-attention";
import { SalespersonComparisonTable } from "@/components/tables/salesperson-comparison-table";
import { Reveal } from "@/components/motion/reveal";
import { salespeople } from "@/lib/mock-data";
import {
  periodOptions,
  getOverview,
  trendFor,
  funnelFor,
  needsAttention,
  comparisonRows,
  type Period,
} from "@/lib/sales-analytics";
import { formatUSD, formatPercent } from "@/lib/format";

export default function SalesPersonsPage() {
  const [personId, setPersonId] = useState("all");
  const [period, setPeriod] = useState<Period>("month");

  const periodLabel =
    periodOptions.find((option) => option.value === period)?.label ??
    "This Month";

  const selectedPerson = useMemo(
    () => salespeople.find((p) => p.id === personId),
    [personId]
  );
  const scopeLabel = selectedPerson ? selectedPerson.name : "Team-wide";

  const overview = useMemo(
    () => getOverview(personId, period),
    [personId, period]
  );
  const trend = useMemo(() => trendFor(personId), [personId]);
  const funnel = useMemo(() => funnelFor(personId, period), [personId, period]);
  const attentionEntries = useMemo(() => {
    const entries = needsAttention(period);
    return personId === "all"
      ? entries
      : entries.filter((entry) => entry.person.id === personId);
  }, [personId, period]);
  const comparison = useMemo(() => comparisonRows(period), [period]);

  const remaining = Math.max(overview.target - overview.totalSales, 0);

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader
          title="Salespersons KPI"
          description="Individual performance, targets, and pipeline health"
          actions={
            <AnalyticsFilterBar
              people={salespeople}
              personId={personId}
              onPersonChange={setPersonId}
              period={period}
              onPeriodChange={setPeriod}
            />
          }
        />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6 lg:gap-6">
          <MetricCard
            label="Total Sales"
            value={formatUSD(overview.totalSales)}
            footnote={`${periodLabel} · ${scopeLabel}`}
          />
          <MetricCard
            label="Target"
            value={formatUSD(overview.target)}
            footnote={`${periodLabel} target`}
          />
          <MetricCard
            label="Achievement"
            value={formatPercent(overview.achievementPct, 0)}
            footnote={
              overview.achievementPct >= 100
                ? "Target met"
                : `${formatUSD(remaining)} remaining`
            }
          />
          <MetricCard
            label="Deals Closed"
            value={String(overview.dealsClosed)}
            footnote={periodLabel}
          />
          <MetricCard
            label="Conversion Rate"
            value={formatPercent(overview.conversionRate, 0)}
            footnote="Quote-to-close rate"
          />
          <MetricCard
            label="Avg. Deal Value"
            value={formatUSD(overview.avgDealValue)}
            footnote={`${periodLabel}, per deal`}
          />
        </div>
      </Reveal>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <Reveal delay={0.1}>
          <MonthlyTargetCard
            label="Performance vs Target"
            monthLabel={periodLabel}
            current={overview.totalSales}
            target={overview.target}
            remaining={remaining}
            progressPct={overview.achievementPct}
          />
        </Reveal>
        <Reveal delay={0.15} className="lg:col-span-2">
          <ChartCard
            title="Sales Trend"
            description={`Monthly sales vs. target · ${scopeLabel}`}
          >
            <TargetTrendChart data={trend} />
          </ChartCard>
        </Reveal>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <Reveal delay={0.2}>
          <ChartCard
            title="Sales Funnel"
            description={`Appointments to paid invoices · ${periodLabel}`}
          >
            <PipelineChart stages={funnel.stages} conversions={funnel.conversions} />
          </ChartCard>
        </Reveal>
        <Reveal delay={0.25}>
          <NeedsAttention entries={attentionEntries} />
        </Reveal>
      </div>

      <Reveal delay={0.3} className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            Salesperson Comparison
          </h2>
          <p className="mt-0.5 text-xs text-text-tertiary">
            {periodLabel} · click a column to sort
          </p>
        </div>
        <SalespersonComparisonTable data={comparison} highlightedId={personId} />
      </Reveal>
    </div>
  );
}
