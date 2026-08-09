import { ChartCard } from "@/components/dashboard/chart-card";
import { CategoryRankChart } from "@/components/charts/category-rank-chart";
import { productBrands, productCategories, products } from "@/lib/mock-data";
import {
  categoryColorVar,
  fallbackCategoryColorVar,
} from "@/components/products/product-styles";

export function CatalogOverview() {
  const categories = productCategories
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
      description={`${productBrands.length} brands · ${products.length} products across ${productCategories.length} categories`}
    >
      <CategoryRankChart categories={categories} />
    </ChartCard>
  );
}
