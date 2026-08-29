import type { DealStatus } from "@/lib/supabase/deals";

export const dealStatusStyles: Record<DealStatus, string> = {
  open: "bg-chart-4/10 text-chart-4",
  won: "bg-success/10 text-success",
  lost: "bg-danger/10 text-danger",
};

export const dealStatusLabels: Record<DealStatus, string> = {
  open: "Open",
  won: "Won",
  lost: "Lost",
};
