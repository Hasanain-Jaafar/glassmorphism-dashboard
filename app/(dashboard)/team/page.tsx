"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Gauge, Table2, Trophy, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { MonthlyTargetCard } from "@/components/dashboard/target-card";
import { TargetTrendChart } from "@/components/charts/target-trend-chart";
import { PipelineChart } from "@/components/charts/pipeline-chart";
import { AnalyticsFilterBar } from "@/components/sales/analytics-filter-bar";
import { NeedsAttention } from "@/components/sales/needs-attention";
import { SalespersonComparisonTable } from "@/components/tables/salesperson-comparison-table";
import { SalespersonCard } from "@/components/sales/salesperson-card";
import { SalespersonRankChart } from "@/components/charts/salesperson-chart";
import { SalespersonRankingTable } from "@/components/tables/salesperson-ranking-table";
import { Reveal } from "@/components/motion/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
  TabsTab,
} from "@/components/ui/tabs";
import {
  fetchTeamMembers,
  computeTeamStats,
  computeRanking,
  type TeamMember,
} from "@/lib/supabase/team";
import { salespeople, currentYear } from "@/lib/mock-data";
import {
  periodOptions,
  getOverview,
  trendFor,
  funnelFor,
  needsAttention,
  type Period,
  type ComparisonRow,
} from "@/lib/sales-analytics";
import { currentMonthNumber } from "@/lib/target-period";
import {
  fetchIndividualTargets,
  type CompanyTargets,
} from "@/lib/supabase/targets";
import { formatUSD, formatPercent } from "@/lib/format";

const teamTabs = ["kpi", "team", "rankings", "all"] as const;
type TeamTab = (typeof teamTabs)[number];

function isTeamTab(value: string | null): value is TeamTab {
  return (teamTabs as readonly string[]).includes(value ?? "");
}

/** The month numbers a KPI period covers — empty for "year" (handled as the yearly target directly). */
function monthsForPeriod(period: Period): number[] {
  if (period === "year") return [];
  if (period === "month") return [currentMonthNumber];
  const quarterStart = Math.floor((currentMonthNumber - 1) / 3) * 3 + 1;
  return Array.from(
    { length: currentMonthNumber - quarterStart + 1 },
    (_, i) => quarterStart + i
  );
}

/**
 * Real Salesperson Comparison rows: every active sales rep (not just the
 * mock roster's 7), with real individual targets. Sales/deals/conversion
 * are 0 until the appointments/quotations/deals/invoices workflow exists —
 * see lib/supabase/team.ts.
 */
function realComparisonRows(
  team: TeamMember[],
  targets: Record<string, CompanyTargets>,
  period: Period
): ComparisonRow[] {
  const months = monthsForPeriod(period);
  return team
    .filter((member) => member.role === "sales_rep")
    .map((member) => {
      const personTargets = targets[member.id] ?? {
        yearlyTarget: 0,
        monthlyTargets: {},
      };
      const target =
        period === "year"
          ? personTargets.yearlyTarget
          : months.reduce(
              (sum, month) => sum + (personTargets.monthlyTargets[month] ?? 0),
              0
            );
      return {
        id: member.id,
        name: member.name,
        initials: member.initials,
        rank: 0,
        sales: 0,
        target,
        achievementPct: 0,
        deals: 0,
        conversionRate: 0,
      };
    })
    .sort((a, b) => b.target - a.target)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export default function TeamPage() {
  const [people, setPeople] = useState<TeamMember[] | null>(null);
  const [individualTargets, setIndividualTargets] = useState<
    Record<string, CompanyTargets>
  >({});

  useEffect(() => {
    fetchTeamMembers()
      .then(setPeople)
      .catch((err) => toast.error(err.message ?? "Couldn't load the team"));
    fetchIndividualTargets(currentYear)
      .then(setIndividualTargets)
      .catch((err) => toast.error(err.message ?? "Couldn't load targets"));
  }, []);

  const searchParams = useSearchParams();
  const highlightedId = searchParams.get("person");
  const requestedTab = searchParams.get("tab");
  const [flashId, setFlashId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(
    isTeamTab(requestedTab) ? requestedTab : "kpi"
  );

  // Sync activeTab when a new ?tab= deep link arrives (React's documented
  // "adjust state during render" pattern).
  const [prevRequestedTab, setPrevRequestedTab] = useState(requestedTab);
  if (requestedTab !== prevRequestedTab) {
    setPrevRequestedTab(requestedTab);
    if (isTeamTab(requestedTab)) {
      setActiveTab(requestedTab);
    }
  }

  // Sync activeTab + flashId when a new ?person= deep link arrives — this
  // takes priority over ?tab= since a person link always means "show me
  // that rep's card."
  const [prevHighlightedId, setPrevHighlightedId] = useState(highlightedId);
  if (highlightedId !== prevHighlightedId) {
    setPrevHighlightedId(highlightedId);
    if (highlightedId) {
      setActiveTab("team");
      setFlashId(highlightedId);
    }
  }

  // Scrolling + the highlight timeout are real DOM side effects, so they
  // stay in an effect (it doesn't call setActiveTab, so it isn't flagged).
  useEffect(() => {
    if (!highlightedId) return;
    const el = document.getElementById(`salesperson-${highlightedId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const timeout = setTimeout(() => setFlashId(null), 2400);
    return () => clearTimeout(timeout);
  }, [highlightedId]);

  const stats = useMemo(
    () => computeTeamStats(people ?? []),
    [people]
  );
  const ranking = useMemo(() => computeRanking(people ?? []), [people]);
  const topPerformer = ranking[0];
  const hasSalesData = ranking.some((p) => p.yearlySales > 0);

  const avgDealSize = people?.length
    ? people.reduce((sum, person) => sum + person.avgDeal, 0) / people.length
    : 0;

  // KPI tab state — mirrors the standalone Sales Team KPI page this tab replaces.
  const [kpiPersonId, setKpiPersonId] = useState("all");
  const [period, setPeriod] = useState<Period>("month");

  const periodLabel =
    periodOptions.find((option) => option.value === period)?.label ??
    "This Month";

  const selectedPerson = useMemo(
    () => salespeople.find((p) => p.id === kpiPersonId),
    [kpiPersonId]
  );
  const scopeLabel = selectedPerson ? selectedPerson.name : "Team-wide";

  const overview = useMemo(
    () => getOverview(kpiPersonId, period),
    [kpiPersonId, period]
  );
  const trend = useMemo(() => trendFor(kpiPersonId), [kpiPersonId]);
  const funnel = useMemo(
    () => funnelFor(kpiPersonId, period),
    [kpiPersonId, period]
  );
  const attentionEntries = useMemo(() => {
    const entries = needsAttention(period);
    return kpiPersonId === "all"
      ? entries
      : entries.filter((entry) => entry.person.id === kpiPersonId);
  }, [kpiPersonId, period]);
  const comparison = useMemo(
    () => realComparisonRows(people ?? [], individualTargets, period),
    [people, individualTargets, period]
  );

  const kpiRemaining = Math.max(overview.target - overview.totalSales, 0);

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader title="Sales Team" />
      </Reveal>

      <Reveal delay={0.05}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTab value="kpi">
                <Gauge className="size-[15px]" />
                KPI
              </TabsTab>
              <TabsTab value="team">
                <Users className="size-[15px]" />
                Team
              </TabsTab>
              <TabsTab value="rankings">
                <Trophy className="size-[15px]" />
                Rankings
              </TabsTab>
              <TabsTab value="all">
                <Table2 className="size-[15px]" />
                All Salespeople
              </TabsTab>
              <TabsIndicator />
            </TabsList>

            {activeTab === "kpi" && (
              <AnalyticsFilterBar
                people={salespeople}
                personId={kpiPersonId}
                onPersonChange={setKpiPersonId}
                period={period}
                onPeriodChange={setPeriod}
              />
            )}
          </div>

          <TabsPanel value="kpi" className="space-y-6">
            <p className="text-sm text-text-tertiary">
              Individual performance, targets, and pipeline health
            </p>

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
                    : `${formatUSD(kpiRemaining)} remaining`
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

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
              <MonthlyTargetCard
                label="Performance vs Target"
                monthLabel={periodLabel}
                current={overview.totalSales}
                target={overview.target}
                remaining={kpiRemaining}
                progressPct={overview.achievementPct}
              />
              <ChartCard
                title="Sales Trend"
                description={`Monthly sales vs. target · ${scopeLabel}`}
                className="lg:col-span-2"
              >
                <TargetTrendChart data={trend} />
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
              <ChartCard
                title="Sales Funnel"
                description={`Appointments to paid invoices · ${periodLabel}`}
              >
                <PipelineChart
                  stages={funnel.stages}
                  conversions={funnel.conversions}
                />
              </ChartCard>
              <NeedsAttention entries={attentionEntries} />
            </div>

            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Salesperson Comparison
                </h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {periodLabel} · click a column to sort
                </p>
              </div>
              <SalespersonComparisonTable
                data={comparison}
                highlightedId={kpiPersonId}
              />
            </div>
          </TabsPanel>

          <TabsPanel value="team" className="space-y-6">
            <p className="text-sm text-text-tertiary">
              Performance and targets for every sales representative
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              <MetricCard
                label="Team Sales"
                value={formatUSD(stats.monthlySalesTotal)}
                footnote={`This month · of ${formatUSD(stats.monthlyTargetTotal)} target`}
              />
              <MetricCard
                label="Target Progress"
                value={formatPercent(stats.monthlyProgressPct, 0)}
                footnote="This month, team-wide"
              />
              <MetricCard
                label="Closed Deals"
                value={String(stats.closedDealsTotal)}
                footnote="This month, across the team"
              />
              <MetricCard
                label="Avg. Conversion"
                value={formatPercent(stats.avgConversionRate, 0)}
                footnote="This month, team average"
              />
            </div>

            {people === null ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-56 rounded-2xl" />
                ))}
              </div>
            ) : people.length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 text-center">
                <p className="text-sm font-medium text-foreground">
                  No sales representatives yet
                </p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-text-tertiary">
                  Add your first team member from Settings → Team & Access to
                  see them here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3">
                {people.map((person) => (
                  <SalespersonCard
                    key={person.id}
                    person={person}
                    highlighted={person.id === flashId}
                  />
                ))}
              </div>
            )}
          </TabsPanel>

          <TabsPanel value="rankings" className="space-y-6">
            <p className="text-sm text-text-tertiary">
              Year-to-date performance analytics and rankings
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              <MetricCard
                label="Top Performer"
                value={topPerformer ? topPerformer.name : "—"}
                icon={Trophy}
                footnote={
                  topPerformer && hasSalesData
                    ? `${formatPercent(topPerformer.contributionPct, 0)} contribution · ${formatUSD(topPerformer.yearlySales)}`
                    : "No sales recorded yet"
                }
              />
              <MetricCard
                label="Team Sales"
                value={formatUSD(
                  ranking.reduce((sum, p) => sum + p.yearlySales, 0)
                )}
                footnote="Year to date, paid"
              />
              <MetricCard
                label="Avg. Deal Size"
                value={formatUSD(avgDealSize)}
                footnote="Per closed deal, team average"
              />
              <MetricCard
                label="Avg. Conversion"
                value={formatPercent(stats.avgConversionRate, 0)}
                footnote="Team average"
              />
            </div>

            <ChartCard
              title="Performance Ranking"
              description="Contribution to year-to-date sales"
            >
              {ranking.length === 0 ? (
                <p className="py-6 text-center text-sm text-text-tertiary">
                  Rankings will appear once your team is added.
                </p>
              ) : (
                <SalespersonRankChart
                  people={ranking.map((p) => ({
                    id: p.id,
                    name: p.name,
                    initials: p.initials,
                    value: p.yearlySales,
                    contributionPct: p.contributionPct,
                    rank: p.rank,
                  }))}
                />
              )}
            </ChartCard>
          </TabsPanel>

          <TabsPanel value="all" className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">
                All Salespeople
              </h2>
              <p className="mt-0.5 text-xs text-text-tertiary">
                Full performance data · click a column to sort
              </p>
            </div>
            {people === null ? (
              <Skeleton className="h-64 rounded-2xl" />
            ) : (
              <SalespersonRankingTable data={ranking} />
            )}
          </TabsPanel>
        </Tabs>
      </Reveal>
    </div>
  );
}
