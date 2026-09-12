"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Gauge,
  Table2,
  CalendarClock,
  Settings as SettingsIcon,
  Wallet,
  Handshake,
  CircleDollarSign,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { TeamHealthRadar } from "@/components/charts/team-health-radar";
import { RepComparisonRadar } from "@/components/charts/rep-comparison-radar";
import { SalespersonRankingTable } from "@/components/tables/salesperson-ranking-table";
import { NeedsFollowUp } from "@/components/sales/needs-follow-up";
import { TimeOffPanel } from "@/components/sales/time-off-panel";
import { WeeklyActivityCard } from "@/components/dashboard/weekly-activity-card";
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
  withTeamAggregates,
  computeTeamStats,
  computeRanking,
  type TeamMember,
} from "@/lib/supabase/team";
import { fetchAppointments, type Appointment } from "@/lib/supabase/appointments";
import { fetchDeals, type Deal } from "@/lib/supabase/deals";
import { fetchInvoices, type Invoice } from "@/lib/supabase/invoices";
import { fetchQuotations, type Quotation } from "@/lib/supabase/quotations";
import {
  fetchIndividualTargets,
  type CompanyTargets,
} from "@/lib/supabase/targets";
import { currentYear } from "@/lib/mock-data";
import { currentMonthNumber } from "@/lib/target-period";
import { formatUSD } from "@/lib/format";
import { monthlyCountWave, monthlySumWave } from "@/lib/kpi-wave";
import { TeamAccessSection } from "@/components/settings/team-access-section";
import { useAuth } from "@/components/providers/auth-provider";

const teamTabs = ["kpi", "all", "attendance", "settings"] as const;
type TeamTab = (typeof teamTabs)[number];

function resolveTeamTab(value: string | null, admin: boolean): TeamTab | null {
  if (!(teamTabs as readonly string[]).includes(value ?? "")) return null;
  if (value === "settings" && !admin) return null;
  return value as TeamTab;
}

export default function TeamPage() {
  const { isAdmin: admin } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[] | null>(null);
  const [individualTargets, setIndividualTargets] = useState<
    Record<string, CompanyTargets>
  >({});
  const [pipelineData, setPipelineData] = useState<{
    appointments: Appointment[];
    deals: Deal[];
    invoices: Invoice[];
    quotations: Quotation[];
  }>({ appointments: [], deals: [], invoices: [], quotations: [] });

  useEffect(() => {
    Promise.all([
      fetchTeamMembers(),
      fetchIndividualTargets(currentYear),
      fetchAppointments(),
      fetchDeals(),
      fetchInvoices(),
      fetchQuotations(),
    ])
      .then(([team, targets, appointments, deals, invoices, quotations]) => {
        setTeamMembers(team);
        setIndividualTargets(targets);
        setPipelineData({ appointments, deals, invoices, quotations });
      })
      .catch((err) => toast.error(err.message ?? "Couldn't load the team"));
  }, []);

  const searchParams = useSearchParams();
  const highlightedId = searchParams.get("person");
  const requestedTab = searchParams.get("tab");
  const [flashId, setFlashId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(
    resolveTeamTab(requestedTab, admin) ?? "kpi"
  );

  // Sync activeTab when a new ?tab= deep link arrives (React's documented
  // "adjust state during render" pattern). Keyed on admin too since it
  // resolves after mount — see the identical pattern in
  // app/(dashboard)/settings/page.tsx.
  const tabSyncKey = `${requestedTab}:${admin}`;
  const [prevTabSyncKey, setPrevTabSyncKey] = useState(tabSyncKey);
  if (tabSyncKey !== prevTabSyncKey) {
    setPrevTabSyncKey(tabSyncKey);
    const resolved = resolveTeamTab(requestedTab, admin);
    if (resolved) {
      setActiveTab(resolved);
    }
  }

  // Sync activeTab + flashId when a new ?person= deep link arrives (e.g. the
  // command palette's salesperson search) — takes priority over ?tab= since
  // a person link always means "show me that rep's row."
  const [prevHighlightedId, setPrevHighlightedId] = useState(highlightedId);
  if (highlightedId !== prevHighlightedId) {
    setPrevHighlightedId(highlightedId);
    if (highlightedId) {
      setActiveTab("all");
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

  // Real per-rep aggregates (lib/supabase/team.ts) plus the target values
  // those aggregates don't carry — targets live in a separate table/map,
  // same merge app/(dashboard)/targets/page.tsx does.
  const repsWithTargets = useMemo(() => {
    if (!teamMembers) return null;
    const reps = teamMembers.filter((m) => m.role === "sales_rep");
    const withAggregates = withTeamAggregates(
      reps,
      pipelineData,
      currentYear,
      currentMonthNumber
    );
    return withAggregates.map((member) => {
      const targets = individualTargets[member.id] ?? {
        yearlyTarget: 0,
        monthlyTargets: {},
      };
      return {
        ...member,
        monthlyTarget: targets.monthlyTargets[currentMonthNumber] ?? 0,
        yearlyTarget: targets.yearlyTarget,
      };
    });
  }, [teamMembers, pipelineData, individualTargets]);

  const stats = useMemo(
    () => computeTeamStats(repsWithTargets ?? []),
    [repsWithTargets]
  );
  const ranking = useMemo(
    () => computeRanking(repsWithTargets ?? []),
    [repsWithTargets]
  );

  const avgDealSize = stats.closedDealsTotal
    ? stats.monthlySalesTotal / stats.closedDealsTotal
    : 0;

  const dealStats = useMemo(() => {
    const deals = pipelineData.deals;
    const open = deals.filter((d) => d.status === "open").length;
    const won = deals.filter((d) => d.status === "won").length;
    const lost = deals.filter((d) => d.status === "lost").length;
    const winRate = won + lost ? Math.round((won / (won + lost)) * 100) : 0;
    return { open, won, lost, winRate };
  }, [pipelineData]);

  // How much of the team's remaining monthly gap is already covered by open
  // pipeline value — the "will we actually hit target" check, distinct from
  // "how much have we sold so far" (Team Sales above).
  const pipelineCoverage = useMemo(() => {
    const reps = repsWithTargets ?? [];
    const openPipeline = reps.reduce((sum, r) => sum + r.openPipelineValue, 0);
    const remaining = reps.reduce(
      (sum, r) => sum + Math.max(r.monthlyTarget - r.monthlySales, 0),
      0
    );
    const coveragePct = remaining ? (openPipeline / remaining) * 100 : 100;
    return { openPipeline, remaining, coveragePct };
  }, [repsWithTargets]);

  const teamKpiWaves = useMemo(() => {
    const wonDeals = pipelineData.deals.filter((d) => d.status === "won");
    const salesWave = monthlySumWave(
      pipelineData.invoices
        .filter((i) => i.status === "paid")
        .map((i) => ({ date: i.paidAt, amount: i.amount }))
    );
    const closedDealsWave = monthlyCountWave(
      wonDeals.map((d) => d.closedAt ?? d.createdAt)
    );
    const wonValueWave = monthlySumWave(
      wonDeals.map((d) => ({ date: d.closedAt ?? d.createdAt, amount: d.amount }))
    );
    const avgDealSizeWave = wonValueWave.map((sum, i) =>
      closedDealsWave[i] ? sum / closedDealsWave[i] : 0
    );
    return { salesWave, closedDealsWave, avgDealSizeWave };
  }, [pipelineData]);

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader title="Sales Team" />
      </Reveal>

      <Reveal delay={0.05}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTab value="kpi">
              <Gauge className="size-[15px]" />
              KPI
            </TabsTab>
            <TabsTab value="all">
              <Table2 className="size-[15px]" />
              All Salespeople
            </TabsTab>
            <TabsTab value="attendance">
              <CalendarClock className="size-[15px]" />
              Attendance
            </TabsTab>
            {admin && (
              <TabsTab value="settings">
                <SettingsIcon className="size-[15px]" />
                Settings
              </TabsTab>
            )}
            <TabsIndicator />
          </TabsList>

          <TabsPanel value="kpi" className="space-y-6">
            <p className="text-sm text-text-tertiary">
              Team-wide performance this month
            </p>

            {teamMembers === null ? (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-[132px] w-full rounded-2xl" />
                  ))}
                </div>
                <Skeleton className="h-80 w-full rounded-2xl" />
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                  <Skeleton className="h-72 w-full rounded-2xl" />
                  <Skeleton className="h-72 w-full rounded-2xl" />
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
                  <Skeleton className="h-72 w-full rounded-2xl" />
                  <Skeleton className="h-72 w-full rounded-2xl" />
                  <Skeleton className="h-72 w-full rounded-2xl" />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
                  <MetricCard
                    label="Team Sales"
                    value={formatUSD(stats.monthlySalesTotal)}
                    footnote={`This month · of ${formatUSD(stats.monthlyTargetTotal)} target`}
                    wave={teamKpiWaves.salesWave}
                    icon={Wallet}
                    tone="primary"
                  />
                  <MetricCard
                    label="Closed Deals"
                    value={String(stats.closedDealsTotal)}
                    footnote="This month, across the team"
                    wave={teamKpiWaves.closedDealsWave}
                    icon={Handshake}
                    tone="success"
                  />
                  <MetricCard
                    label="Avg. Deal Size"
                    value={formatUSD(avgDealSize)}
                    footnote="This month, per deal"
                    wave={teamKpiWaves.avgDealSizeWave}
                    icon={CircleDollarSign}
                    tone="cyan"
                  />
                  <MetricCard
                    label="Pipeline Coverage"
                    value={formatUSD(pipelineCoverage.openPipeline)}
                    footnote={
                      pipelineCoverage.remaining
                        ? `Open pipeline · ${formatUSD(pipelineCoverage.remaining)} left to close`
                        : "Open pipeline · monthly target already met"
                    }
                    icon={TrendingUp}
                    tone={pipelineCoverage.coveragePct >= 100 ? "success" : "warning"}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
                  <ChartCard
                    title="Top Contributors"
                    description="Top 3 reps compared across sales, deals, conversion, and avg. deal — each axis relative to the leader"
                  >
                    {ranking.length === 0 ? (
                      <p className="py-6 text-center text-sm text-text-tertiary">
                        Rankings will appear once your team is added.
                      </p>
                    ) : (
                      <RepComparisonRadar reps={ranking} />
                    )}
                  </ChartCard>
                  <ChartCard
                    title="Team Health"
                    description="Target achievement, win rate, and average conversion"
                  >
                    <TeamHealthRadar
                      data={[
                        { axis: "Target", value: Math.round(Math.min(stats.monthlyProgressPct, 100)) },
                        { axis: "Win Rate", value: dealStats.winRate },
                        { axis: "Conversion", value: Math.round(stats.avgConversionRate) },
                      ]}
                    />
                  </ChartCard>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
                  <ChartCard
                    title="Deals by Status"
                    description="Every deal currently in the pipeline"
                  >
                    <DonutChart
                      segments={[
                        { id: "open", label: "Open", value: dealStats.open, colorVar: "var(--chart-2)" },
                        { id: "won", label: "Won", value: dealStats.won, colorVar: "var(--success)" },
                        { id: "lost", label: "Lost", value: dealStats.lost, colorVar: "var(--danger)" },
                      ]}
                      centerValue={String(dealStats.won)}
                      centerLabel="won"
                    />
                  </ChartCard>
                  <NeedsFollowUp />
                  <WeeklyActivityCard />
                </div>
              </>
            )}
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
            {teamMembers === null ? (
              <Skeleton className="h-64 rounded-2xl" />
            ) : (
              <SalespersonRankingTable data={ranking} highlightedId={flashId} />
            )}
          </TabsPanel>

          <TabsPanel value="attendance">
            <TimeOffPanel />
          </TabsPanel>

          {admin && (
            <TabsPanel value="settings">
              <TeamAccessSection />
            </TabsPanel>
          )}
        </Tabs>
      </Reveal>
    </div>
  );
}
