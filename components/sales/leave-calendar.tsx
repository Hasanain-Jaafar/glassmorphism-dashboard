"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { LeaveRequest, LeaveType } from "@/lib/supabase/leave";
import { LEAVE_TYPE_LABELS } from "@/lib/supabase/leave";
import type { TeamMember } from "@/lib/supabase/team";

const WEEK_STARTS_ON = 6; // Saturday — same Sat-Thu work week as components/ui/calendar.tsx
const WEEKDAY_LABELS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

const LEAVE_TYPE_RING: Record<LeaveType, string> = {
  vacation: "ring-primary",
  sick: "ring-warning",
  unpaid: "ring-foreground/30",
  other: "ring-chart-2",
};

const LEAVE_TYPE_DOT: Record<LeaveType, string> = {
  vacation: "bg-primary",
  sick: "bg-warning",
  unpaid: "bg-foreground/30",
  other: "bg-chart-2",
};

function personAvatar(member: TeamMember | undefined, ring: string) {
  return (
    <span
      className={cn(
        "flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-[9px] font-semibold text-accent-foreground ring-2 ring-offset-1 ring-offset-background",
        ring
      )}
    >
      {member?.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        member?.initials ?? "?"
      )}
    </span>
  );
}

/**
 * The shared "who's confirmed out" calendar — only renders approved leave
 * (RLS already hides pending/rejected requests from everyone but the owner
 * and admins, so `requests` may not even contain those for a non-admin
 * viewer). Clicking a day opens a read-only breakdown; approving/rejecting
 * still lives in the requests list, not here.
 */
export function LeaveCalendar({
  requests,
  members,
}: {
  requests: LeaveRequest[];
  members: TeamMember[];
}) {
  const [viewedMonth, setViewedMonth] = useState(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const approved = useMemo(
    () => requests.filter((r) => r.status === "approved"),
    [requests]
  );

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewedMonth), { weekStartsOn: WEEK_STARTS_ON });
    const end = endOfWeek(endOfMonth(viewedMonth), { weekStartsOn: WEEK_STARTS_ON });
    return eachDayOfInterval({ start, end });
  }, [viewedMonth]);

  function leaveOn(day: Date) {
    const iso = format(day, "yyyy-MM-dd");
    return approved.filter((r) => r.startDate <= iso && r.endDate >= iso);
  }

  const selectedDayLeave = selectedDay ? leaveOn(selectedDay) : [];

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">
          {format(viewedMonth, "MMMM yyyy")}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setViewedMonth((m) => subMonths(m, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setViewedMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2 rounded-lg bg-foreground/[0.04] py-2">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-sm font-bold text-text-secondary"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewedMonth);
          const onLeave = leaveOn(day);
          const shown = onLeave.slice(0, 3);
          const overflow = onLeave.length - shown.length;
          // 2+ people out the same day is a coverage risk worth a glance —
          // warning (amber), not danger (red): per CLAUDE.md's semantic
          // palette, red is reserved for destructive/negative states, and
          // this is a caution signal, not an error.
          const lowCoverage = onLeave.length >= 2;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={cn(
                "mx-auto flex min-h-[84px] w-full max-w-[76px] cursor-pointer flex-col items-center gap-2 rounded-xl p-1.5 transition-colors",
                lowCoverage
                  ? "bg-warning/10 ring-1 ring-warning/25 hover:bg-warning/15"
                  : "hover:bg-foreground/[0.04]"
              )}
            >
              <span
                className={cn(
                  "flex size-6 items-center justify-center rounded-full text-xs",
                  isToday(day)
                    ? "bg-primary text-primary-foreground font-semibold"
                    : inMonth
                      ? "text-text-secondary"
                      : "text-text-tertiary/50"
                )}
              >
                {format(day, "d")}
              </span>
              {shown.length > 0 && (
                <div className="flex -space-x-1.5">
                  {shown.map((leave) => (
                    <span key={leave.id}>
                      {personAvatar(memberById.get(leave.salespersonId), LEAVE_TYPE_RING[leave.leaveType])}
                    </span>
                  ))}
                  {overflow > 0 && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground/[0.08] text-[9px] font-medium text-text-tertiary ring-2 ring-offset-1 ring-offset-background ring-transparent">
                      +{overflow}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-glass-border pt-3">
        {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((type) => (
          <span key={type} className="flex items-center gap-2 text-xs text-text-secondary">
            <span className={cn("size-3 rounded-full", LEAVE_TYPE_DOT[type])} />
            {LEAVE_TYPE_LABELS[type]}
          </span>
        ))}
        <span className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="size-3 rounded-full bg-warning/25 ring-1 ring-warning/50" />
          2+ out same day
        </span>
      </div>

      <Dialog open={selectedDay !== null} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedDay ? format(selectedDay, "EEEE, MMMM d, yyyy") : ""}
            </DialogTitle>
            <DialogDescription>
              {selectedDayLeave.length === 0
                ? "Everyone is scheduled to work this day."
                : `${selectedDayLeave.length} team member${selectedDayLeave.length === 1 ? "" : "s"} out`}
            </DialogDescription>
          </DialogHeader>

          {selectedDayLeave.length > 0 && (
            <ul className="space-y-2 pt-1">
              {selectedDayLeave.map((leave) => {
                const person = memberById.get(leave.salespersonId);
                return (
                  <li
                    key={leave.id}
                    className="flex items-start gap-2.5 rounded-xl border border-glass-border/60 bg-foreground/[0.02] p-2.5"
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
                        {person?.name ?? "Unknown"}
                      </p>
                      <p className="truncate text-xs text-text-tertiary">
                        {LEAVE_TYPE_LABELS[leave.leaveType]} ·{" "}
                        {format(new Date(`${leave.startDate}T00:00:00`), "MMM d")} –{" "}
                        {format(new Date(`${leave.endDate}T00:00:00`), "MMM d, yyyy")}
                      </p>
                      {leave.reason && (
                        <p className="mt-0.5 truncate text-xs text-text-tertiary/80">
                          &ldquo;{leave.reason}&rdquo;
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
