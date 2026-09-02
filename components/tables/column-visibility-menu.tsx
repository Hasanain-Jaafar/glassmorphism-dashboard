"use client";

import type { RowData, Table } from "@tanstack/react-table";
import { ChevronDown, Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { sortableTableFeatures } from "@/components/tables/table-features";

/** "Columns" toggle for wide tables — pairs with sortableTableFeatures. */
export function ColumnVisibilityMenu<TData extends RowData>({
  table,
  className,
}: {
  table: Table<typeof sortableTableFeatures, TData>;
  /** Lets callers match this to sibling filter controls (e.g. the
   * `glass-panel filter-control h-8 ...` treatment used in page filter bars)
   * instead of the default standalone outline button. */
  className?: string;
}) {
  const columns = table.getAllLeafColumns().filter((column) => column.getCanHide());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-1.5 text-xs", className)}
          />
        }
      >
        <Columns3 className="size-3.5" />
        Columns
        <ChevronDown className="size-3.5 text-text-tertiary" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onCheckedChange={(checked) => column.toggleVisibility(!!checked)}
          >
            {typeof column.columnDef.header === "string"
              ? column.columnDef.header
              : column.id}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
