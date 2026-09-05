import type { AssistantRankedListWidget } from "@/lib/ai/widgets";

export function RankedListWidget({ title, items }: AssistantRankedListWidget) {
  return (
    <div className="rounded-xl border border-glass-border bg-foreground/[0.03] p-3.5">
      {title && <p className="mb-2.5 text-xs font-medium text-text-tertiary">{title}</p>}
      <div className="space-y-2.5">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`}>
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate font-medium text-foreground">{item.label}</span>
              <span className="shrink-0 text-text-secondary">{item.value}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foreground/[0.06]">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-500"
                style={{ width: `${Math.min(Math.max(item.pct, 0), 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
