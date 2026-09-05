import { z } from "zod";

/**
 * Structured visuals AI Brain can attach to a reply via the render_widget
 * tool (lib/ai/tools.ts), stored as ai_messages.blocks and rendered by
 * components/assistant/widgets/*. Values are pre-formatted display strings
 * from the model, not raw numbers — this schema only validates shape.
 */
export const assistantWidgetSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("metric"),
    label: z.string().max(60),
    value: z.string().max(40),
    delta: z
      .object({
        value: z.number(),
        label: z.string().max(40),
      })
      .optional(),
  }),
  z.object({
    type: z.literal("ranked_list"),
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
  }),
  z.object({
    type: z.literal("pipeline"),
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
  }),
  z.object({
    type: z.literal("table"),
    columns: z.array(z.string().max(30)).min(1).max(6),
    rows: z.array(z.array(z.string().max(60)).max(6)).min(1).max(10),
  }),
]);

export type AssistantWidget = z.infer<typeof assistantWidgetSchema>;
export type AssistantMetricWidget = Extract<AssistantWidget, { type: "metric" }>;
export type AssistantRankedListWidget = Extract<AssistantWidget, { type: "ranked_list" }>;
export type AssistantPipelineWidget = Extract<AssistantWidget, { type: "pipeline" }>;
export type AssistantTableWidget = Extract<AssistantWidget, { type: "table" }>;
