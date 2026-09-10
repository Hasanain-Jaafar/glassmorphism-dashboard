"use client";

import { useState } from "react";
import { useTable, createColumnHelper } from "@tanstack/react-table";
import type { SortingState } from "@tanstack/react-table";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowDown,
  ArrowDownRight,
  ArrowUp,
  ArrowUpRight,
  Car,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sortableTableFeatures as features } from "@/components/tables/table-features";
import { ColumnVisibilityMenu } from "@/components/tables/column-visibility-menu";
import { usePersistedColumnVisibility } from "@/components/tables/use-persisted-column-visibility";
import { Sparkline } from "@/components/charts/sparkline";
import type { RankedTeamMember } from "@/lib/supabase/team";
import type { EducationLevel } from "@/components/providers/auth-provider";
import { formatUSD, formatPercent } from "@/lib/format";

/** Compares the second half of a trend series to the first half — sturdier
 * than comparing just the two endpoints against one noisy month. */
function trendTone(values: number[]): "success" | "danger" | "neutral" {
  const midpoint = Math.ceil(values.length / 2);
  const avg = (arr: number[]) =>
    arr.length ? arr.reduce((sum, v) => sum + v, 0) / arr.length : 0;
  const earlierAvg = avg(values.slice(0, midpoint));
  const laterAvg = avg(values.slice(midpoint));
  if (earlierAvg === 0 && laterAvg === 0) return "neutral";
  if (laterAvg > earlierAvg * 1.15) return "success";
  if (laterAvg < earlierAvg * 0.85) return "danger";
  return "neutral";
}

const roleLabels: Record<RankedTeamMember["role"], string> = {
  admin: "Administrator",
  sales_rep: "Sales Representative",
};

const educationLabels: Record<EducationLevel, string> = {
  primary_school: "Primary School",
  high_school: "High School",
  college: "College",
};

/** Columns that hold identity/free-text content — everything else centers under its header. */
const LEFT_ALIGNED_COLUMNS = new Set(["name", "email"]);

const columnHelper = createColumnHelper<typeof features, RankedTeamMember>();

const columns = columnHelper.columns([
  columnHelper.accessor("rank", {
    header: "Rank",
    enableHiding: false,
    cell: (info) => {
      const rank = info.getValue();
      return (
        <span
          className={cn(
            "inline-flex size-6 items-center justify-center rounded-full text-[11px] font-semibold",
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
    enableHiding: false,
    cell: (info) => {
      const person = info.row.original;
      return (
        <div className="flex items-center gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {person.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={person.avatarUrl}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              person.initials
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {person.name}
            </p>
            <p className="truncate text-xs text-text-tertiary">
              {roleLabels[person.role]}
            </p>
          </div>
        </div>
      );
    },
  }),
  columnHelper.accessor("yearlySales", {
    header: "Sales (Year)",
    cell: (info) => (
      <span className="tabular-nums">{formatUSD(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor("yearlyTarget", {
    header: "Target (Year)",
    cell: (info) => (
      <span className="tabular-nums text-text-secondary">
        {formatUSD(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor(
    (row) => (row.yearlyTarget ? (row.yearlySales / row.yearlyTarget) * 100 : 0),
    {
      id: "progress",
      header: "Progress",
      cell: (info) => (
        <span className="tabular-nums">
          {formatPercent(Math.min(info.getValue(), 100), 0)}
        </span>
      ),
    }
  ),
  columnHelper.accessor("closedDeals", {
    header: "Closed Deals",
    cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
  }),
  columnHelper.accessor("avgDeal", {
    header: "Avg. Deal",
    cell: (info) => (
      <span className="tabular-nums">{formatUSD(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor("conversionRate", {
    header: "Conversion",
    cell: (info) => (
      <span className="tabular-nums">
        {formatPercent(info.getValue(), 0)}
      </span>
    ),
  }),
  columnHelper.accessor("salesTrend", {
    header: "Trend",
    enableSorting: false,
    cell: (info) => {
      const trend = info.getValue();
      return (
        <Sparkline data={trend} tone={trendTone(trend)} className="mx-auto" />
      );
    },
  }),
  columnHelper.accessor((row) => row.openPipelineValue, {
    id: "pipeline",
    header: "Pipeline Coverage",
    cell: (info) => {
      const person = info.row.original;
      const remaining = Math.max(person.monthlyTarget - person.monthlySales, 0);
      const covered = remaining === 0 || person.openPipelineValue >= remaining;
      const partial = !covered && person.openPipelineValue > 0;
      return (
        <div className="flex flex-col items-center gap-1">
          <span className="tabular-nums text-sm font-medium text-foreground">
            {formatUSD(person.openPipelineValue)}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap",
              covered
                ? "bg-success/10 text-success"
                : partial
                  ? "bg-warning/10 text-warning"
                  : "bg-danger/10 text-danger"
            )}
          >
            {remaining === 0 ? "Target met" : covered ? "Covered" : partial ? "Partial" : "Short"}
          </span>
        </div>
      );
    },
  }),
  columnHelper.accessor((row) => row.activityTrend.deltaPct, {
    id: "activityTrend",
    header: "Activity Trend",
    cell: (info) => {
      const trend = info.row.original.activityTrend;
      const flat = trend.priorWeek === 0 && trend.lastWeek === 0;
      return (
        <div className="flex flex-col items-center gap-1">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
              flat
                ? "bg-foreground/[0.06] text-text-tertiary"
                : trend.declining
                  ? "bg-warning/10 text-warning"
                  : "bg-success/10 text-success"
            )}
          >
            {!flat &&
              (trend.deltaPct >= 0 ? (
                <ArrowUpRight className="size-3" />
              ) : (
                <ArrowDownRight className="size-3" />
              ))}
            {flat ? "—" : `${Math.abs(trend.deltaPct)}%`}
          </span>
          <span className="text-[10px] whitespace-nowrap text-text-tertiary">
            {trend.lastWeek} last wk
          </span>
        </div>
      );
    },
  }),
  columnHelper.accessor("stalledCount", {
    header: "Stalled",
    cell: (info) => {
      const count = info.getValue();
      return count > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-danger">
          <AlertTriangle className="size-3" />
          {count}
        </span>
      ) : (
        <span className="text-text-tertiary">—</span>
      );
    },
  }),
  columnHelper.accessor("email", {
    header: "Email",
    cell: (info) => (
      <span
        title={info.getValue()}
        className="block max-w-[210px] truncate text-text-secondary"
      >
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("totalAppointments", {
    header: "Appointments",
    cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
  }),
  columnHelper.accessor("startDate", {
    header: "Start Date",
    cell: (info) => {
      const value = info.getValue();
      return (
        <span className="tabular-nums whitespace-nowrap">
          {value ? format(new Date(value), "MMM d, yyyy") : "—"}
        </span>
      );
    },
  }),
  columnHelper.accessor("hasCar", {
    header: "Mobility",
    cell: (info) => {
      const hasCar = info.getValue();
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
            hasCar
              ? "bg-success/10 text-success"
              : "bg-foreground/[0.06] text-text-tertiary"
          )}
        >
          <Car className="size-3" />
          {hasCar ? "Car" : "No car"}
        </span>
      );
    },
  }),
  columnHelper.accessor("education", {
    header: "Education",
    cell: (info) => {
      const education = info.getValue();
      return education ? (
        <span className="inline-flex items-center rounded-full bg-foreground/[0.06] px-2 py-0.5 text-xs font-medium whitespace-nowrap text-text-secondary">
          {educationLabels[education]}
        </span>
      ) : (
        <span className="text-text-tertiary">—</span>
      );
    },
  }),
]);

export function SalespersonRankingTable({
  data,
  highlightedId,
}: {
  data: RankedTeamMember[];
  /** Row to scroll to and briefly flash — e.g. the command palette's salesperson search. */
  highlightedId?: string | null;
}) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "rank", desc: false },
  ]);
  const [columnVisibility, setColumnVisibility] = usePersistedColumnVisibility(
    "salesperson-ranking-table-columns"
  );

  const table = useTable({
    features,
    columns,
    data,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
  });

  return (
    <div className="glass-panel overflow-hidden rounded-2xl shadow-sm">
      <div className="flex justify-end border-b border-glass-border px-4 py-2.5">
        <ColumnVisibilityMenu table={table} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-glass-border">
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  const leftAligned = LEFT_ALIGNED_COLUMNS.has(header.column.id);
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "min-w-[120px] px-4 py-3.5 text-xs font-medium tracking-wide text-text-tertiary uppercase first:pl-5 last:pr-5",
                        leftAligned ? "text-left" : "text-center"
                      )}
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
                id={`salesperson-${row.original.id}`}
                className={cn(
                  "border-b border-glass-border/60 transition-colors duration-500 last:border-0 hover:bg-foreground/[0.03]",
                  highlightedId === row.original.id && "bg-primary/[0.08]"
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    className={cn(
                      "px-4 py-3.5 first:pl-5 last:pr-5",
                      LEFT_ALIGNED_COLUMNS.has(cell.column.id)
                        ? "text-left"
                        : "text-center"
                    )}
                  >
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
