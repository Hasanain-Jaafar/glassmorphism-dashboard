import {
  tableFeatures,
  createSortedRowModel,
  rowSortingFeature,
  sortFns,
  columnVisibilityFeature,
} from "@tanstack/react-table";

/**
 * Shared feature set for sortable tables that also support hide/show
 * columns via ColumnVisibilityMenu — keeping this in one place (rather than
 * redeclared per table file) is what lets ColumnVisibilityMenu type its
 * `table` prop precisely instead of falling back to `any`.
 */
export const sortableTableFeatures = tableFeatures({
  rowSortingFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
});
