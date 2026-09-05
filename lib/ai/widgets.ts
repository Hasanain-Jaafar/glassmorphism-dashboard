import { z } from "zod";

/**
 * Structured visuals AI Brain can attach to a reply via the show_metric /
 * show_ranked_list / show_pipeline / show_table tools (lib/ai/tools.ts),
 * stored as ai_messages.blocks and rendered by components/assistant/widgets/*.
 * Values are pre-formatted display strings from the model, not raw numbers
 * — these schemas only validate shape.
 *
 * Each widget gets its own plain object schema (not a discriminated union)
 * because Anthropic's betaZodTool helper requires a tool's input schema to
 * compile to a top-level JSON `type: "object"` — a discriminated union
 * compiles to `anyOf` instead and betaZodTool throws building the tool.
 */
const metricInput = z.object({
  label: z.string().max(60),
  value: z.string().max(40),
  delta: z
    .object({
      value: z.number(),
      label: z.string().max(40),
    })
    .optional(),
});

const rankedListInput = z.object({
  title: z.string().max(60).optional(),
  items: z
    .array(
      z.object({
        label: z.string().max(60),
        value: z.string().max(40),
        pct: z.number().min(0).max(100),
      })
    )
    .min(1)
    .max(10),
});

const pipelineInput = z.object({
  stages: z
    .array(
      z.object({
        label: z.string().max(40),
        value: z.number(),
      })
    )
    .min(2)
    .max(6),
  // conversions[i] is the conversion rate from stages[i] to stages[i + 1].
  conversions: z.array(z.number().min(0).max(100)).max(5).optional(),
});

const tableInput = z.object({
  columns: z.array(z.string().max(30)).min(1).max(6),
  rows: z.array(z.array(z.string().max(60)).max(6)).min(1).max(10),
});

export const widgetInputSchemas = {
  metric: metricInput,
  ranked_list: rankedListInput,
  pipeline: pipelineInput,
  table: tableInput,
};

export type AssistantMetricWidget = { type: "metric" } & z.infer<typeof metricInput>;
export type AssistantRankedListWidget = { type: "ranked_list" } & z.infer<
  typeof rankedListInput
>;
export type AssistantPipelineWidget = { type: "pipeline" } & z.infer<typeof pipelineInput>;
export type AssistantTableWidget = { type: "table" } & z.infer<typeof tableInput>;

export type AssistantWidget =
  | AssistantMetricWidget
  | AssistantRankedListWidget
  | AssistantPipelineWidget
  | AssistantTableWidget;
