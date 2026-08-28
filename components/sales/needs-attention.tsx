import { CheckCircle2 } from "lucide-react";
import { ChartCard } from "@/components/dashboard/chart-card";
import { formatPercent } from "@/lib/format";
import type { AttentionEntry } from "@/lib/sales-analytics";

export function NeedsAttention({ entries }: { entries: AttentionEntry[] }) {
  return (
    <ChartCard
      title="Needs Attention"
      description="Reps trending off track this period"
    >
      {entries.length === 0 ? (
        <div className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 text-center">
          <CheckCircle2 className="size-6 text-success" />
          <p className="text-sm font-medium text-foreground">
            Everyone&apos;s on track
          </p>
          <p className="max-w-[220px] text-xs text-text-tertiary">
            No performance flags for this period.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {entries.map(({ person, overview, reasons }) => (
            <li
              key={person.id}
              className="flex items-start gap-3 rounded-xl border border-glass-border/60 bg-foreground/[0.02] p-3"
            >
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                {person.initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    {person.name}
                  </p>
                  <span className="shrink-0 text-xs font-medium text-text-tertiary">
                    {formatPercent(overview.achievementPct, 0)}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {reasons.map((reason) => (
                    <span
                      key={reason}
                      className="rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-medium text-warning"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}
