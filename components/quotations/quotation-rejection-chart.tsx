import { XCircle } from "lucide-react";
import { ChartCard } from "@/components/dashboard/chart-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { formatPercent } from "@/lib/format";
import type { Quotation, QuotationRejectionReason } from "@/lib/supabase/quotations";
import { quotationRejectionReasonLabels } from "@/components/quotations/quotation-styles";

const reasonColorVar: Record<QuotationRejectionReason, string> = {
  high_price: "var(--chart-1)",
  delivery_time: "var(--chart-2)",
  bonus_limitation: "var(--chart-3)",
  quality_issue: "var(--chart-4)",
};

export function QuotationRejectionChart({
  quotations,
}: {
  quotations: Quotation[];
}) {
  const rejected = quotations.filter((q) => q.status === "rejected");
  const rate = quotations.length > 0 ? (rejected.length / quotations.length) * 100 : 0;

  const segments = (
    Object.keys(quotationRejectionReasonLabels) as QuotationRejectionReason[]
  ).map((reason) => ({
    id: reason,
    label: quotationRejectionReasonLabels[reason],
    value: rejected.filter((q) => q.rejectionReason === reason).length,
    colorVar: reasonColorVar[reason],
  }));

  return (
    <ChartCard
      title="Rejection Reasons"
      description={
        rejected.length > 0
          ? `${formatPercent(rate)} of quotations were rejected`
          : "Why quotations don't convert"
      }
    >
      {rejected.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-foreground/[0.06] text-text-tertiary">
            <XCircle className="size-4.5" />
          </span>
          <p className="text-xs text-text-tertiary">
            No quotations have been rejected yet — reasons will appear here
            once one is.
          </p>
        </div>
      ) : (
        <DonutChart
          segments={segments}
          centerValue={String(rejected.length)}
          centerLabel="rejected"
        />
      )}
    </ChartCard>
  );
}
