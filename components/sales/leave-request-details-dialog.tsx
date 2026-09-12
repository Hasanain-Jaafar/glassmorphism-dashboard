"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  LEAVE_TYPE_LABELS,
  type CoverageConflict,
  type LeaveRequest,
  type LeaveStatus,
} from "@/lib/supabase/leave";
import type { TeamMember } from "@/lib/supabase/team";

function formatConflictDate(iso: string) {
  return format(new Date(`${iso}T00:00:00`), "EEE, MMM d");
}

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

function formatRange(request: LeaveRequest) {
  const start = new Date(`${request.startDate}T00:00:00`);
  const end = new Date(`${request.endDate}T00:00:00`);
  if (request.startDate === request.endDate) return format(start, "MMM d, yyyy");
  return `${format(start, "MMM d")} – ${format(end, "MMM d, yyyy")}`;
}

/**
 * The single place a request's full context is reviewed — replaces bare
 * inline approve/reject icons with an actual view of who, when, why, and
 * (once decided) who reviewed it and any rejection reason, for both the
 * admin acting on it and the rep looking back at their own history.
 */
export function LeaveRequestDetailsDialog({
  request,
  person,
  reviewer,
  otherLeaveThisMonth,
  coverageConflicts,
  members,
  isAdmin,
  currentUserId,
  onClose,
  onApprove,
  onReject,
  onCancel,
}: {
  request: LeaveRequest;
  person: TeamMember | undefined;
  reviewer: TeamMember | undefined;
  /** This person's other approved leave in the same calendar month — the exact dates and days, not just a total, since a reviewer (or the person themself) needs to see when, not just how much. */
  otherLeaveThisMonth?: LeaveRequest[];
  /** Days within this request's range where 2+ *other* people are already approved off — a coverage risk to flag before approving one more. */
  coverageConflicts?: CoverageConflict[];
  /** Only needed to resolve names in coverageConflicts. */
  members?: TeamMember[];
  isAdmin: boolean;
  currentUserId: string;
  onClose: () => void;
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string, note: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [busy, setBusy] = useState(false);

  function handleClose(open: boolean) {
    if (open) return;
    setRejecting(false);
    setRejectNote("");
    onClose();
  }

  const canReview = isAdmin && request.status === "pending";
  const canCancel =
    request.status === "pending" &&
    (isAdmin || request.salespersonId === currentUserId);

  async function approve() {
    setBusy(true);
    try {
      await onApprove(request.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function confirmReject() {
    setBusy(true);
    try {
      await onReject(request.id, rejectNote.trim());
      onClose();
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    try {
      await onCancel(request.id);
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-sm font-semibold text-accent-foreground">
              {person?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={person.avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                person?.initials ?? "?"
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle>{person?.name ?? "Unknown"}</DialogTitle>
              <DialogDescription>
                {LEAVE_TYPE_LABELS[request.leaveType]} · {formatRange(request)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {coverageConflicts && coverageConflicts.length > 0 && (
            <div className="space-y-1.5 rounded-lg bg-danger/10 p-2.5">
              <p className="text-xs font-semibold text-danger">
                ⚠ Coverage conflict — already 2+ people on leave
              </p>
              <ul className="space-y-1">
                {coverageConflicts.map((conflict) => (
                  <li key={conflict.date} className="text-xs text-danger">
                    <span className="font-medium">{formatConflictDate(conflict.date)}:</span>{" "}
                    {conflict.people
                      .map((p) => {
                        const name =
                          members?.find((m) => m.id === p.salespersonId)?.name ?? "Someone";
                        return `${name} (${LEAVE_TYPE_LABELS[p.leaveType]})`;
                      })
                      .join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Status</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                STATUS_STYLES[request.status]
              )}
            >
              {STATUS_LABELS[request.status]}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Duration</span>
            <span className="text-base font-semibold text-foreground">
              {request.days} working day{request.days === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Submitted</span>
            <span className="text-foreground">{format(new Date(request.createdAt), "MMM d, yyyy")}</span>
          </div>

          {request.reason && (
            <div>
              <p className="text-xs text-text-tertiary">Reason from {person?.name?.split(" ")[0] ?? "requester"}</p>
              <p className="mt-1 rounded-lg bg-foreground/[0.03] p-2.5 text-sm text-foreground">
                {request.reason}
              </p>
            </div>
          )}

          {otherLeaveThisMonth && otherLeaveThisMonth.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-warning">
                Other approved leave this month
              </p>
              <ul className="space-y-1.5">
                {otherLeaveThisMonth.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-lg bg-warning/10 px-2.5 py-2 text-xs text-warning"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold">
                        {LEAVE_TYPE_LABELS[entry.leaveType]}
                      </span>
                      <span className="shrink-0 font-semibold">{entry.days}d</span>
                    </div>
                    <p className="mt-0.5 truncate text-warning/80">{formatRange(entry)}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {request.status !== "pending" && (
            <div className="border-t border-glass-border pt-3">
              <p className="text-xs text-text-tertiary">
                {STATUS_LABELS[request.status]} by {reviewer?.name ?? "an admin"}
                {request.reviewedAt && ` · ${format(new Date(request.reviewedAt), "MMM d, yyyy")}`}
              </p>
              {request.reviewNote && (
                <p className="mt-1 rounded-lg bg-foreground/[0.03] p-2.5 text-sm text-foreground">
                  {request.reviewNote}
                </p>
              )}
            </div>
          )}

          {rejecting && (
            <div className="space-y-1.5 border-t border-glass-border pt-3">
              <Label htmlFor="reject-note">Reason for rejection (required)</Label>
              <Textarea
                id="reject-note"
                rows={2}
                placeholder="Let them know why — shown on their request"
                value={rejectNote}
                onChange={(e) => setRejectNote(e.target.value)}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          {canReview && !rejecting && (
            <>
              <Button type="button" variant="outline" onClick={() => setRejecting(true)} disabled={busy}>
                Reject
              </Button>
              <Button type="button" onClick={approve} disabled={busy}>
                Approve
              </Button>
            </>
          )}
          {canReview && rejecting && (
            <>
              <Button type="button" variant="outline" onClick={() => setRejecting(false)} disabled={busy}>
                Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmReject}
                disabled={busy || rejectNote.trim().length === 0}
              >
                Confirm Rejection
              </Button>
            </>
          )}
          {!canReview && canCancel && (
            <Button type="button" variant="destructive" onClick={cancel} disabled={busy}>
              Cancel Request
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
