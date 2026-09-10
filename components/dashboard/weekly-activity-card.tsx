"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAppointments, type Appointment } from "@/lib/supabase/appointments";
import { fetchQuotations, type Quotation } from "@/lib/supabase/quotations";
import { computeActivityTrend } from "@/lib/activity-trend";

/**
 * Leading-indicator card: appointments booked + quotations sent, the
 * activity that predicts next month's revenue 2-4 weeks before it shows up
 * as paid invoices. A week-over-week drop is flagged before it becomes a
 * missed target, not after.
 */
export function WeeklyActivityCard() {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [quotations, setQuotations] = useState<Quotation[] | null>(null);

  useEffect(() => {
    fetchAppointments().then(setAppointments).catch(() => setAppointments([]));
    fetchQuotations().then(setQuotations).catch(() => setQuotations([]));
  }, []);

  if (appointments === null || quotations === null) {
    return <Skeleton className="h-full min-h-[180px] w-full rounded-2xl" />;
  }

  const trend = computeActivityTrend([
    ...appointments.map((a) => a.createdAt),
    ...quotations.map((q) => q.sentAt),
  ]);

  return (
    <MetricCard
      label="Weekly Activity"
      value={String(trend.lastWeek)}
      delta={{ value: trend.deltaPct, label: "vs. prior week" }}
      wave={trend.wave}
      icon={Activity}
      tone={trend.declining ? "warning" : "success"}
    />
  );
}
