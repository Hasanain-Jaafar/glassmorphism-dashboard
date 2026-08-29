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
  Ban,
  ChevronsUpDown,
  CircleDollarSign,
  FilePenLine,
  MoreHorizontal,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Invoice, InvoiceStatus } from "@/lib/supabase/invoices";
import type { Customer } from "@/lib/customers-data";
import type { TeamMember } from "@/lib/supabase/team";
import {
  invoiceStatusLabels,
  invoiceStatusStyles,
} from "@/components/invoices/invoice-styles";
import { formatUSD } from "@/lib/format";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
});

const columnHelper = createColumnHelper<typeof features, Invoice>();

function buildColumns(
  customersById: Map<string, Customer>,
  salespeopleById: Map<string, TeamMember>,
  actions: {
    onEdit: (invoice: Invoice) => void;
    onStatusChange: (invoice: Invoice, status: InvoiceStatus) => void;
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
    columnHelper.accessor("dueDate", {
      header: "Due Date",
      cell: (info) => {
        const value = info.getValue();
        return (
          <span className="whitespace-nowrap text-text-secondary">
            {value ? format(new Date(value), "MMM d, yyyy") : "—"}
          </span>
        );
      },
    }),
    columnHelper.accessor("paidAt", {
      header: "Paid",
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
              invoiceStatusStyles[status]
            )}
          >
            {invoiceStatusLabels[status]}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const invoice = info.row.original;
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
              <DropdownMenuItem onClick={() => actions.onEdit(invoice)}>
                <FilePenLine className="size-3.5" />
                Edit Invoice
              </DropdownMenuItem>
              {invoice.status === "draft" && (
                <DropdownMenuItem
                  onClick={() => actions.onStatusChange(invoice, "sent")}
                >
                  <Send className="size-3.5" />
                  Mark Sent
                </DropdownMenuItem>
              )}
              {(invoice.status === "sent" || invoice.status === "overdue") && (
                <DropdownMenuItem
                  onClick={() => actions.onStatusChange(invoice, "paid")}
                >
                  <CircleDollarSign className="size-3.5" />
                  Mark Paid
                </DropdownMenuItem>
              )}
              {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                <DropdownMenuItem
                  onClick={() => actions.onStatusChange(invoice, "cancelled")}
                >
                  <Ban className="size-3.5" />
                  Cancel
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }),
  ]);
}

export function InvoicesTable({
  data,
  customers,
  salespeople,
  onEdit,
  onStatusChange,
}: {
  data: Invoice[];
  customers: Customer[];
  salespeople: TeamMember[];
  onEdit: (invoice: Invoice) => void;
  onStatusChange: (invoice: Invoice, status: InvoiceStatus) => void;
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
    () => buildColumns(customersById, salespeopleById, { onEdit, onStatusChange }),
    [customersById, salespeopleById, onEdit, onStatusChange]
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
        <table className="w-full min-w-[900px] text-sm">
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
