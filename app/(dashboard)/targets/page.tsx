"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { RadialTarget, MonthlyTargetCard } from "@/components/dashboard/target-card";
import { EditTargetDialog } from "@/components/sales/edit-target-dialog";
import { IndividualTargetCard } from "@/components/sales/individual-target-card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  company,
  companyMonthlyTotal,
  companyYearlyTotal,
  currentYear,
  rankingMonths,
  rankingYears,
  revenueSeries,
  salespeople as initialSalespeople,
  type Salesperson,
} from "@/lib/mock-data";
import {
  fetchCompanyTargets,
  saveCompanyTargets,
  MONTH_NUMBERS,
  type CompanyTargets,
} from "@/lib/supabase/targets";
import { useAuth } from "@/components/providers/auth-provider";

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
    monthlyTarget: company.monthlyTarget,
    yearlyTarget: company.yearTarget,
  });
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [people, setPeople] = useState<Salesperson[]>(initialSalespeople);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    rankingMonths[rankingMonths.length - 1]
  );

  useEffect(() => {
    // Only shows the loading skeleton on first mount; a year/month change
    // just quietly swaps the values in once the refetch resolves.
    const monthNumber = MONTH_NUMBERS[selectedMonth] ?? 1;
    fetchCompanyTargets(selectedYear, monthNumber)
      .then(setCompanyTargets)
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setTargetsLoading(false));
  }, [selectedYear, selectedMonth]);

  async function handleSaveCompanyTargets(values: CompanyTargets) {
    const monthNumber = MONTH_NUMBERS[selectedMonth] ?? 1;
    try {
      await saveCompanyTargets(selectedYear, monthNumber, values);
      setCompanyTargets(values);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't save targets"
      );
      throw error;
    }
  }

  const yearlyActual = companyYearlyTotal(selectedYear);
  const monthlyActual = companyMonthlyTotal(selectedMonth);

  const yearProgressPct = (yearlyActual / companyTargets.yearlyTarget) * 100;
  const monthlyProgressPct =
    (monthlyActual / companyTargets.monthlyTarget) * 100;
  const monthlyRemaining = Math.max(
    companyTargets.monthlyTarget - monthlyActual,
    0
  );

  function updatePersonTarget(
    id: string,
    values: { monthlyTarget: number; yearlyTarget: number }
  ) {
    setPeople((prev) =>
      prev.map((person) =>
        person.id === id ? { ...person, ...values } : person
      )
    );
  }

  if (!admin) {
    // The sales pipeline data below is still mock-data (not yet migrated to
    // Supabase), so bridge the real signed-in profile to a mock salesperson
    // by email; falls back to the first rep if there's no match.
    const mine =
      people.find((person) => person.email === profile?.email) ?? people[0];

    return (
      <div className="space-y-6">
        <Reveal>
          <PageHeader
            title="My Targets"
            description={`Monthly and yearly goals for ${mine.name}`}
          />
        </Reveal>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <Reveal delay={0.05}>
            <RadialTarget
              label="Yearly Target"
              current={mine.yearlySales}
              target={mine.yearlyTarget}
              progressPct={(mine.yearlySales / mine.yearlyTarget) * 100}
            />
          </Reveal>
          <Reveal delay={0.1}>
            <MonthlyTargetCard
              label="Monthly Target"
              monthLabel={company.currentMonthLabel}
              current={mine.monthlySales}
              target={mine.monthlyTarget}
              remaining={Math.max(mine.monthlyTarget - mine.monthlySales, 0)}
              progressPct={(mine.monthlySales / mine.monthlyTarget) * 100}
            />
          </Reveal>
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
          description="Company and individual sales goals"
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
                Company-wide revenue goals, by year and by month
              </p>
              <EditTargetDialog
                title="Edit Company Targets"
                description="Update the company's revenue goals for the current year and month."
                monthlyTarget={companyTargets.monthlyTarget}
                yearlyTarget={companyTargets.yearlyTarget}
                onSave={handleSaveCompanyTargets}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
              {targetsLoading && (
                <>
                  <Skeleton className="h-48 w-full rounded-2xl" />
                  <Skeleton className="h-48 w-full rounded-2xl" />
                </>
              )}
              {!targetsLoading && (
                <>
                  <RadialTarget
                    label="Year Target"
                    current={yearlyActual}
                    target={companyTargets.yearlyTarget}
                    progressPct={yearProgressPct}
                    bars={revenueSeries.map((point) => point.current)}
                    action={
                      <Select
                        value={String(selectedYear)}
                        onValueChange={(value) =>
                          value && setSelectedYear(Number(value))
                        }
                      >
                        <SelectTrigger className="glass-panel h-8 gap-1.5 rounded-lg px-2.5 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                          {rankingYears.map((year) => (
                            <SelectItem key={year} value={String(year)}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    }
                  />
                  <MonthlyTargetCard
                    label="Monthly Target"
                    monthLabel={selectedMonth}
                    current={monthlyActual}
                    target={companyTargets.monthlyTarget}
                    remaining={monthlyRemaining}
                    progressPct={monthlyProgressPct}
                    wave={revenueSeries.map((point) => point.current)}
                    action={
                      <Select
                        value={selectedMonth}
                        onValueChange={(value) =>
                          value && setSelectedMonth(value)
                        }
                      >
                        <SelectTrigger className="glass-panel h-8 gap-1.5 rounded-lg px-2.5 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent align="end">
                          {rankingMonths.map((month) => (
                            <SelectItem key={month} value={month}>
                              {month}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    }
                  />
                </>
              )}
            </div>
          </TabsPanel>

          <TabsPanel value="individual" className="space-y-6">
            <p className="text-sm text-text-tertiary">
              Monthly and yearly targets for every sales representative
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3">
              {people.map((person) => (
                <IndividualTargetCard
                  key={person.id}
                  person={person}
                  canEdit
                  onSave={(values) => updatePersonTarget(person.id, values)}
                />
              ))}
            </div>
          </TabsPanel>
        </Tabs>
      </Reveal>
    </div>
  );
}
