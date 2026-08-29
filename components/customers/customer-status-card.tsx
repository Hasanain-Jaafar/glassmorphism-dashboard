import { Users2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Customer, CustomerStatus } from "@/lib/customers-data";
import { customerStatusLabels } from "@/components/customers/customer-styles";

const statusMeta: { key: CustomerStatus; bar: string; dot: string }[] = [
  { key: "active", bar: "bg-success", dot: "bg-success" },
  { key: "prospect", bar: "bg-warning", dot: "bg-warning" },
  { key: "inactive", bar: "bg-foreground/[0.25]", dot: "bg-foreground/[0.35]" },
];

/**
 * The 5th card in the Customers KPI row — same glass-panel shell as
 * MetricCard, but a status-mix bar + legend instead of one big number, since
 * "how healthy is the book overall" doesn't reduce to a single value the way
 * the other four KPIs do.
 */
export function CustomerStatusCard({ customers }: { customers: Customer[] }) {
  const total = customers.length;
  const counts = Object.fromEntries(
    statusMeta.map((s) => [s.key, customers.filter((c) => c.status === s.key).length])
  ) as Record<CustomerStatus, number>;

  return (
    <div className="glass-panel relative h-full overflow-hidden rounded-2xl p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-text-secondary">Status Mix</p>
        <span className="flex size-8 items-center justify-center rounded-lg bg-foreground/[0.06] text-text-secondary">
          <Users2 className="size-4" />
        </span>
      </div>

      {total === 0 ? (
        <p className="mt-4 text-xs text-text-tertiary">
          No customers yet.
        </p>
      ) : (
        <>
          <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
            {statusMeta.map((s) => {
              const pct = (counts[s.key] / total) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={s.key}
                  className={cn("h-full", s.bar)}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>

          <ul className="mt-3.5 space-y-1.5">
            {statusMeta.map((s) => (
              <li key={s.key} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-text-tertiary">
                  <span className={cn("size-1.5 shrink-0 rounded-full", s.dot)} />
                  {customerStatusLabels[s.key]}
                </span>
                <span className="font-medium text-foreground">
                  {counts[s.key]}
                  <span className="ml-1 text-text-tertiary">
                    · {Math.round((counts[s.key] / total) * 100)}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
