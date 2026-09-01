import { XCircle } from "lucide-react";
import { ChartCard } from "@/components/dashboard/chart-card";
import { formatNumber, formatPercent } from "@/lib/format";
import type { Quotation, QuotationRejectionReason } from "@/lib/supabase/quotations";
import { quotationRejectionReasonLabels } from "@/components/quotations/quotation-styles";
import { cn } from "@/lib/utils";

const reasonMeta: { key: QuotationRejectionReason; bar: string; dot: string }[] = [
  { key: "high_price", bar: "bg-chart-1", dot: "bg-chart-1" },
  { key: "delivery_time", bar: "bg-chart-2", dot: "bg-chart-2" },
  { key: "bonus_limitation", bar: "bg-chart-3", dot: "bg-chart-3" },
  { key: "quality_issue", bar: "bg-chart-4", dot: "bg-chart-4" },
];

export function QuotationRejectionChart({
  quotations,
}: {
  quotations: Quotation[];
}) {
  const rejected = quotations.filter((q) => q.status === "rejected");
  const rate = quotations.length > 0 ? (rejected.length / quotations.length) * 100 : 0;
  const counts = Object.fromEntries(
    reasonMeta.map((r) => [
      r.key,
      rejected.filter((q) => q.rejectionReason === r.key).length,
    ])
  ) as Record<QuotationRejectionReason, number>;

  return (
    <ChartCard title="Rejection Reasons" description="Why quotations don't convert">
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
        <>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight text-foreground">
              {formatPercent(rate, 1)}
            </span>
            <span className="text-xs text-text-tertiary">
              of quotations rejected · {formatNumber(rejected.length)} of{" "}
              {formatNumber(quotations.length)}
            </span>
          </div>

          <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
            {reasonMeta.map((r) => {
              const pct = rejected.length ? (counts[r.key] / rejected.length) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={r.key}
                  className={cn("h-full", r.bar)}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>

          <ul className="mt-4 space-y-2.5">
            {reasonMeta.map((r) => (
              <li
                key={r.key}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className={cn("size-2.5 shrink-0 rounded-full", r.dot)} />
                  <span className="truncate text-text-secondary">
                    {quotationRejectionReasonLabels[r.key]}
                  </span>
                </span>
                <span className="shrink-0 font-medium text-foreground">
                  {formatNumber(counts[r.key])}
                  <span className="ml-1.5 text-text-tertiary">
                    {formatPercent(
                      rejected.length ? (counts[r.key] / rejected.length) * 100 : 0,
                      0
                    )}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </ChartCard>
  );
}
