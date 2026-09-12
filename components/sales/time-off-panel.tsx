"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Users, Clock3, Umbrella, CalendarCheck } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { fetchTeamMembers, type TeamMember } from "@/lib/supabase/team";
import {
  fetchLeaveRequests,
  fetchLeaveEntitlements,
  createLeaveRequest,
  reviewLeaveRequest,
  cancelLeaveRequest,
  saveLeaveEntitlement,
  summarizeLeaveUsage,
  leaveOnDate,
  subscribeToLeaveRequests,
  DEFAULT_VACATION_DAYS,
  type LeaveRequest,
} from "@/lib/supabase/leave";
import { currentYear } from "@/lib/mock-data";
import { monthlyCountWave, monthlySumWave } from "@/lib/kpi-wave";
import { LeaveCalendar } from "@/components/sales/leave-calendar";
import { LeaveRequestsList } from "@/components/sales/leave-requests-list";
import { LeaveBalancesTable } from "@/components/sales/leave-balances-table";
import { RequestLeaveDialog, type RequestLeaveValues } from "@/components/sales/request-leave-dialog";

export function TimeOffPanel() {
  const { isAdmin, profile } = useAuth();
  const currentUserId = profile?.id ?? "";

  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [requests, setRequests] = useState<LeaveRequest[] | null>(null);
  const [entitlements, setEntitlements] = useState<Record<string, number>>({});

  const loadAll = useCallback(() => {
    return Promise.all([
      fetchTeamMembers(),
      fetchLeaveRequests(currentYear),
      fetchLeaveEntitlements(currentYear),
    ]).then(([m, r, e]) => {
      setMembers(m);
      setRequests(r);
      setEntitlements(e);
    });
  }, []);

  useEffect(() => {
    loadAll().catch((err) => toast.error(err.message ?? "Couldn't load time off"));
  }, [loadAll]);

  const refetchRequests = useCallback(() => {
    return fetchLeaveRequests(currentYear).then(setRequests);
  }, []);

  // Live sync: a rep's own request flipping to approved/rejected, or an
  // admin seeing a brand-new submission, shows up without a manual refresh.
  useEffect(() => {
    return subscribeToLeaveRequests(() => {
      refetchRequests().catch(() => {});
    });
  }, [refetchRequests]);

  const refetchEntitlements = useCallback(() => {
    return fetchLeaveEntitlements(currentYear).then(setEntitlements);
  }, []);

  const stats = useMemo(() => {
    if (!requests) return null;
    const outToday = leaveOnDate(requests, new Date()).length;
    const pending = requests.filter((r) => r.status === "pending").length;

    const now = new Date();
    const monthStartIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const monthEndIso = `${monthEnd.getFullYear()}-${String(monthEnd.getMonth() + 1).padStart(2, "0")}-${String(monthEnd.getDate()).padStart(2, "0")}`;
    const daysThisMonth = requests
      .filter((r) => r.status === "approved" && r.startDate <= monthEndIso && r.endDate >= monthStartIso)
      .reduce((sum, r) => sum + r.days, 0);

    return { outToday, pending, daysThisMonth };
  }, [requests]);

  // Decorative trailing-month waves (see lib/kpi-wave.ts) for the stat tiles
  // — 6 months, not the default 12, since fetchLeaveRequests only ever holds
  // the current year, and 12 trailing months would render mostly-zero bars
  // for whichever prior-year months fall outside that window.
  const waves = useMemo(() => {
    const requestList = requests ?? [];
    const approved = requestList.filter((r) => r.status === "approved");
    const myApprovedVacation = approved.filter(
      (r) => r.salespersonId === currentUserId && r.leaveType === "vacation"
    );
    return {
      outTodayWave: monthlyCountWave(approved.map((r) => r.startDate), 6),
      pendingWave: monthlyCountWave(requestList.map((r) => r.createdAt), 6),
      daysThisMonthWave: monthlySumWave(
        approved.map((r) => ({ date: r.startDate, amount: r.days })),
        6
      ),
      vacationRemainingWave: monthlySumWave(
        myApprovedVacation.map((r) => ({ date: r.startDate, amount: r.days })),
        6
      ),
    };
  }, [requests, currentUserId]);

  const myUsage = useMemo(
    () => summarizeLeaveUsage(requests ?? [], currentUserId, currentYear),
    [requests, currentUserId]
  );
  const myEntitled = entitlements[currentUserId] ?? DEFAULT_VACATION_DAYS;

  const usageByMember = useMemo(() => {
    if (!members) return {};
    const result: Record<string, ReturnType<typeof summarizeLeaveUsage>> = {};
    for (const member of members) {
      result[member.id] = summarizeLeaveUsage(requests ?? [], member.id, currentYear);
    }
    return result;
  }, [members, requests]);

  async function handleCreate(values: RequestLeaveValues) {
    await createLeaveRequest(values);
    await refetchRequests();
  }

  async function handleReview(id: string, status: "approved" | "rejected", note?: string) {
    try {
      await reviewLeaveRequest(id, status, note);
      toast.success(status === "approved" ? "Request approved" : "Request rejected");
      await refetchRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update that request");
      throw err;
    }
  }

  async function handleCancel(id: string) {
    try {
      await cancelLeaveRequest(id);
      toast.success("Request cancelled");
      await refetchRequests();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't cancel that request");
      throw err;
    }
  }

  async function handleSaveEntitlement(salespersonId: string, vacationDays: number) {
    await saveLeaveEntitlement(salespersonId, currentYear, vacationDays);
    toast.success("Entitlement updated");
    await refetchEntitlements();
  }

  if (members === null || requests === null || !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[132px] w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  const vacationRemaining = Math.max(myEntitled - myUsage.vacation, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        <MetricCard
          label="Out Today"
          value={String(stats.outToday)}
          footnote="Across the whole team"
          wave={waves.outTodayWave}
          icon={Users}
          tone="neutral"
        />
        <MetricCard
          label={isAdmin ? "Pending Requests" : "My Pending Requests"}
          value={String(stats.pending)}
          footnote={stats.pending > 0 ? "Awaiting a decision" : "All caught up"}
          wave={waves.pendingWave}
          icon={Clock3}
          tone={stats.pending > 0 ? "warning" : "neutral"}
        />
        <MetricCard
          label="Leave Days This Month"
          value={String(stats.daysThisMonth)}
          footnote="Approved, across the team"
          wave={waves.daysThisMonthWave}
          icon={Umbrella}
          tone="cyan"
        />
        <MetricCard
          label="My Vacation Remaining"
          value={`${vacationRemaining}d`}
          footnote={`${myUsage.vacation} of ${myEntitled} days used this year`}
          wave={waves.vacationRemainingWave}
          icon={CalendarCheck}
          tone="primary"
        />
      </div>

      <ChartCard
        title="Team Calendar"
        description="Who's confirmed out, by day — click a day for details"
        actions={
          <RequestLeaveDialog
            teamMembers={members}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onSubmit={handleCreate}
          />
        }
      >
        <LeaveCalendar requests={requests} members={members} />
      </ChartCard>

      <LeaveRequestsList
        requests={requests}
        members={members}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        onReview={handleReview}
        onCancel={handleCancel}
      />

      {isAdmin && (
        <LeaveBalancesTable
          members={members}
          entitlements={entitlements}
          usageByMember={usageByMember}
          onSaveEntitlement={handleSaveEntitlement}
        />
      )}
    </div>
  );
}
