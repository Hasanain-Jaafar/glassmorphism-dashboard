"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  PackagePlus,
  PackageSearch,
  Search,
  Table2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ProductCard } from "@/components/products/product-card";
import { AddProductForm } from "@/components/products/add-product-form";
import { ProductTable } from "@/components/tables/product-table";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsPanel,
  TabsTab,
} from "@/components/ui/tabs";
import {
  computeProductStats,
  productBrands,
  productCategories,
  type Product,
} from "@/lib/mock-data";
import { fetchProducts, insertProduct } from "@/lib/supabase/products";
import { formatUSD } from "@/lib/format";
import { useAuth } from "@/components/providers/auth-provider";

const ALL_CATEGORIES = "all";
const ALL_STATUSES = "all";
const ALL_BRANDS = "all";

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

const productTabs = ["catalog", "all", "add"] as const;
type ProductTab = (typeof productTabs)[number];

function isProductTab(value: string | null): value is ProductTab {
  return (productTabs as readonly string[]).includes(value ?? "");
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin: admin } = useAuth();

  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const requestedQuery = searchParams.get("q");
  const requestedCategory = searchParams.get("category");

  const [activeTab, setActiveTab] = useState<ProductTab>(
    isProductTab(requestedTab) && (requestedTab !== "add" || admin)
      ? requestedTab
      : "catalog"
  );
  const [search, setSearch] = useState(requestedQuery ?? "");
  const [categoryFilter, setCategoryFilter] = useState<string>(
    requestedCategory && productCategories.includes(requestedCategory as (typeof productCategories)[number])
      ? requestedCategory
      : ALL_CATEGORIES
  );
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES);
  const [brandFilter, setBrandFilter] = useState<string>(ALL_BRANDS);

  // Sync activeTab/search/categoryFilter when a new command-palette deep
  // link arrives (React's documented "adjust state during render" pattern —
  // see app/(dashboard)/team/page.tsx for the same convention).
  const deepLinkKey = `${requestedTab}:${requestedQuery}:${requestedCategory}:${admin}`;
  const [prevDeepLinkKey, setPrevDeepLinkKey] = useState(deepLinkKey);
  if (deepLinkKey !== prevDeepLinkKey) {
    setPrevDeepLinkKey(deepLinkKey);
    if (isProductTab(requestedTab) && (requestedTab !== "add" || admin)) {
      setActiveTab(requestedTab);
    }
    if (requestedQuery) {
      setSearch(requestedQuery);
      setActiveTab("all");
    }
    if (
      requestedCategory &&
      productCategories.includes(requestedCategory as (typeof productCategories)[number])
    ) {
      setCategoryFilter(requestedCategory);
    }
  }

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((error: Error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => computeProductStats(products), [products]);

  const kpiWaves = useMemo(() => {
    const countByCategory = productCategories.map(
      (category) => products.filter((p) => p.category === category).length
    );
    const activeByCategory = productCategories.map(
      (category) =>
        products.filter((p) => p.category === category && p.status === "active")
          .length
    );
    const avgPriceByCategory = productCategories.map((category) => {
      const items = products.filter((p) => p.category === category);
      return items.length
        ? items.reduce((sum, p) => sum + p.price, 0) / items.length
        : 0;
    });
    const sortedPrices = products.map((p) => p.price).sort((a, b) => a - b);

    return { countByCategory, activeByCategory, avgPriceByCategory, sortedPrices };
  }, [products]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        !query ||
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query);
      const matchesCategory =
        categoryFilter === ALL_CATEGORIES || product.category === categoryFilter;
      const matchesStatus =
        statusFilter === ALL_STATUSES || product.status === statusFilter;
      const matchesBrand =
        brandFilter === ALL_BRANDS || product.brand === brandFilter;
      return matchesSearch && matchesCategory && matchesStatus && matchesBrand;
    });
  }, [products, search, categoryFilter, statusFilter, brandFilter]);

  const hasActiveFilters =
    search.trim() !== "" ||
    categoryFilter !== ALL_CATEGORIES ||
    statusFilter !== ALL_STATUSES ||
    brandFilter !== ALL_BRANDS;

  function clearFilters() {
    setSearch("");
    setCategoryFilter(ALL_CATEGORIES);
    setStatusFilter(ALL_STATUSES);
    setBrandFilter(ALL_BRANDS);
  }

  async function handleAdd(product: Omit<Product, "id">) {
    try {
      const created = await insertProduct(product);
      setProducts((prev) => [created, ...prev]);
      toast.success(`${created.name} was added to the catalog`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't add product");
      throw error;
    }
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader
          title="Products"
          description="Manage the product catalog available for quotations"
        />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <MetricCard
            label="Total Products"
            value={String(stats.total)}
            footnote="Across all categories"
            wave={kpiWaves.countByCategory}
          />
          <MetricCard
            label="Active"
            value={String(stats.active)}
            footnote="Currently available for quotations"
            wave={kpiWaves.activeByCategory}
          />
          <MetricCard
            label="Categories"
            value={String(stats.categories)}
            footnote="Distinct catalog groups"
            wave={kpiWaves.avgPriceByCategory}
          />
          <MetricCard
            label="Avg. Price"
            value={formatUSD(stats.avgPrice)}
            footnote="Across all products"
            wave={kpiWaves.sortedPrices}
          />
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <InputGroup className="glass-panel sm:max-w-xs">
            <InputGroupAddon>
              <Search className="size-4" />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Search by name, SKU, or brand..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </InputGroup>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={categoryFilter}
              onValueChange={(value) => value && setCategoryFilter(value)}
            >
              <SelectTrigger className="glass-panel h-8 gap-1.5 rounded-lg px-2.5 text-xs">
                <SelectValue>
                  {(value: string) =>
                    value === ALL_CATEGORIES ? "All Categories" : value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" className="w-auto min-w-[240px]">
                <SelectItem value={ALL_CATEGORIES}>All Categories</SelectItem>
                {productCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={brandFilter}
              onValueChange={(value) => value && setBrandFilter(value)}
            >
              <SelectTrigger className="glass-panel h-8 gap-1.5 rounded-lg px-2.5 text-xs">
                <SelectValue>
                  {(value: string) =>
                    value === ALL_BRANDS ? "All Brands" : value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end" className="w-auto min-w-[220px]">
                <SelectItem value={ALL_BRANDS}>All Brands</SelectItem>
                {productBrands.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) => value && setStatusFilter(value)}
            >
              <SelectTrigger className="glass-panel h-8 gap-1.5 rounded-lg px-2.5 text-xs">
                <SelectValue>
                  {(value: string) =>
                    value === ALL_STATUSES
                      ? "All Statuses"
                      : (statusOptions.find((option) => option.value === value)
                          ?.label ?? value)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL_STATUSES}>All Statuses</SelectItem>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.15}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTab value="catalog">
              <LayoutGrid className="size-[15px]" />
              Catalog
            </TabsTab>
            <TabsTab value="all">
              <Table2 className="size-[15px]" />
              All Products
            </TabsTab>
            {admin && (
              <TabsTab value="add">
                <PackagePlus className="size-[15px]" />
                Add Product
              </TabsTab>
            )}
            <TabsIndicator />
          </TabsList>

          <TabsPanel value="catalog">
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-52 w-full rounded-2xl" />
                ))}
              </div>
            ) : filtered.length ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3">
                {filtered.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <EmptyProductsState
                hasFilters={hasActiveFilters}
                onClear={clearFilters}
              />
            )}
          </TabsPanel>

          <TabsPanel value="all">
            {loading ? (
              <Skeleton className="h-96 w-full rounded-2xl" />
            ) : filtered.length ? (
              <ProductTable data={filtered} />
            ) : (
              <EmptyProductsState
                hasFilters={hasActiveFilters}
                onClear={clearFilters}
              />
            )}
          </TabsPanel>

          {admin && (
            <TabsPanel value="add">
              <AddProductForm onAdd={handleAdd} />
            </TabsPanel>
          )}
        </Tabs>
      </Reveal>
    </div>
  );
}

function EmptyProductsState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="glass-panel flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
      <span className="flex size-11 items-center justify-center rounded-full bg-foreground/[0.06] text-text-tertiary">
        <PackageSearch className="size-5" />
      </span>
      <div>
        <p className="text-sm font-medium text-foreground">No products found</p>
        <p className="mt-1 text-xs text-text-tertiary">
          {hasFilters
            ? "Try adjusting your search or filters."
            : "Products will appear here once added to the catalog."}
        </p>
      </div>
      {hasFilters && (
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
