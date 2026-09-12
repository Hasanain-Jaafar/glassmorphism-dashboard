"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Check, X, XCircle } from "lucide-react";
import { ChartCard } from "@/components/dashboard/chart-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LEAVE_TYPE_LABELS,
  type LeaveRequest,
  type LeaveStatus,
} from "@/lib/supabase/leave";
import type { TeamMember } from "@/lib/supabase/team";

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

/**
 * Admin sees every request visible to them (RLS already gives admins all
 * rows) and can approve/reject pending ones. A rep only ever has their own
 * rows for non-approved statuses (RLS), so this same component — unchanged
 * — naturally becomes "my requests" for a rep, with Cancel instead of
 * Approve/Reject.
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
  onReview: (id: string, status: "approved" | "rejected") => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}) {
  const [filter, setFilter] = useState<Filter>(isAdmin ? "pending" : "all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const scoped = isAdmin ? requests : requests.filter((r) => r.salespersonId === currentUserId);
  const filtered = useMemo(() => {
    const list = filter === "all" ? scoped : scoped.filter((r) => r.status === filter);
    return [...list].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [scoped, filter]);

  const pendingCount = scoped.filter((r) => r.status === "pending").length;

  async function handle(action: () => Promise<void>) {
    try {
      await action();
    } catch {
      // onReview/onCancel callers already surface their own error toast.
    }
  }

  return (
    <ChartCard
      title={isAdmin ? "Leave Requests" : "My Requests"}
      description={isAdmin ? "Approve or reject time-off requests" : "Your time-off history"}
      actions={
        <div className="flex shrink-0 gap-1">
          {(["pending", "approved", "rejected", "all"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-medium capitalize transition-colors",
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
            const canCancel =
              request.status === "pending" &&
              (isAdmin || request.salespersonId === currentUserId);
            const canReview = isAdmin && request.status === "pending";
            const isBusy = busyId === request.id;

            return (
              <li
                key={request.id}
                className="flex flex-wrap items-center gap-2.5 rounded-xl border border-glass-border/60 bg-foreground/[0.02] p-2.5"
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
                    {formatRange(request)} · {request.days}d
                  </p>
                  {request.reason && (
                    <p className="mt-0.5 truncate text-xs text-text-tertiary/80">
                      &ldquo;{request.reason}&rdquo;
                    </p>
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
                {(canReview || canCancel) && (
                  <div className="flex shrink-0 items-center gap-1">
                    {canReview && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={isBusy}
                          aria-label="Approve"
                          className="text-success hover:bg-success/10 hover:text-success"
                          onClick={() => {
                            setBusyId(request.id);
                            handle(() => onReview(request.id, "approved")).finally(() =>
                              setBusyId(null)
                            );
                          }}
                        >
                          <Check className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          disabled={isBusy}
                          aria-label="Reject"
                          className="text-danger hover:bg-danger/10 hover:text-danger"
                          onClick={() => {
                            setBusyId(request.id);
                            handle(() => onReview(request.id, "rejected")).finally(() =>
                              setBusyId(null)
                            );
                          }}
                        >
                          <X className="size-3.5" />
                        </Button>
                      </>
                    )}
                    {canCancel && !canReview && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={isBusy}
                        aria-label="Cancel request"
                        className="text-text-tertiary hover:text-danger"
                        onClick={() => {
                          setBusyId(request.id);
                          handle(() => onCancel(request.id)).finally(() => setBusyId(null));
                        }}
                      >
                        <XCircle className="size-3.5" />
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </ChartCard>
  );
}
