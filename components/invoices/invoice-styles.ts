import type { InvoiceStatus } from "@/lib/supabase/invoices";

export const invoiceStatusStyles: Record<InvoiceStatus, string> = {
  draft: "bg-foreground/[0.06] text-text-tertiary",
  sent: "bg-chart-4/10 text-chart-4",
  paid: "bg-success/10 text-success",
  overdue: "bg-danger/10 text-danger",
  cancelled: "bg-foreground/[0.06] text-text-tertiary",
};

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};
