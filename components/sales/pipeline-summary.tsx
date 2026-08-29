import { PipelineFunnel } from "@/components/charts/pipeline-funnel";
import type { PipelineStage } from "@/lib/mock-data";

/**
 * Deliberately styled apart from ChartCard (used by every other dashboard
 * card) — a gradient ring instead of the plain glass border, and an ambient
 * corner glow echoing the app shell's own background glow. CLAUDE.md §15
 * sanctions a gradient border for "rare, high-value surfaces"; this is the
 * one card on the dashboard that gets it.
 */
export function PipelineSummary({
  stages,
  conversions,
}: {
  stages: PipelineStage[];
  conversions: number[];
}) {
  return (
    <div className="h-full rounded-3xl bg-gradient-to-br from-primary/50 via-[#8f7fff]/35 to-chart-2/40 p-px shadow-sm">
      <div className="glass-panel relative h-full overflow-hidden rounded-[calc(1.5rem-1px)] p-5 sm:p-6">
        <div
          className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-primary/20 blur-3xl"
          aria-hidden
        />
        <div className="relative mb-6">
          <h3 className="text-sm font-semibold text-foreground sm:text-base">
            Sales Pipeline
          </h3>
          <p className="mt-0.5 text-xs text-text-tertiary">
            This month&apos;s funnel
          </p>
        </div>
        <div className="relative">
          <PipelineFunnel stages={stages} conversions={conversions} />
        </div>
      </div>
    </div>
  );
}
