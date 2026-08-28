"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Table2, Trophy, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ChartCard } from "@/components/dashboard/chart-card";
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
import { formatUSD, formatPercent } from "@/lib/format";

export default function TeamPage() {
  const [people, setPeople] = useState<TeamMember[] | null>(null);

  useEffect(() => {
    fetchTeamMembers()
      .then(setPeople)
      .catch((err) => toast.error(err.message ?? "Couldn't load the team"));
  }, []);

  const searchParams = useSearchParams();
  const highlightedId = searchParams.get("person");
  const [flashId, setFlashId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("team");

  // Sync activeTab + flashId when a new ?person= deep link arrives (React's
  // documented "adjust state during render" pattern).
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

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader title="Sales Team" />
      </Reveal>

      <Reveal delay={0.05}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
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
