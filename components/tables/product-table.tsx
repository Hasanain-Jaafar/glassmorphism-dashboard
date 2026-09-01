"use client";

import { useMemo, useState } from "react";
import { useTable, createColumnHelper } from "@tanstack/react-table";
import type { SortingState } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { sortableTableFeatures as features } from "@/components/tables/table-features";
import { ColumnVisibilityMenu } from "@/components/tables/column-visibility-menu";
import { usePersistedColumnVisibility } from "@/components/tables/use-persisted-column-visibility";
import type { Product } from "@/lib/mock-data";
import { formatUSD } from "@/lib/format";
import {
  categoryStyles,
  fallbackCategoryStyle,
  statusLabels,
  statusStyles,
} from "@/components/products/product-styles";

const columnHelper = createColumnHelper<typeof features, Product>();

function buildColumns(admin: boolean, onEdit: (product: Product) => void) {
  return columnHelper.columns([
    columnHelper.accessor("name", {
      header: "Product",
      enableHiding: false,
      cell: (info) => {
        const product = info.row.original;
        const categoryStyle = categoryStyles[product.category] ?? fallbackCategoryStyle;
        const label = (
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {product.name}
            </p>
            <p className="truncate text-xs text-text-tertiary">{product.sku}</p>
          </div>
        );
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
            {admin ? (
              <button
                type="button"
                onClick={() => onEdit(product)}
                className="min-w-0 cursor-pointer text-left hover:[&_p:first-child]:text-primary"
              >
                {label}
              </button>
            ) : (
              label
            )}
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
}

export function ProductTable({
  data,
  admin,
  onEdit,
}: {
  data: Product[];
  admin: boolean;
  onEdit: (product: Product) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "name", desc: false },
  ]);
  const [columnVisibility, setColumnVisibility] = usePersistedColumnVisibility(
    "products-table-columns"
  );
  const columns = useMemo(() => buildColumns(admin, onEdit), [admin, onEdit]);

  const table = useTable({
    features,
    columns,
    data,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
  });

  return (
    <div className="glass-panel overflow-hidden rounded-2xl shadow-sm">
      <div className="flex justify-end border-b border-glass-border px-4 py-2.5">
        <ColumnVisibilityMenu table={table} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-glass-border">
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      className="min-w-[120px] px-4 py-3.5 text-left text-xs font-medium tracking-wide text-text-tertiary uppercase first:pl-5 last:pr-5"
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
                {row.getVisibleCells().map((cell) => (
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
