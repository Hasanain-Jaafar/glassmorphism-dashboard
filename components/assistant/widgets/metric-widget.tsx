import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssistantMetricWidget } from "@/lib/ai/widgets";

export function MetricWidget({ label, value, delta }: AssistantMetricWidget) {
  const isPositive = delta ? delta.value >= 0 : undefined;

  return (
    <div className="rounded-xl border border-glass-border bg-foreground/[0.03] px-4 py-3">
      <p className="text-xs font-medium text-text-tertiary">{label}</p>
      <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">{value}</p>
      {delta && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium",
              isPositive ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
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
    </div>
  );
}
