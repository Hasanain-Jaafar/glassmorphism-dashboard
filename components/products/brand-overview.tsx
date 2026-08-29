import { ChartCard } from "@/components/dashboard/chart-card";
import { BrandBubbles } from "@/components/charts/brand-bubbles";
import type { Product } from "@/lib/mock-data";

export function BrandOverview({ products }: { products: Product[] }) {
  const brandNames = Array.from(new Set(products.map((p) => p.brand)));

  const brands = brandNames
    .map((brand) => ({
      id: brand,
      name: brand,
      value: products
        .filter((product) => product.brand === brand)
        .reduce((sum, product) => sum + product.price, 0),
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <ChartCard
      title="Top Brands by Value"
      description="Catalog value contributed by each brand · size shows share"
    >
      <BrandBubbles brands={brands} />
    </ChartCard>
  );
}
