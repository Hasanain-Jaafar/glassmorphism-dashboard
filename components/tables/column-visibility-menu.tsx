"use client";

import type { RowData, Table } from "@tanstack/react-table";
import { ChevronDown, Columns3 } from "lucide-react";
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
}: {
  table: Table<typeof sortableTableFeatures, TData>;
}) {
  const columns = table.getAllLeafColumns().filter((column) => column.getCanHide());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="outline" size="sm" className="gap-1.5 text-xs" />}
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
