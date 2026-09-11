import { AlertTriangle } from "lucide-react";

/**
 * Shown in the Appointment/Quotation forms when the selected customer is
 * marked Inactive. When `blocksSubmit` is true, the form is also hard-blocking
 * submission (see each form's disabled logic) — reactivating the customer
 * from the Customers page is the only way forward, so the banner says so.
 */
export function InactiveCustomerBanner({
  blocksSubmit = false,
}: {
  blocksSubmit?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning sm:col-span-2">
      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
      <span>
        This customer is marked <strong className="font-medium">Inactive</strong>.
        {blocksSubmit &&
          " Reactivate them from the Customers page before creating new activity."}
      </span>
    </div>
  );
}
