import { Trophy } from "lucide-react";
import { ChartCard } from "@/components/dashboard/chart-card";
import { customers, type CustomerStatus } from "@/lib/customers-data";
import { formatUSD } from "@/lib/format";
import { cn } from "@/lib/utils";

const statusMeta: { key: CustomerStatus; label: string; bar: string; dot: string }[] = [
  { key: "active", label: "Active", bar: "bg-success", dot: "bg-success" },
  { key: "prospect", label: "Prospect", bar: "bg-warning", dot: "bg-warning" },
  { key: "inactive", label: "Inactive", bar: "bg-foreground/[0.25]", dot: "bg-foreground/[0.35]" },
];

export function CustomerPulse() {
  const total = customers.length;
  const counts = Object.fromEntries(
    statusMeta.map((s) => [s.key, customers.filter((c) => c.status === s.key).length])
  ) as Record<CustomerStatus, number>;

  const totalRevenue = customers.reduce((sum, c) => sum + c.totalSales, 0);
  const totalOutstanding = customers.reduce((sum, c) => sum + c.outstandingAmount, 0);
  const topCustomer = [...customers].sort((a, b) => b.totalSales - a.totalSales)[0];

  return (
    <ChartCard
      title="Customer Pulse"
      description="Status mix, revenue, and who still owes us"
    >
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
        {statusMeta.map((s) => {
          const pct = total ? (counts[s.key] / total) * 100 : 0;
          if (pct === 0) return null;
          return <div key={s.key} className={cn("h-full", s.bar)} style={{ width: `${pct}%` }} />;
        })}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-tertiary">
        {statusMeta.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", s.dot)} />
            {s.label} <span className="font-medium text-foreground">{counts[s.key]}</span>
          </span>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-text-tertiary">Total Revenue</p>
          <p className="mt-0.5 text-lg font-semibold text-foreground">
            {formatUSD(totalRevenue)}
          </p>
        </div>
        <div>
          <p className="text-xs text-text-tertiary">Outstanding</p>
          <p
            className={cn(
              "mt-0.5 text-lg font-semibold",
              totalOutstanding > 0 ? "text-warning" : "text-foreground"
            )}
          >
            {formatUSD(totalOutstanding)}
          </p>
        </div>
      </div>

      {topCustomer && (
        <div className="mt-5 flex items-center gap-2.5 rounded-xl border border-glass-border/60 bg-foreground/[0.02] p-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Trophy className="size-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {topCustomer.company}
            </p>
            <p className="text-xs text-text-tertiary">Top customer this year</p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-foreground">
            {formatUSD(topCustomer.totalSales)}
          </span>
        </div>
      )}
    </ChartCard>
  );
}
