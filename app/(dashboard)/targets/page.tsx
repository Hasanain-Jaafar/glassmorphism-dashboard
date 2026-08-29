"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, Copy, UserCog } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { ChartCard } from "@/components/dashboard/chart-card";
import { RadialTarget, MonthlyTargetCard } from "@/components/dashboard/target-card";
import { TargetTrendChart } from "@/components/charts/target-trend-chart";
import { EditTargetDialog } from "@/components/sales/edit-target-dialog";
import { TargetPeriodSelector } from "@/components/sales/target-period-selector";
import { TargetAllocation } from "@/components/sales/target-allocation";
import { SalespersonTargetTable } from "@/components/tables/salesperson-target-table";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
  TabsTab,
} from "@/components/ui/tabs";
import { company, companyMonthlyTotal, currentYear, revenueSeries } from "@/lib/mock-data";
import { trendFor } from "@/lib/sales-analytics";
import {
  currentMonthLabel,
  currentMonthNumber,
  defaultSelectionFor,
  type TargetPeriodSelection,
  type TargetPerson,
} from "@/lib/target-period";
import {
  fetchCompanyTargets,
  fetchIndividualTargets,
  saveCompanyTargets,
  saveIndividualTarget,
  type CompanyTargets,
} from "@/lib/supabase/targets";
import { fetchTeamMembers, type TeamMember } from "@/lib/supabase/team";
import { useAuth } from "@/components/providers/auth-provider";

const currentMonth = currentMonthLabel;

function mergeTargetPeople(
  team: TeamMember[],
  targets: Record<string, CompanyTargets>
): TargetPerson[] {
  return team
    .filter((member) => member.role === "sales_rep")
    .map((member) => {
      const personTargets = targets[member.id] ?? {
        yearlyTarget: 0,
        monthlyTargets: {},
      };
      return {
        id: member.id,
        name: member.name,
        role: "Sales Representative",
        initials: member.initials,
        monthlySales: member.monthlySales,
        monthlyTarget: personTargets.monthlyTargets[currentMonthNumber] ?? 0,
        yearlySales: member.yearlySales,
        yearlyTarget: personTargets.yearlyTarget,
        monthlyTargets: personTargets.monthlyTargets,
      };
    });
}

export default function TargetsPage() {
  const { isAdmin: admin, profile } = useAuth();

  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(
    requestedTab === "individual" ? "individual" : "company"
  );

  // Sync activeTab to a newly-arrived ?tab= param without letting it stomp
  // on a manual tab click later (React's documented "adjust state during
  // render" pattern — see https://react.dev/learn/you-might-not-need-an-effect).
  const [prevRequestedTab, setPrevRequestedTab] = useState(requestedTab);
  if (requestedTab !== prevRequestedTab) {
    setPrevRequestedTab(requestedTab);
    if (requestedTab === "individual" || requestedTab === "company") {
      setActiveTab(requestedTab);
    }
  }

  const [companyTargets, setCompanyTargets] = useState<CompanyTargets>({
    yearlyTarget: 0,
    monthlyTargets: {},
  });
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[] | null>(null);
  const [individualTargets, setIndividualTargets] = useState<
    Record<string, CompanyTargets>
  >({});
  const [selection, setSelection] = useState<TargetPeriodSelection>(
    defaultSelectionFor("month")
  );

  const people = useMemo(
    () => mergeTargetPeople(teamMembers ?? [], individualTargets),
    [teamMembers, individualTargets]
  );

  useEffect(() => {
    fetchCompanyTargets(currentYear)
      .then(setCompanyTargets)
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setTargetsLoading(false));

    Promise.all([fetchTeamMembers(), fetchIndividualTargets(currentYear)])
      .then(([team, targets]) => {
        setTeamMembers(team);
        setIndividualTargets(targets);
      })
      .catch((error: Error) =>
        toast.error(error.message ?? "Couldn't load the team")
      );
  }, []);

  async function handleSaveCompanyTargets(values: {
    yearlyTarget: number;
    monthlyTarget: number;
  }) {
    try {
      await saveCompanyTargets(currentYear, currentMonthNumber, values);
      setCompanyTargets((prev) => ({
        yearlyTarget: values.yearlyTarget,
        monthlyTargets: {
          ...prev.monthlyTargets,
          [currentMonthNumber]: values.monthlyTarget,
        },
      }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't save targets"
      );
      throw error;
    }
  }

  async function handleCopyPreviousPeriod() {
    try {
      const prevMonthNumber = currentMonthNumber === 1 ? 12 : currentMonthNumber - 1;
      const prevMonthYear = currentMonthNumber === 1 ? currentYear - 1 : currentYear;
      const prevYearTargets = await fetchCompanyTargets(currentYear - 1);
      const prevMonthSource =
        prevMonthYear === currentYear ? companyTargets : prevYearTargets;

      const nextValues = {
        yearlyTarget: prevYearTargets.yearlyTarget,
        monthlyTarget: prevMonthSource.monthlyTargets[prevMonthNumber] ?? 0,
      };
      await saveCompanyTargets(currentYear, currentMonthNumber, nextValues);
      setCompanyTargets((prev) => ({
        yearlyTarget: nextValues.yearlyTarget,
        monthlyTargets: {
          ...prev.monthlyTargets,
          [currentMonthNumber]: nextValues.monthlyTarget,
        },
      }));
      toast.success("Copied last period's targets");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't copy previous targets"
      );
    }
  }

  const yearlyActual = company.currentYearTotal;
  const monthlyActual = companyMonthlyTotal(currentMonth);
  const monthlyTarget = companyTargets.monthlyTargets[currentMonthNumber] ?? 0;

  const yearProgressPct = companyTargets.yearlyTarget
    ? (yearlyActual / companyTargets.yearlyTarget) * 100
    : 0;
  const monthlyProgressPct = monthlyTarget ? (monthlyActual / monthlyTarget) * 100 : 0;
  const monthlyRemaining = Math.max(monthlyTarget - monthlyActual, 0);

  const updatePersonTarget = useCallback(
    async (id: string, values: { monthlyTarget: number; yearlyTarget: number }) => {
      try {
        await saveIndividualTarget(id, currentYear, currentMonthNumber, values);
        setIndividualTargets((prev) => ({
          ...prev,
          [id]: {
            yearlyTarget: values.yearlyTarget,
            monthlyTargets: {
              ...(prev[id]?.monthlyTargets ?? {}),
              [currentMonthNumber]: values.monthlyTarget,
            },
          },
        }));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Couldn't save target"
        );
        throw error;
      }
    },
    []
  );

  if (!admin) {
    const mine = teamMembers
      ? people.find((person) => person.id === profile?.id)
      : undefined;

    if (teamMembers && !mine) {
      return (
        <div className="space-y-6">
          <Reveal>
            <PageHeader title="My Targets" />
          </Reveal>
          <Reveal delay={0.05}>
            <p className="text-sm text-text-tertiary">
              No targets have been assigned to you yet. Contact your
              administrator.
            </p>
          </Reveal>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Reveal>
          <PageHeader
            title="My Targets"
            description={
              mine ? `Monthly and yearly goals for ${mine.name}` : undefined
            }
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          {!mine ? (
            <>
              <Skeleton className="h-48 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </>
          ) : (
            <>
              <Reveal delay={0.05}>
                <RadialTarget
                  label="Yearly Target"
                  current={mine.yearlySales}
                  target={mine.yearlyTarget}
                  progressPct={
                    mine.yearlyTarget
                      ? (mine.yearlySales / mine.yearlyTarget) * 100
                      : 0
                  }
                />
              </Reveal>
              <Reveal delay={0.1}>
                <MonthlyTargetCard
                  label="Monthly Target"
                  monthLabel={company.currentMonthLabel}
                  current={mine.monthlySales}
                  target={mine.monthlyTarget}
                  remaining={Math.max(mine.monthlyTarget - mine.monthlySales, 0)}
                  progressPct={
                    mine.monthlyTarget
                      ? (mine.monthlySales / mine.monthlyTarget) * 100
                      : 0
                  }
                />
              </Reveal>
            </>
          )}
        </div>

        <Reveal delay={0.15}>
          <p className="text-xs text-text-tertiary">
            Targets are managed by your administrator. Contact them to
            request a change.
          </p>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader
          title="Targets"
          description="What we're expected to sell, who owns it, and whether we're on track"
        />
      </Reveal>

      <Reveal delay={0.05}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTab value="company">
              <Building2 className="size-[15px]" />
              Company
            </TabsTab>
            <TabsTab value="individual">
              <UserCog className="size-[15px]" />
              Individual
            </TabsTab>
            <TabsIndicator />
          </TabsList>

          <TabsPanel value="company" className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-text-tertiary">
                Total annual target and where we stand this month
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyPreviousPeriod}
                  disabled={targetsLoading}
                >
                  <Copy className="size-3.5" />
                  Copy Previous Period
                </Button>
                <EditTargetDialog
                  title="Edit Company Targets"
                  description="Update the company's revenue goals for the current year and month."
                  monthlyTarget={monthlyTarget}
                  yearlyTarget={companyTargets.yearlyTarget}
                  onSave={handleSaveCompanyTargets}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
              {targetsLoading ? (
                <>
                  <Skeleton className="h-48 w-full rounded-2xl" />
                  <Skeleton className="h-48 w-full rounded-2xl" />
                </>
              ) : (
                <>
                  <RadialTarget
                    label="Total Annual Target"
                    current={yearlyActual}
                    target={companyTargets.yearlyTarget}
                    progressPct={yearProgressPct}
                    bars={revenueSeries.map((point) => point.current)}
                  />
                  <MonthlyTargetCard
                    label="Current Month Target"
                    monthLabel={currentMonth}
                    current={monthlyActual}
                    target={monthlyTarget}
                    remaining={monthlyRemaining}
                    progressPct={monthlyProgressPct}
                    wave={revenueSeries.map((point) => point.current)}
                  />
                </>
              )}
            </div>

            <ChartCard
              title="Target Trend"
              description="Monthly target vs. actual, company-level"
            >
              <TargetTrendChart data={trendFor("all")} />
            </ChartCard>
          </TabsPanel>

          <TabsPanel value="individual" className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-text-tertiary">
                Who owns how much of the target, and who&apos;s on track
              </p>
              <TargetPeriodSelector selection={selection} onChange={setSelection} />
            </div>

            {teamMembers === null ? (
              <>
                <Skeleton className="h-64 w-full rounded-2xl" />
                <Skeleton className="h-72 w-full rounded-2xl" />
              </>
            ) : people.length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 text-center">
                <p className="text-sm font-medium text-foreground">
                  No sales representatives yet
                </p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-text-tertiary">
                  Add your first team member from Settings → Team & Access to
                  assign them a target.
                </p>
              </div>
            ) : (
              <>
                <TargetAllocation people={people} selection={selection} />

                <SalespersonTargetTable
                  people={people}
                  selection={selection}
                  onSave={updatePersonTarget}
                />
              </>
            )}
          </TabsPanel>
        </Tabs>
      </Reveal>
    </div>
  );
}
