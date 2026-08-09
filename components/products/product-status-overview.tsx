import { ChartCard } from "@/components/dashboard/chart-card";
import { DonutChart } from "@/components/charts/donut-chart";
import { products } from "@/lib/mock-data";
import { statusLabels } from "@/components/products/product-styles";

const statusColorVar: Record<string, string> = {
  active: "var(--success)",
  draft: "var(--warning)",
  archived: "var(--text-tertiary)",
};

export function ProductStatusOverview() {
  const activeCount = products.filter((p) => p.status === "active").length;

  const segments = (["active", "draft", "archived"] as const).map((status) => ({
    id: status,
    label: statusLabels[status],
    value: products.filter((p) => p.status === status).length,
    colorVar: statusColorVar[status],
  }));

  return (
    <ChartCard
      title="Products by Status"
      description="Catalog readiness across the product list"
    >
      <DonutChart
        segments={segments}
        centerValue={String(activeCount)}
        centerLabel="active"
      />
    </ChartCard>
  );
}
