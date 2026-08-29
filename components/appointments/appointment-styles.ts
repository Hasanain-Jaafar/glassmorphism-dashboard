import type { AppointmentStatus } from "@/lib/supabase/appointments";

export const appointmentStatusStyles: Record<AppointmentStatus, string> = {
  scheduled: "bg-chart-4/10 text-chart-4",
  completed: "bg-success/10 text-success",
  cancelled: "bg-foreground/[0.06] text-text-tertiary",
  no_show: "bg-danger/10 text-danger",
};

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No Show",
};
