import type { ProductStatus } from "@/lib/mock-data";

export const categoryStyles: Record<string, string> = {
  "Drinking Water Systems": "bg-primary/10 text-primary",
  "Sewage & Drainage Systems": "bg-chart-2/10 text-chart-2",
  "Sanitary Ware": "bg-chart-3/10 text-chart-3",
  "Galvanized Steel Pipes": "bg-chart-4/10 text-chart-4",
  "Infrastructure Pipeline Solutions": "bg-chart-5/10 text-chart-5",
  "Tools & Equipment": "bg-foreground/[0.08] text-text-secondary",
  "Water Storage Tanks": "bg-chart-2/10 text-chart-2",
};

export const fallbackCategoryStyle = "bg-foreground/[0.06] text-text-tertiary";

export const categoryColorVar: Record<string, string> = {
  "Drinking Water Systems": "var(--primary)",
  "Sewage & Drainage Systems": "var(--chart-2)",
  "Sanitary Ware": "var(--chart-3)",
  "Galvanized Steel Pipes": "var(--chart-4)",
  "Infrastructure Pipeline Solutions": "var(--chart-5)",
  "Tools & Equipment": "var(--text-tertiary)",
  "Water Storage Tanks": "var(--chart-2)",
};

export const fallbackCategoryColorVar = "var(--text-tertiary)";

export const statusStyles: Record<ProductStatus, string> = {
  active: "bg-success/10 text-success",
  draft: "bg-warning/10 text-warning",
  archived: "bg-foreground/[0.06] text-text-tertiary",
};

export const statusLabels: Record<ProductStatus, string> = {
  active: "Active",
  draft: "Draft",
  archived: "Archived",
};
