import type { AssistantWidget } from "@/lib/ai/widgets";
import { MetricWidget } from "@/components/assistant/widgets/metric-widget";
import { RankedListWidget } from "@/components/assistant/widgets/ranked-list-widget";
import { PipelineWidget } from "@/components/assistant/widgets/pipeline-widget";
import { TableWidget } from "@/components/assistant/widgets/table-widget";

export function WidgetBlock({ block }: { block: AssistantWidget }) {
  switch (block.type) {
    case "metric":
      return <MetricWidget {...block} />;
    case "ranked_list":
      return <RankedListWidget {...block} />;
    case "pipeline":
      return <PipelineWidget {...block} />;
    case "table":
      return <TableWidget {...block} />;
  }
}
