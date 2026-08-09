import { Package } from "lucide-react";
import { formatUSD } from "@/lib/format";
import type { Product } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import {
  categoryStyles,
  fallbackCategoryStyle,
  statusLabels,
  statusStyles,
} from "@/components/products/product-styles";

export function ProductCard({ product }: { product: Product }) {
  const categoryStyle = categoryStyles[product.category] ?? fallbackCategoryStyle;

  return (
    <div className="glass-panel flex h-full flex-col rounded-2xl p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-xl",
            categoryStyle
          )}
        >
          <Package className="size-5" />
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap",
            statusStyles[product.status]
          )}
        >
          {statusLabels[product.status]}
        </span>
      </div>

      <div className="mt-4">
        <p className="text-sm font-semibold text-foreground">{product.name}</p>
        <p className="mt-0.5 truncate text-xs text-text-tertiary">
          {product.sku} · {product.brand}
        </p>
      </div>

      <p className="mt-3 line-clamp-2 flex-1 text-xs text-text-secondary">
        {product.description}
      </p>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-glass-border pt-4">
        <span
          title={product.category}
          className={cn(
            "max-w-[65%] truncate rounded-full px-2 py-0.5 text-[11px] font-medium",
            categoryStyle
          )}
        >
          {product.category}
        </span>
        <span className="shrink-0 text-base font-semibold tracking-tight text-foreground">
          {formatUSD(product.price)}
        </span>
      </div>
    </div>
  );
}
