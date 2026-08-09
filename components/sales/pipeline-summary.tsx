import { ChartCard } from "@/components/dashboard/chart-card";
import { PipelineChart } from "@/components/charts/pipeline-chart";
import { pipeline, pipelineConversion } from "@/lib/mock-data";

export function PipelineSummary() {
  const conversions = [
    pipelineConversion.appointmentToQuotation,
    pipelineConversion.quotationToClosed,
    pipelineConversion.closedToPaid,
  ];

  return (
    <ChartCard title="Sales Pipeline" description="This month's funnel">
      <PipelineChart stages={pipeline} conversions={conversions} />
    </ChartCard>
  );
}
