"use client";

import { useState } from "react";
import {
  tableFeatures,
  useTable,
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFns,
} from "@tanstack/react-table";
import type { SortingState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/mock-data";
import { formatUSD } from "@/lib/format";
import {
  categoryStyles,
  fallbackCategoryStyle,
  statusLabels,
  statusStyles,
} from "@/components/products/product-styles";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
});

const columnHelper = createColumnHelper<typeof features, Product>();

const columns = columnHelper.columns([
  columnHelper.accessor("name", {
    header: "Product",
    cell: (info) => {
      const product = info.row.original;
      const categoryStyle = categoryStyles[product.category] ?? fallbackCategoryStyle;
      return (
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              categoryStyle
            )}
          >
            <Package className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {product.name}
            </p>
            <p className="truncate text-xs text-text-tertiary">{product.sku}</p>
          </div>
        </div>
      );
    },
  }),
  columnHelper.accessor("category", {
    header: "Category",
    cell: (info) => {
      const category = info.getValue();
      return (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
            categoryStyles[category] ?? fallbackCategoryStyle
          )}
        >
          {category}
        </span>
      );
    },
  }),
  columnHelper.accessor("brand", {
    header: "Brand",
    cell: (info) => (
      <span className="whitespace-nowrap text-text-secondary">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("price", {
    header: "Price",
    cell: (info) => (
      <span className="tabular-nums">{formatUSD(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: (info) => {
      const status = info.getValue();
      return (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
            statusStyles[status]
          )}
        >
          {statusLabels[status]}
        </span>
      );
    },
  }),
  columnHelper.accessor("description", {
    header: "Description",
    cell: (info) => (
      <span
        title={info.getValue()}
        className="block max-w-[320px] truncate text-text-secondary"
      >
        {info.getValue()}
      </span>
    ),
  }),
]);

export function ProductTable({ data }: { data: Product[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);

  const table = useTable({
    features,
    columns,
    data,
    state: { sorting },
    onSortingChange: setSorting,
  });

  return (
    <div className="glass-panel overflow-hidden rounded-2xl shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-glass-border">
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className="px-4 py-3.5 text-left text-xs font-medium tracking-wide text-text-tertiary uppercase first:pl-5 last:pr-5"
                    >
                      <button
                        type="button"
                        onClick={() => header.column.toggleSorting()}
                        className={cn(
                          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
                          sorted && "text-foreground"
                        )}
                      >
                        <table.FlexRender header={header} />
                        {sorted === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : sorted === "desc" ? (
                          <ArrowDown className="size-3" />
                        ) : (
                          <ChevronsUpDown className="size-3 text-text-tertiary/60" />
                        )}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-glass-border/60 transition-colors last:border-0 hover:bg-foreground/[0.03]"
              >
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3.5 first:pl-5 last:pr-5">
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
