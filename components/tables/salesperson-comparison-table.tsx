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
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComparisonRow } from "@/lib/sales-analytics";
import { formatUSD, formatPercent } from "@/lib/format";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
});

const columnHelper = createColumnHelper<typeof features, ComparisonRow>();

const columns = columnHelper.columns([
  columnHelper.accessor("rank", {
    header: "Rank",
    cell: (info) => {
      const rank = info.getValue();
      return (
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-[11px] font-semibold",
            rank === 1
              ? "bg-primary text-primary-foreground"
              : "bg-foreground/[0.06] text-text-tertiary"
          )}
        >
          {rank}
        </span>
      );
    },
  }),
  columnHelper.accessor("name", {
    header: "Salesperson",
    cell: (info) => {
      const row = info.row.original;
      return (
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {row.initials}
          </div>
          <p className="truncate text-sm font-medium text-foreground">
            {row.name}
          </p>
        </div>
      );
    },
  }),
  columnHelper.accessor("sales", {
    header: "Sales",
    cell: (info) => (
      <span className="tabular-nums">{formatUSD(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor("target", {
    header: "Target",
    cell: (info) => (
      <span className="tabular-nums text-text-secondary">
        {formatUSD(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor("achievementPct", {
    header: "Achievement",
    cell: (info) => {
      const pct = info.getValue();
      return (
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-foreground/[0.07]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-[#8f7fff]"
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
          <span className="tabular-nums text-xs">
            {formatPercent(pct, 0)}
          </span>
        </div>
      );
    },
  }),
  columnHelper.accessor("deals", {
    header: "Deals",
    cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
  }),
  columnHelper.accessor("conversionRate", {
    header: "Conversion",
    cell: (info) => (
      <span className="tabular-nums">
        {formatPercent(info.getValue(), 0)}
      </span>
    ),
  }),
]);

export function SalespersonComparisonTable({
  data,
  highlightedId,
}: {
  data: ComparisonRow[];
  highlightedId?: string;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "rank", desc: false },
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
        <table className="w-full min-w-[760px] text-sm">
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
                className={cn(
                  "border-b border-glass-border/60 transition-colors last:border-0 hover:bg-foreground/[0.03]",
                  row.original.id === highlightedId && "bg-primary/[0.06]"
                )}
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
