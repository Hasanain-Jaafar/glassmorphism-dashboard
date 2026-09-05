import { formatNumber, formatPercent } from "@/lib/format";
import type { AssistantPipelineWidget } from "@/lib/ai/widgets";

export function PipelineWidget({ stages, conversions }: AssistantPipelineWidget) {
  const max = Math.max(...stages.map((stage) => stage.value), 1);

  return (
    <div className="rounded-xl border border-glass-border bg-foreground/[0.03] p-3.5">
      <div className="space-y-2.5">
        {stages.map((stage, index) => (
          <div key={`${stage.label}-${index}`}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium text-foreground">{stage.label}</span>
              <span className="shrink-0 text-text-secondary">{formatNumber(stage.value)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${(stage.value / max) * 100}%` }}
              />
            </div>
            {conversions?.[index] != null && (
              <p className="mt-1 text-[11px] text-text-tertiary">
                {formatPercent(conversions[index], 0)} converts to the next stage
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
