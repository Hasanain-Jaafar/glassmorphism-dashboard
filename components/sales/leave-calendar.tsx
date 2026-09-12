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
import { cn } from "@/lib/utils";
import type { LeaveRequest, LeaveType } from "@/lib/supabase/leave";
import { LEAVE_TYPE_LABELS } from "@/lib/supabase/leave";
import type { TeamMember } from "@/lib/supabase/team";

const WEEK_STARTS_ON = 6; // Saturday — same Sat-Thu work week as components/ui/calendar.tsx
const WEEKDAY_LABELS = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

const LEAVE_TYPE_DOT: Record<LeaveType, string> = {
  vacation: "bg-primary",
  sick: "bg-warning",
  unpaid: "bg-foreground/30",
  other: "bg-chart-2",
};

/**
 * The shared "who's confirmed out" calendar — only renders approved leave
 * (RLS already hides pending/rejected requests from everyone but the owner
 * and admins, so `requests` may not even contain those for a non-admin
 * viewer). Deliberately read-only: approving/rejecting lives in the
 * requests list, not here.
 */
export function LeaveCalendar({
  requests,
  members,
}: {
  requests: LeaveRequest[];
  members: TeamMember[];
}) {
  const [viewedMonth, setViewedMonth] = useState(() => startOfMonth(new Date()));

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

      <div className="mt-4 grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="py-1 text-center text-[11px] font-medium text-text-tertiary"
          >
            {label}
          </div>
        ))}
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewedMonth);
          const onLeave = leaveOn(day);
          const shown = onLeave.slice(0, 3);
          const overflow = onLeave.length - shown.length;

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "flex min-h-[58px] flex-col items-center gap-1 rounded-lg border border-transparent p-1",
                isToday(day) && "border-primary/40 bg-primary/[0.06]"
              )}
            >
              <span
                className={cn(
                  "text-xs",
                  inMonth ? "text-text-secondary" : "text-text-tertiary/50"
                )}
              >
                {format(day, "d")}
              </span>
              {shown.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-0.5">
                  {shown.map((leave) => {
                    const person = memberById.get(leave.salespersonId);
                    return (
                      <span
                        key={leave.id}
                        title={`${person?.name ?? "Unknown"} · ${LEAVE_TYPE_LABELS[leave.leaveType]}`}
                        className={cn(
                          "size-1.5 rounded-full",
                          LEAVE_TYPE_DOT[leave.leaveType]
                        )}
                      />
                    );
                  })}
                  {overflow > 0 && (
                    <span className="text-[9px] font-medium text-text-tertiary">
                      +{overflow}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-glass-border pt-3">
        {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map((type) => (
          <span key={type} className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
            <span className={cn("size-1.5 rounded-full", LEAVE_TYPE_DOT[type])} />
            {LEAVE_TYPE_LABELS[type]}
          </span>
        ))}
      </div>
    </div>
  );
}
