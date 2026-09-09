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
import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CheckCircle2,
  ChevronsUpDown,
  Clock,
  Handshake,
  MoreHorizontal,
  Send,
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { isQuotationOverdue, type Quotation, type QuotationStatus } from "@/lib/supabase/quotations";
import type { Appointment } from "@/lib/supabase/appointments";
import type { Customer } from "@/lib/customers-data";
import type { TeamMember } from "@/lib/supabase/team";
import {
  quotationRejectionReasonLabels,
  quotationStatusLabels,
  quotationStatusStyles,
} from "@/components/quotations/quotation-styles";
import { formatUSD } from "@/lib/format";
import { workingDaysElapsed } from "@/lib/working-days";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
});

const columnHelper = createColumnHelper<typeof features, Quotation>();

function buildColumns(
  customersById: Map<string, Customer>,
  salespeopleById: Map<string, TeamMember>,
  appointmentsById: Map<string, Appointment>,
  dealQuotationIds: Set<string>,
  actions: {
    onEdit: (quotation: Quotation) => void;
    onStatusChange: (
      quotation: Quotation,
      status: Exclude<QuotationStatus, "rejected">
    ) => void;
    onConvertToDeal: (quotation: Quotation) => void;
    onDelete: (quotation: Quotation) => void;
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
    columnHelper.accessor("appointmentId", {
      header: "Appointment",
      cell: (info) => {
        const appointment = appointmentsById.get(info.getValue());
        if (!appointment) {
          return <span className="text-text-tertiary">—</span>;
        }
        return (
          <Link
            href={`/appointments?id=${appointment.id}`}
            className="inline-flex max-w-[180px] items-center gap-1.5 text-text-secondary transition-colors hover:text-primary hover:underline"
          >
            <CalendarClock className="size-3.5 shrink-0" />
            <span className="min-w-0 truncate">{appointment.title}</span>
          </Link>
        );
      },
    }),
    columnHelper.accessor("total", {
      header: "Total",
      cell: (info) => (
        <span className="tabular-nums">{formatUSD(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor("validUntil", {
      header: "Valid Until",
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
        const quotation = info.row.original;
        const overdue = isQuotationOverdue(quotation);
        const badge = (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
              overdue ? "bg-warning/10 text-warning" : quotationStatusStyles[status]
            )}
          >
            {overdue && <Clock className="size-3" />}
            {quotationStatusLabels[status]}
          </span>
        );
        if (!overdue || !quotation.sentAt) return badge;
        const days = workingDaysElapsed(new Date(quotation.sentAt));
        return (
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              {badge}
            </TooltipTrigger>
            <TooltipContent>
              Sent {days} working days ago — follow up
            </TooltipContent>
          </Tooltip>
        );
      },
    }),
    columnHelper.accessor("rejectionReason", {
      header: "Rejection Reason",
      cell: (info) => {
        const reason = info.getValue();
        if (!reason) {
          return <span className="text-text-tertiary">—</span>;
        }
        return (
          <span className="whitespace-nowrap text-text-secondary">
            {quotationRejectionReasonLabels[reason]}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const quotation = info.row.original;
        const hasDeal = dealQuotationIds.has(quotation.id);
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
              {quotation.status === "draft" && (
                <DropdownMenuItem
                  onClick={() => actions.onStatusChange(quotation, "sent")}
                >
                  <Send className="size-3.5" />
                  Mark Sent
                </DropdownMenuItem>
              )}
              {quotation.status === "sent" && (
                <DropdownMenuItem
                  onClick={() => actions.onStatusChange(quotation, "accepted")}
                >
                  <CheckCircle2 className="size-3.5" />
                  Accepted
                </DropdownMenuItem>
              )}
              {quotation.status === "accepted" && !hasDeal && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => actions.onConvertToDeal(quotation)}>
                    <Handshake className="size-3.5" />
                    Convert to Deal
                  </DropdownMenuItem>
                </>
              )}
              {!hasDeal && (
                <>
                  {quotation.status !== "accepted" && <DropdownMenuSeparator />}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => actions.onDelete(quotation)}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
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

export function QuotationsTable({
  data,
  customers,
  salespeople,
  appointments,
  dealQuotationIds,
  onEdit,
  onStatusChange,
  onConvertToDeal,
  onDelete,
  highlightedId,
}: {
  data: Quotation[];
  customers: Customer[];
  salespeople: TeamMember[];
  appointments: Appointment[];
  /** Quotation ids that already have a deal — those can't be deleted. */
  dealQuotationIds: Set<string>;
  onEdit: (quotation: Quotation) => void;
  onStatusChange: (
    quotation: Quotation,
    status: Exclude<QuotationStatus, "rejected">
  ) => void;
  onConvertToDeal: (quotation: Quotation) => void;
  onDelete: (quotation: Quotation) => void;
  /** Row to scroll to and briefly flash — see the `?id=` deep link handled in the page. */
  highlightedId?: string | null;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "total", desc: true },
  ]);

  const customersById = useMemo(
    () => new Map(customers.map((c) => [c.id, c])),
    [customers]
  );
  const salespeopleById = useMemo(
    () => new Map(salespeople.map((p) => [p.id, p])),
    [salespeople]
  );
  const appointmentsById = useMemo(
    () => new Map(appointments.map((a) => [a.id, a])),
    [appointments]
  );

  const columns = useMemo(
    () =>
      buildColumns(customersById, salespeopleById, appointmentsById, dealQuotationIds, {
        onEdit,
        onStatusChange,
        onConvertToDeal,
        onDelete,
      }),
    [
      customersById,
      salespeopleById,
      appointmentsById,
      dealQuotationIds,
      onEdit,
      onStatusChange,
      onConvertToDeal,
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
        <table className="w-full min-w-[1020px] text-sm">
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
                id={`quotation-${row.original.id}`}
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
