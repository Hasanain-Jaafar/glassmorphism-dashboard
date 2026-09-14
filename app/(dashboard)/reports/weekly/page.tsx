"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { RadialTarget } from "@/components/dashboard/target-card";
import { DailySalesChart } from "@/components/charts/daily-sales-chart";
import { SalespersonRankChart } from "@/components/charts/salesperson-chart";
import { PipelineSummary } from "@/components/sales/pipeline-summary";
import { Reveal } from "@/components/motion/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/components/providers/auth-provider";
import { fetchTeamMembers, type TeamMember } from "@/lib/supabase/team";
import { fetchAppointments, type Appointment } from "@/lib/supabase/appointments";
import { fetchQuotations, type Quotation } from "@/lib/supabase/quotations";
import { fetchDeals, type Deal } from "@/lib/supabase/deals";
import { fetchInvoices, type Invoice } from "@/lib/supabase/invoices";
import { fetchCompanyTargets } from "@/lib/supabase/targets";
import {
  computeWeeklyReport,
  parseWeekParam,
  recentWeekOptions,
  weekParamFor,
  weekRangeFromStart,
  weekRangeLabel,
  type WeeklyReportData,
} from "@/lib/weekly-report";
import { formatUSD, formatNumber } from "@/lib/format";

type RawData = {
  teamMembers: TeamMember[];
  appointments: Appointment[];
  quotations: Quotation[];
  deals: Deal[];
  invoices: Invoice[];
};

export default function WeeklyReportPage() {
  return (
    <Suspense>
      <WeeklyReportPageContent />
    </Suspense>
  );
}

function WeeklyReportPageContent() {
  const { isAdmin } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const weekStart = useMemo(
    () => parseWeekParam(searchParams.get("week")),
    [searchParams]
  );
  const weekOptions = useMemo(() => recentWeekOptions(12), []);

  const [raw, setRaw] = useState<RawData | null>(null);
  const [monthlyTarget, setMonthlyTarget] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([
      fetchTeamMembers(),
      fetchAppointments(),
      fetchQuotations(),
      fetchDeals(),
      fetchInvoices(),
    ])
      .then(([teamMembers, appointments, quotations, deals, invoices]) =>
        setRaw({ teamMembers, appointments, quotations, deals, invoices })
      )
      .catch((err) => toast.error(err.message ?? "Couldn't load the weekly summary"));
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    // The company target for the month most of this week falls in (its
    // Friday) — an approximation when a week spans two months, but good
    // enough for a "pace toward target" indicator.
    const friday = new Date(weekStart);
    friday.setDate(weekStart.getDate() + 6);
    fetchCompanyTargets(friday.getFullYear())
      .then((targets) => setMonthlyTarget(targets.monthlyTargets[friday.getMonth() + 1] ?? 0))
      .catch((err) => toast.error(err.message ?? "Couldn't load targets"));
  }, [isAdmin, weekStart]);

  const report: WeeklyReportData | null = useMemo(() => {
    if (!raw || monthlyTarget === null) return null;
    return computeWeeklyReport(weekRangeFromStart(weekStart), raw, monthlyTarget);
  }, [raw, monthlyTarget, weekStart]);

  function handleWeekChange(value: string) {
    router.replace(`/reports/weekly?week=${value}`, { scroll: false });
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Reveal>
          <PageHeader title="Weekly Performance Summary" />
        </Reveal>
        <Reveal delay={0.05}>
          <div className="glass-panel flex flex-col items-center rounded-2xl p-10 text-center">
            <Lock className="size-6 text-text-tertiary" />
            <p className="mt-3 text-sm font-medium text-foreground">Admins only</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-text-tertiary">
              The weekly performance summary isn&apos;t available to sales
              representatives.
            </p>
          </div>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader
          title="Weekly Performance Summary"
          description={weekRangeLabel(weekStart)}
          actions={
            <Select
              value={weekParamFor(weekStart)}
              onValueChange={(value) => value && handleWeekChange(value)}
            >
              <SelectTrigger className="glass-panel filter-control h-8 gap-1.5 px-2.5 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                {weekOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />
      </Reveal>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
        <Reveal delay={0.05}>
          {report ? (
            <MetricCard
              label="Total Sales"
              value={formatUSD(report.totalSales)}
              delta={{ value: report.salesDeltaPct, label: "vs prior week" }}
              wave={report.dailySales.map((d) => d.amount)}
            />
          ) : (
            <Skeleton className="h-[132px] w-full rounded-2xl" />
          )}
        </Reveal>
        <Reveal delay={0.08}>
          {report ? (
            <MetricCard
              label="Deals Closed"
              value={formatNumber(report.dealsClosed)}
              footnote="Won this week"
            />
          ) : (
            <Skeleton className="h-[132px] w-full rounded-2xl" />
          )}
        </Reveal>
        <Reveal delay={0.11}>
          {report ? (
            <MetricCard
              label="Appointments Booked"
              value={formatNumber(report.appointmentsBooked)}
              footnote="Scheduled this week"
            />
          ) : (
            <Skeleton className="h-[132px] w-full rounded-2xl" />
          )}
        </Reveal>
        <Reveal delay={0.14}>
          {report ? (
            <MetricCard
              label="Quotations Sent"
              value={formatNumber(report.quotationsSent)}
              footnote="Created this week"
            />
          ) : (
            <Skeleton className="h-[132px] w-full rounded-2xl" />
          )}
        </Reveal>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
        <Reveal delay={0.18} className="lg:col-span-2">
          <ChartCard title="Daily Sales" description="Paid sales, Saturday through Friday">
            {report ? (
              <DailySalesChart data={report.dailySales} />
            ) : (
              <Skeleton className="h-[220px] w-full rounded-xl sm:h-[250px]" />
            )}
          </ChartCard>
        </Reveal>
        <Reveal delay={0.22}>
          {report ? (
            <RadialTarget
              label="Monthly Target Pace"
              current={report.totalSales}
              target={report.monthlyTarget}
              progressPct={report.weekContributionPct}
            />
          ) : (
            <Skeleton className="h-64 w-full rounded-2xl" />
          )}
        </Reveal>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <Reveal delay={0.26}>
          <ChartCard title="Salesperson Performance" description="Contribution to this week's sales">
            {report ? (
              <SalespersonRankChart people={report.ranking} />
            ) : (
              <Skeleton className="h-72 w-full rounded-2xl" />
            )}
          </ChartCard>
        </Reveal>
        <Reveal delay={0.3}>
          {report ? (
            <PipelineSummary
              stages={report.pipelineStages}
              conversions={report.pipelineConversions}
              description="This week's funnel"
            />
          ) : (
            <Skeleton className="h-72 w-full rounded-2xl" />
          )}
        </Reveal>
      </div>
    </div>
  );
}
