import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { KpiWave } from "@/components/dashboard/kpi-wave";

export function MetricCard({
  label,
  value,
  delta,
  footnote,
  icon: Icon,
  wave,
}: {
  label: string;
  value: string;
  delta?: { value: number; label: string };
  footnote?: string;
  icon?: LucideIcon;
  wave?: number[];
}) {
  const isPositive = delta ? delta.value >= 0 : undefined;

  return (
    <div className="glass-panel relative h-full overflow-hidden rounded-2xl p-5 shadow-sm sm:p-6">
      {wave && wave.length > 1 && <KpiWave data={wave} />}
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-text-secondary">{label}</p>
          {Icon && (
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon className="size-4" />
            </span>
          )}
        </div>
        <p className="mt-3 text-[28px] font-semibold tracking-tight text-foreground sm:text-[32px]">
          {value}
        </p>
        {delta && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
                isPositive
                  ? "bg-success/10 text-success"
                  : "bg-danger/10 text-danger"
              )}
            >
              {isPositive ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              )}
              {Math.abs(delta.value).toFixed(1)}%
            </span>
            <span className="text-text-tertiary">{delta.label}</span>
          </div>
        )}
        {footnote && !delta && (
          <p className="mt-2 text-xs text-text-tertiary">{footnote}</p>
        )}
      </div>
    </div>
  );
}
