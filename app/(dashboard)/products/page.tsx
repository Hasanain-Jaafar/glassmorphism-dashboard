"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  CircleDollarSign,
  LayoutGrid,
  Network,
  Package,
  PackagePlus,
  PackageSearch,
  Search,
  Table2,
  Tags,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/dashboard/page-header";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ProductCard } from "@/components/products/product-card";
import { ProductForm } from "@/components/products/product-form";
import { ProductNetworkGraph } from "@/components/products/product-network-graph";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  computeProductStats,
  productBrands,
  productCategories,
  type Product,
} from "@/lib/mock-data";
import { fetchProducts, insertProduct, updateProduct } from "@/lib/supabase/products";
import { fetchQuotations, type Quotation } from "@/lib/supabase/quotations";
import { buildProductNetwork } from "@/lib/product-network";
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

const productTabs = ["catalog", "all", "network"] as const;
type ProductTab = (typeof productTabs)[number];

function isProductTab(value: string | null): value is ProductTab {
  return (productTabs as readonly string[]).includes(value ?? "");
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const { isAdmin: admin } = useAuth();

  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const requestedQuery = searchParams.get("q");
  const requestedCategory = searchParams.get("category");

  const [activeTab, setActiveTab] = useState<ProductTab>(
    isProductTab(requestedTab) ? requestedTab : "catalog"
  );
  const [formOpen, setFormOpen] = useState(requestedTab === "add" && admin);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
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
    if (isProductTab(requestedTab)) {
      setActiveTab(requestedTab);
    }
    if (requestedTab === "add" && admin) {
      setEditingProduct(undefined);
      setFormOpen(true);
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
    // Only needed to build the "frequently quoted together" network below.
    fetchQuotations()
      .then(setQuotations)
      .catch(() => {});
  }, []);

  const stats = useMemo(() => computeProductStats(products), [products]);

  const productNetwork = useMemo(
    () => buildProductNetwork(products, quotations),
    [products, quotations]
  );

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

  function handleSelectNetworkProduct(name: string) {
    setSearch(name);
    setActiveTab("all");
  }

  function openAddForm() {
    setEditingProduct(undefined);
    setFormOpen(true);
  }

  function openEditForm(product: Product) {
    setEditingProduct(product);
    setFormOpen(true);
  }

  async function handleFormSubmit(product: Omit<Product, "id">) {
    try {
      if (editingProduct) {
        const updated = await updateProduct(editingProduct.id, product);
        setProducts((prev) =>
          prev.map((p) => (p.id === editingProduct.id ? updated : p))
        );
        toast.success(`${updated.name} was updated`);
      } else {
        const created = await insertProduct(product);
        setProducts((prev) => [created, ...prev]);
        toast.success(`${created.name} was added to the catalog`);
      }
      setFormOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Couldn't save the product"
      );
      throw error;
    }
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader
          title="Products"
          description="Manage the product catalog available for quotations"
          actions={
            admin && (
              <Button onClick={openAddForm}>
                <PackagePlus className="size-4" />
                Add Product
              </Button>
            )
          }
        />
      </Reveal>

      <Reveal delay={0.05}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          <MetricCard
            label="Total Products"
            value={String(stats.total)}
            footnote="Across all categories"
            wave={kpiWaves.countByCategory}
            icon={Package}
            tone="neutral"
          />
          <MetricCard
            label="Active"
            value={String(stats.active)}
            footnote="Currently available for quotations"
            wave={kpiWaves.activeByCategory}
            icon={CheckCircle2}
            tone="success"
          />
          <MetricCard
            label="Categories"
            value={String(stats.categories)}
            footnote="Distinct catalog groups"
            wave={kpiWaves.avgPriceByCategory}
            icon={Tags}
            tone="cyan"
          />
          <MetricCard
            label="Avg. Price"
            value={formatUSD(stats.avgPrice)}
            footnote="Across all products"
            wave={kpiWaves.sortedPrices}
            icon={CircleDollarSign}
            tone="primary"
          />
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <InputGroup className="glass-panel filter-control sm:max-w-xs">
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
              <SelectTrigger className="glass-panel filter-control h-8 gap-1.5 px-2.5 text-xs">
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
              <SelectTrigger className="glass-panel filter-control h-8 gap-1.5 px-2.5 text-xs">
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
              <SelectTrigger className="glass-panel filter-control h-8 gap-1.5 px-2.5 text-xs">
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
            <TabsTab value="network">
              <Network className="size-[15px]" />
              Network
            </TabsTab>
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
              <ProductTable data={filtered} admin={admin} onEdit={openEditForm} />
            ) : (
              <EmptyProductsState
                hasFilters={hasActiveFilters}
                onClear={clearFilters}
              />
            )}
          </TabsPanel>

          <TabsPanel value="network">
            {loading ? (
              <Skeleton className="h-[420px] w-full rounded-2xl" />
            ) : productNetwork.nodes.length ? (
              <div className="space-y-2">
                <p className="text-sm text-text-tertiary">
                  Products frequently quoted together — drag a node, scroll to
                  zoom, hover to trace connections, click to find it below.
                </p>
                <div className="glass-panel rounded-2xl p-2 shadow-sm">
                  <ProductNetworkGraph
                    nodes={productNetwork.nodes}
                    edges={productNetwork.edges}
                    onSelectProduct={handleSelectNetworkProduct}
                  />
                </div>
              </div>
            ) : (
              <div className="glass-panel flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-foreground/[0.06] text-text-tertiary">
                  <Network className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    No product network yet
                  </p>
                  <p className="mt-1 text-xs text-text-tertiary">
                    This view fills in once products start appearing together
                    on quotations.
                  </p>
                </div>
              </div>
            )}
          </TabsPanel>
        </Tabs>
      </Reveal>

      {admin && (
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "Edit Product" : "Add Product"}
              </DialogTitle>
              <DialogDescription>
                {editingProduct
                  ? "Update this product's catalog details."
                  : "New products can be added as a Draft until they're ready to sell."}
              </DialogDescription>
            </DialogHeader>
            <ProductForm product={editingProduct} onSubmit={handleFormSubmit} />
          </DialogContent>
        </Dialog>
      )}
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
