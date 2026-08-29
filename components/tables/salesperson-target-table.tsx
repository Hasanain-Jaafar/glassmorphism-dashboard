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
import { EditTargetDialog } from "@/components/sales/edit-target-dialog";
import {
  personActualForSelection,
  personTargetForSelection,
  type TargetPeriodSelection,
  type TargetPerson,
} from "@/lib/target-period";
import {
  getTargetStatus,
  targetStatusDot,
  targetStatusLabels,
  targetStatusStyles,
} from "@/lib/target-status";
import { formatUSD, formatPercent } from "@/lib/format";

type TargetRow = {
  id: string;
  name: string;
  initials: string;
  role: string;
  target: number;
  actual: number;
  achievementPct: number;
  remaining: number;
};

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns,
});

const columnHelper = createColumnHelper<typeof features, TargetRow>();

function buildColumns(people: TargetPerson[], onSave: (id: string, values: { monthlyTarget: number; yearlyTarget: number }) => void) {
  return columnHelper.columns([
    columnHelper.accessor("name", {
      header: "Salesperson",
      cell: (info) => {
        const row = info.row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
              {row.initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {row.name}
              </p>
              <p className="truncate text-xs text-text-tertiary">{row.role}</p>
            </div>
          </div>
        );
      },
    }),
    columnHelper.accessor("target", {
      header: "Target",
      cell: (info) => (
        <span className="tabular-nums">{formatUSD(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor("actual", {
      header: "Actual",
      cell: (info) => (
        <span className="tabular-nums">{formatUSD(info.getValue())}</span>
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
            <span className="tabular-nums text-xs">{formatPercent(pct, 0)}</span>
          </div>
        );
      },
    }),
    columnHelper.accessor("remaining", {
      header: "Remaining",
      cell: (info) => {
        const value = info.getValue();
        return (
          <span
            className={cn(
              "tabular-nums",
              value > 0 ? "text-text-secondary" : "font-medium text-success"
            )}
          >
            {value > 0 ? formatUSD(value) : "Target met"}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: "status",
      header: "Status",
      cell: (info) => {
        const status = getTargetStatus(info.row.original.achievementPct);
        return (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
              targetStatusStyles[status]
            )}
          >
            <span className={cn("size-1.5 rounded-full", targetStatusDot[status])} />
            {targetStatusLabels[status]}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: "actions",
      header: "",
      cell: (info) => {
        const person = people.find((p) => p.id === info.row.original.id);
        if (!person) return null;
        return (
          <EditTargetDialog
            title={`Edit ${person.name}'s Targets`}
            description="Update the monthly and yearly sales target for this representative."
            monthlyTarget={person.monthlyTarget}
            yearlyTarget={person.yearlyTarget}
            onSave={(values) => onSave(person.id, values)}
          />
        );
      },
    }),
  ]);
}

export function SalespersonTargetTable({
  people,
  selection,
  onSave,
}: {
  people: TargetPerson[];
  selection: TargetPeriodSelection;
  onSave: (id: string, values: { monthlyTarget: number; yearlyTarget: number }) => void;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "target", desc: true },
  ]);

  const data: TargetRow[] = people.map((person) => {
    const target = personTargetForSelection(person, selection);
    const actual = personActualForSelection();
    return {
      id: person.id,
      name: person.name,
      initials: person.initials,
      role: person.role,
      target,
      actual,
      achievementPct: target ? (actual / target) * 100 : 0,
      remaining: Math.max(target - actual, 0),
    };
  });

  const columns = buildColumns(people, onSave);

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
