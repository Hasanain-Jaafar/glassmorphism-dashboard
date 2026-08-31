"use client";

import { useMemo, useState } from "react";
import {
  tableFeatures,
  useTable,
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFns,
} from "@tanstack/react-table";
import type { SortingState } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
  FilePenLine,
  MoreHorizontal,
  Receipt,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Deal, DealStatus } from "@/lib/supabase/deals";
import type { Customer } from "@/lib/customers-data";
import type { TeamMember } from "@/lib/supabase/team";
import { dealStatusLabels, dealStatusStyles } from "@/components/deals/deal-styles";
import { formatUSD } from "@/lib/format";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
});

const columnHelper = createColumnHelper<typeof features, Deal>();

function buildColumns(
  customersById: Map<string, Customer>,
  salespeopleById: Map<string, TeamMember>,
  invoiceDealIds: Set<string>,
  actions: {
    onEdit: (deal: Deal) => void;
    onStatusChange: (deal: Deal, status: DealStatus) => void;
    onCreateInvoice: (deal: Deal) => void;
    onDelete: (deal: Deal) => void;
  }
) {
  return columnHelper.columns([
    columnHelper.accessor("customerId", {
      header: "Customer",
      cell: (info) => {
        const customer = customersById.get(info.getValue() ?? "");
        return (
          <button
            type="button"
            onClick={() => actions.onEdit(info.row.original)}
            className="min-w-0 cursor-pointer text-left"
          >
            <p className="truncate text-sm font-medium text-foreground hover:text-primary">
              {customer?.company ?? "Unassigned"}
            </p>
          </button>
        );
      },
    }),
    columnHelper.accessor("amount", {
      header: "Amount",
      cell: (info) => (
        <span className="tabular-nums">{formatUSD(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor("closedAt", {
      header: "Closed",
      cell: (info) => {
        const value = info.getValue();
        return (
          <span className="whitespace-nowrap text-text-secondary">
            {value ? format(new Date(value), "MMM d, yyyy") : "—"}
          </span>
        );
      },
    }),
    columnHelper.accessor("salesRepId", {
      header: "Sales Rep",
      cell: (info) => {
        const person = salespeopleById.get(info.getValue());
        return (
          <span className="whitespace-nowrap text-text-secondary">
            {person?.name ?? "Unassigned"}
          </span>
        );
      },
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => {
        const status = info.getValue();
        return (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
              dealStatusStyles[status]
            )}
          >
            {dealStatusLabels[status]}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const deal = info.row.original;
        const hasInvoice = invoiceDealIds.has(deal.id);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Row actions" />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onEdit(deal)}>
                <FilePenLine className="size-3.5" />
                Edit Deal
              </DropdownMenuItem>
              {deal.status === "open" && (
                <>
                  <DropdownMenuItem
                    onClick={() => actions.onStatusChange(deal, "won")}
                  >
                    <ThumbsUp className="size-3.5" />
                    Mark Won
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => actions.onStatusChange(deal, "lost")}
                  >
                    <ThumbsDown className="size-3.5" />
                    Mark Lost
                  </DropdownMenuItem>
                </>
              )}
              {deal.status === "won" && !hasInvoice && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => actions.onCreateInvoice(deal)}>
                    <Receipt className="size-3.5" />
                    Create Invoice
                  </DropdownMenuItem>
                </>
              )}
              {!hasInvoice && (
                <>
                  {deal.status !== "won" && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => actions.onDelete(deal)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete Deal
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
  ]);
}

export function DealsTable({
  data,
  customers,
  salespeople,
  invoiceDealIds,
  onEdit,
  onStatusChange,
  onCreateInvoice,
  onDelete,
  highlightedId,
}: {
  data: Deal[];
  customers: Customer[];
  salespeople: TeamMember[];
  /** Deal ids that already have an invoice — those can't be deleted. */
  invoiceDealIds: Set<string>;
  onEdit: (deal: Deal) => void;
  onStatusChange: (deal: Deal, status: DealStatus) => void;
  onCreateInvoice: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
  /** Row to scroll to and briefly flash — see the `?id=` deep link handled in the page. */
  highlightedId?: string | null;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "amount", desc: true },
  ]);

  const customersById = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers]
  );
  const salespeopleById = useMemo(
    () => new Map(salespeople.map((p) => [p.id, p])),
    [salespeople]
  );

  const columns = useMemo(
    () =>
      buildColumns(customersById, salespeopleById, invoiceDealIds, {
        onEdit,
        onStatusChange,
        onCreateInvoice,
        onDelete,
      }),
    [
      customersById,
      salespeopleById,
      invoiceDealIds,
      onEdit,
      onStatusChange,
      onCreateInvoice,
      onDelete,
    ]
  );

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
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-glass-border">
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const sortable = header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      className="px-4 py-3.5 text-left text-xs font-medium tracking-wide text-text-tertiary uppercase first:pl-5 last:pr-5"
                    >
                      {sortable ? (
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
                      ) : (
                        <table.FlexRender header={header} />
                      )}
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
                id={`deal-${row.original.id}`}
                className={cn(
                  "border-b border-glass-border/60 transition-colors duration-500 last:border-0 hover:bg-foreground/[0.03]",
                  highlightedId === row.original.id && "bg-primary/[0.08]"
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
