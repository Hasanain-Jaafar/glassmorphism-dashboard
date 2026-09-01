"use client";

import { useMemo, useState } from "react";
import { XCircle } from "lucide-react";
import { ChartCard } from "@/components/dashboard/chart-card";
import { LabeledBarChart } from "@/components/charts/labeled-bar-chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatPercent } from "@/lib/format";
import type { Quotation, QuotationRejectionReason } from "@/lib/supabase/quotations";
import { quotationRejectionReasonLabels } from "@/components/quotations/quotation-styles";

const ALL = "all";
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

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
  const [month, setMonth] = useState(ALL);
  const [year, setYear] = useState(ALL);

  const years = useMemo(() => {
    const set = new Set(quotations.map((q) => new Date(q.createdAt).getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [quotations]);

  const scoped = useMemo(() => {
    return quotations.filter((q) => {
      const date = new Date(q.createdAt);
      const matchesMonth = month === ALL || date.getMonth() === Number(month);
      const matchesYear = year === ALL || date.getFullYear() === Number(year);
      return matchesMonth && matchesYear;
    });
  }, [quotations, month, year]);

  const rejected = scoped.filter((q) => q.status === "rejected");
  const rate = scoped.length > 0 ? (rejected.length / scoped.length) * 100 : 0;

  const bars = (
    Object.keys(quotationRejectionReasonLabels) as QuotationRejectionReason[]
  ).map((reason) => ({
    key: reason,
    label: quotationRejectionReasonLabels[reason],
    value: rejected.filter((q) => q.rejectionReason === reason).length,
    colorVar: reasonColorVar[reason],
  }));

  return (
    <ChartCard
      title="Rejection Reasons"
      description={
        rejected.length > 0
          ? `${formatPercent(rate, 1)} of quotations rejected`
          : "Why quotations don't convert"
      }
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Select value={month} onValueChange={(value) => value && setMonth(value)}>
            <SelectTrigger className="glass-panel filter-control h-8 gap-1.5 px-2.5 text-xs">
              <SelectValue>
                {(value: string) => (value === ALL ? "All Months" : MONTHS[Number(value)])}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={ALL}>All Months</SelectItem>
              {MONTHS.map((label, index) => (
                <SelectItem key={label} value={String(index)}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={year} onValueChange={(value) => value && setYear(value)}>
            <SelectTrigger className="glass-panel filter-control h-8 gap-1.5 px-2.5 text-xs">
              <SelectValue>
                {(value: string) => (value === ALL ? "All Years" : value)}
              </SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value={ALL}>All Years</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {rejected.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <span className="flex size-10 items-center justify-center rounded-full bg-foreground/[0.06] text-text-tertiary">
            <XCircle className="size-4.5" />
          </span>
          <p className="text-xs text-text-tertiary">
            {scoped.length > 0
              ? "No quotations were rejected in this period."
              : "No quotations have been rejected yet — reasons will appear here once one is."}
          </p>
        </div>
      ) : (
        <LabeledBarChart bars={bars} />
      )}
    </ChartCard>
  );
}
