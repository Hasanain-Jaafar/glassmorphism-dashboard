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
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  ChevronsUpDown,
  Eye,
  FilePenLine,
  FileText,
  MoreHorizontal,
  Receipt,
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
import { salespeople } from "@/lib/mock-data";
import type { Customer } from "@/lib/customers-data";
import { customerStatusLabels, customerStatusStyles } from "@/components/customers/customer-styles";
import { formatUSD } from "@/lib/format";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
});

const columnHelper = createColumnHelper<typeof features, Customer>();

function buildColumns(actions: {
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onQuickAction: (
    customer: Customer,
    action: "appointment" | "quotation" | "invoices"
  ) => void;
}) {
  return columnHelper.columns([
    columnHelper.accessor("company", {
      header: "Customer / Company",
      cell: (info) => {
        const customer = info.row.original;
        return (
          <button
            type="button"
            onClick={() => actions.onView(customer)}
            className="min-w-0 cursor-pointer text-left"
          >
            <p className="truncate text-sm font-medium text-foreground hover:text-primary">
              {customer.company}
            </p>
          </button>
        );
      },
    }),
    columnHelper.accessor("address", {
      header: "Address",
      cell: (info) => (
        <span
          title={info.getValue()}
          className="block max-w-[220px] truncate text-text-secondary"
        >
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("contactPerson", {
      header: "Contact Person",
      cell: (info) => (
        <span className="whitespace-nowrap text-text-secondary">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor("assignedSalespersonId", {
      header: "Assigned Salesperson",
      cell: (info) => {
        const person = salespeople.find((p) => p.id === info.getValue());
        return (
          <span className="whitespace-nowrap text-text-secondary">
            {person?.name ?? "Unassigned"}
          </span>
        );
      },
    }),
    columnHelper.accessor("totalSales", {
      header: "Total Sales",
      cell: (info) => (
        <span className="tabular-nums">{formatUSD(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor("totalDeals", {
      header: "Deals",
      cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
    }),
    columnHelper.accessor("lastPurchaseDate", {
      header: "Last Purchase",
      cell: (info) => {
        const value = info.getValue();
        return (
          <span className="whitespace-nowrap text-text-secondary">
            {value ? format(new Date(value), "MMM d, yyyy") : "—"}
          </span>
        );
      },
    }),
    columnHelper.accessor("outstandingAmount", {
      header: "Outstanding",
      cell: (info) => {
        const value = info.getValue();
        return (
          <span
            className={cn(
              "tabular-nums",
              value > 0 ? "font-medium text-warning" : "text-text-secondary"
            )}
          >
            {formatUSD(value)}
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
              customerStatusStyles[status]
            )}
          >
            {customerStatusLabels[status]}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const customer = info.row.original;
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
              <DropdownMenuItem onClick={() => actions.onView(customer)}>
                <Eye className="size-3.5" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => actions.onEdit(customer)}>
                <FilePenLine className="size-3.5" />
                Edit Customer
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => actions.onQuickAction(customer, "appointment")}
              >
                <CalendarClock className="size-3.5" />
                Create Appointment
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => actions.onQuickAction(customer, "quotation")}
              >
                <FileText className="size-3.5" />
                Create Quotation
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => actions.onQuickAction(customer, "invoices")}
              >
                <Receipt className="size-3.5" />
                View Invoices
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
  ]);
}

export function CustomersTable({
  data,
  onView,
  onEdit,
  onQuickAction,
}: {
  data: Customer[];
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onQuickAction: (
    customer: Customer,
    action: "appointment" | "quotation" | "invoices"
  ) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "totalSales", desc: true },
  ]);

  const columns = buildColumns({ onView, onEdit, onQuickAction });

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
        <table className="w-full min-w-[1260px] text-sm">
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
