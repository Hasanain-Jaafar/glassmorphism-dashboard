import { ChartCard } from "@/components/dashboard/chart-card";
import { CategoryRankChart } from "@/components/charts/category-rank-chart";
import type { Product } from "@/lib/mock-data";
import {
  categoryColorVar,
  fallbackCategoryColorVar,
} from "@/components/products/product-styles";

export function CatalogOverview({ products }: { products: Product[] }) {
  const brandCount = new Set(products.map((p) => p.brand)).size;
  const categoryNames = Array.from(new Set(products.map((p) => p.category)));

  const categories = categoryNames
    .map((category) => {
      const count = products.filter((product) => product.category === category)
        .length;
      return {
        id: category,
        name: category,
        count,
        pct: products.length ? (count / products.length) * 100 : 0,
        colorVar: categoryColorVar[category] ?? fallbackCategoryColorVar,
      };
    })
    .sort((a, b) => b.count - a.count);

  return (
    <ChartCard
      title="Catalog at a Glance"
      description={`${brandCount} brands · ${products.length} products across ${categoryNames.length} categories`}
    >
      <CategoryRankChart categories={categories} />
    </ChartCard>
  );
}
