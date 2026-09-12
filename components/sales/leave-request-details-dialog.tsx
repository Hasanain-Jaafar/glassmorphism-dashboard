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
import { LEAVE_TYPE_LABELS, type LeaveRequest, type LeaveStatus } from "@/lib/supabase/leave";
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
            <span className="font-medium text-foreground">{request.days} working day{request.days === 1 ? "" : "s"}</span>
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
              <Label htmlFor="reject-note">Reason for rejection</Label>
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
              <Button type="button" variant="destructive" onClick={confirmReject} disabled={busy}>
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
