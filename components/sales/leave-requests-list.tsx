"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChartCard } from "@/components/dashboard/chart-card";
import { cn } from "@/lib/utils";
import {
  LEAVE_TYPE_LABELS,
  otherLeaveThisMonth,
  coverageConflictsForRequest,
  type LeaveRequest,
  type LeaveStatus,
} from "@/lib/supabase/leave";
import type { TeamMember } from "@/lib/supabase/team";
import { LeaveRequestDetailsDialog } from "@/components/sales/leave-request-details-dialog";

const STATUS_STYLES: Record<LeaveStatus, string> = {
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-danger/10 text-danger",
};

const STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

type Filter = "pending" | "approved" | "rejected" | "all";

function formatRange(request: LeaveRequest) {
  const start = new Date(`${request.startDate}T00:00:00`);
  const end = new Date(`${request.endDate}T00:00:00`);
  if (request.startDate === request.endDate) return format(start, "MMM d, yyyy");
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

/** "Already took 2d Vacation, 1d Sick this month" — compact row-level summary; the popup shows the actual dates. */
function formatOtherLeave(entries: LeaveRequest[]) {
  if (entries.length === 0) return null;
  const totals = new Map<string, number>();
  for (const e of entries) totals.set(e.leaveType, (totals.get(e.leaveType) ?? 0) + e.days);
  const summary = Array.from(totals, ([type, days]) => `${days}d ${LEAVE_TYPE_LABELS[type as keyof typeof LEAVE_TYPE_LABELS]}`).join(", ");
  return `Already took ${summary} this month`;
}

/**
 * Admin sees every request visible to them (RLS already gives admins all
 * rows) and can approve/reject pending ones. A rep only ever has their own
 * rows for non-approved statuses (RLS), so this same component — unchanged
 * — naturally becomes "my requests" for a rep, with Cancel instead of
 * Approve/Reject. Every row opens the same details dialog rather than
 * acting inline, so the reviewer (or the requester looking back later) sees
 * the full context — reason, and once decided, who reviewed it and why.
 */
export function LeaveRequestsList({
  requests,
  members,
  isAdmin,
  currentUserId,
  onReview,
  onCancel,
}: {
  requests: LeaveRequest[];
  members: TeamMember[];
  isAdmin: boolean;
  currentUserId: string;
  onReview: (id: string, status: "approved" | "rejected", note?: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState<Filter>(isAdmin ? "pending" : "all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const scoped = isAdmin ? requests : requests.filter((r) => r.salespersonId === currentUserId);
  const filtered = useMemo(() => {
    const list = filter === "all" ? scoped : scoped.filter((r) => r.status === filter);
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [scoped, filter]);

  const pendingCount = scoped.filter((r) => r.status === "pending").length;
  const selected = requests.find((r) => r.id === selectedId) ?? null;

  return (
    <ChartCard
      title={isAdmin ? "Leave Requests" : "My Requests"}
      description={isAdmin ? "Click a request to review and decide" : "Your time-off history"}
      actions={
        <div className="flex shrink-0 gap-1">
          {(["pending", "approved", "rejected", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                filter === f
                  ? "bg-primary/10 text-primary"
                  : "text-text-tertiary hover:text-foreground"
              )}
            >
              {f}
              {f === "pending" && pendingCount > 0 ? ` (${pendingCount})` : ""}
            </button>
          ))}
        </div>
      }
    >
      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-tertiary">
          {filter === "pending" ? "No pending requests." : "Nothing here yet."}
        </p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((request) => {
            const person = memberById.get(request.salespersonId);
            const otherLeaveNote =
              isAdmin && request.status === "pending"
                ? formatOtherLeave(otherLeaveThisMonth(requests, request))
                : null;
            const hasCoverageConflict =
              request.status === "pending" &&
              coverageConflictsForRequest(requests, request).length > 0;

            return (
              <li key={request.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(request.id)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors",
                    hasCoverageConflict
                      ? "border-danger/30 bg-danger/10 hover:bg-danger/15"
                      : "border-glass-border/60 bg-foreground/[0.02] hover:bg-foreground/[0.05]"
                  )}
                >
                  <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                    {person?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={person.avatarUrl} alt="" className="size-full object-cover" />
                    ) : (
                      person?.initials ?? "?"
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {isAdmin ? person?.name ?? "Unknown" : LEAVE_TYPE_LABELS[request.leaveType]}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">
                      {isAdmin && `${LEAVE_TYPE_LABELS[request.leaveType]} · `}
                      {formatRange(request)} ·{" "}
                      <span className="text-sm font-semibold text-foreground">
                        {request.days}d
                      </span>
                    </p>
                    {hasCoverageConflict && (
                      <p className="truncate text-[11px] font-medium text-danger">
                        Coverage conflict — 2+ already out that day
                      </p>
                    )}
                    {otherLeaveNote && (
                      <p className="truncate text-[11px] text-warning">{otherLeaveNote}</p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      STATUS_STYLES[request.status]
                    )}
                  >
                    {STATUS_LABELS[request.status]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {selected && (
        <LeaveRequestDetailsDialog
          request={selected}
          person={memberById.get(selected.salespersonId)}
          reviewer={selected.reviewedBy ? memberById.get(selected.reviewedBy) : undefined}
          otherLeaveThisMonth={otherLeaveThisMonth(requests, selected)}
          coverageConflicts={coverageConflictsForRequest(requests, selected)}
          members={members}
          isAdmin={isAdmin}
          currentUserId={currentUserId}
          onClose={() => setSelectedId(null)}
          onApprove={(id) => onReview(id, "approved")}
          onReject={(id, note) => onReview(id, "rejected", note)}
          onCancel={onCancel}
        />
      )}
    </ChartCard>
  );
}
