import { AlertTriangle } from "lucide-react";

/**
 * Shown in the Appointment/Quotation forms when the selected customer is
 * marked Inactive. Purely informational — Inactive doesn't block anything
 * at the data layer, so this is the one place a rep is warned before
 * creating new activity against a dormant account.
 */
export function InactiveCustomerBanner() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning sm:col-span-2">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      <span>
        This customer is marked <strong className="font-medium">Inactive</strong>.
      </span>
    </div>
  );
}
