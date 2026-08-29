import { ChartCard } from "@/components/dashboard/chart-card";
import { PipelineBarChart } from "@/components/charts/pipeline-bar-chart";
import type { PipelineStage } from "@/lib/mock-data";

export function PipelineSummary({
  stages,
  conversions,
}: {
  stages: PipelineStage[];
  conversions: number[];
}) {
  return (
    <ChartCard title="Sales Pipeline" description="This month's funnel">
      <PipelineBarChart stages={stages} />
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-text-tertiary">
        {conversions.map((pct, index) => (
          <span key={index} className="flex items-center gap-2">
            {index > 0 && <span className="text-text-tertiary/50">·</span>}
            <span>
              {stages[index]?.label} → {stages[index + 1]?.label}{" "}
              <span className="font-medium text-text-secondary">{pct}%</span>
            </span>
          </span>
        ))}
      </div>
    </ChartCard>
  );
}
