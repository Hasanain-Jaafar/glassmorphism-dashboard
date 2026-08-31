import type {
  QuotationRejectionReason,
  QuotationStatus,
} from "@/lib/supabase/quotations";

export const quotationStatusStyles: Record<QuotationStatus, string> = {
  draft: "bg-foreground/[0.06] text-text-tertiary",
  sent: "bg-chart-4/10 text-chart-4",
  accepted: "bg-success/10 text-success",
  rejected: "bg-danger/10 text-danger",
  expired: "bg-warning/10 text-warning",
};

export const quotationStatusLabels: Record<QuotationStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  expired: "Expired",
};

export const quotationRejectionReasonLabels: Record<
  QuotationRejectionReason,
  string
> = {
  high_price: "High Prices",
  delivery_time: "Delivery Time",
  bonus_limitation: "Bonus Limitation",
  quality_issue: "Quality Issue",
};
