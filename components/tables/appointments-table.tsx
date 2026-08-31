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
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/lib/supabase/appointments";
import type { Customer } from "@/lib/customers-data";
import type { TeamMember } from "@/lib/supabase/team";
import {
  appointmentStatusLabels,
  appointmentStatusStyles,
} from "@/components/appointments/appointment-styles";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
});

const columnHelper = createColumnHelper<typeof features, Appointment>();

function buildColumns(
  customersById: Map<string, Customer>,
  salespeopleById: Map<string, TeamMember>,
  actions: {
    onEdit: (appointment: Appointment) => void;
  }
) {
  return columnHelper.columns([
    columnHelper.accessor("title", {
      header: "Title",
      cell: (info) => (
        <button
          type="button"
          onClick={() => actions.onEdit(info.row.original)}
          className="min-w-0 cursor-pointer text-left"
        >
          <p className="truncate text-sm font-medium text-foreground hover:text-primary">
            {info.getValue()}
          </p>
        </button>
      ),
    }),
    columnHelper.accessor("customerId", {
      header: "Customer",
      cell: (info) => {
        const customer = customersById.get(info.getValue() ?? "");
        return (
          <span className="whitespace-nowrap text-text-secondary">
            {customer?.company ?? "Unassigned"}
          </span>
        );
      },
    }),
    columnHelper.accessor("scheduledAt", {
      header: "Scheduled",
      cell: (info) => (
        <span className="whitespace-nowrap text-text-secondary">
          {format(new Date(info.getValue()), "MMM d, yyyy 'at' h:mm a")}
        </span>
      ),
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
              appointmentStatusStyles[status]
            )}
          >
            {appointmentStatusLabels[status]}
          </span>
        );
      },
    }),
  ]);
}

export function AppointmentsTable({
  data,
  customers,
  salespeople,
  onEdit,
  highlightedId,
}: {
  data: Appointment[];
  customers: Customer[];
  salespeople: TeamMember[];
  onEdit: (appointment: Appointment) => void;
  /** Row to scroll to and briefly flash — see the `?id=` deep link handled in the page. */
  highlightedId?: string | null;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "scheduledAt", desc: true },
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
    () => buildColumns(customersById, salespeopleById, { onEdit }),
    [customersById, salespeopleById, onEdit]
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
                id={`appointment-${row.original.id}`}
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
