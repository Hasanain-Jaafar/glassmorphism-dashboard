"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { rankingMonths } from "@/lib/mock-data";
import {
  targetPeriodTypeOptions,
  quarterOptions,
  defaultSelectionFor,
  type QuarterValue,
  type TargetPeriodType,
  type TargetPeriodSelection,
} from "@/lib/target-period";

export function TargetPeriodSelector({
  selection,
  onChange,
}: {
  selection: TargetPeriodSelection;
  onChange: (next: TargetPeriodSelection) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        value={selection.type}
        onValueChange={(value) =>
          value && onChange(defaultSelectionFor(value as TargetPeriodType))
        }
      >
        <SelectTrigger className="glass-panel filter-control h-8 gap-1.5 px-2.5 text-xs">
          <SelectValue>
            {(value: string) =>
              targetPeriodTypeOptions.find((o) => o.value === value)?.label ?? value
            }
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="end">
          {targetPeriodTypeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selection.type === "quarter" && (
        <Select
          value={selection.quarter}
          onValueChange={(value) =>
            value && onChange({ type: "quarter", quarter: value as QuarterValue })
          }
        >
          <SelectTrigger className="glass-panel filter-control h-8 gap-1.5 px-2.5 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {quarterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {selection.type === "month" && (
        <Select
          value={selection.month}
          onValueChange={(value) => value && onChange({ type: "month", month: value })}
        >
          <SelectTrigger className="glass-panel filter-control h-8 gap-1.5 px-2.5 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {rankingMonths.map((month) => (
              <SelectItem key={month} value={month}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {selection.type === "custom" && (
        <>
          <Select
            value={selection.fromMonth}
            onValueChange={(value) =>
              value &&
              selection.type === "custom" &&
              onChange({ type: "custom", fromMonth: value, toMonth: selection.toMonth })
            }
          >
            <SelectTrigger className="glass-panel filter-control h-8 gap-1.5 px-2.5 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {rankingMonths.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-text-tertiary">to</span>
          <Select
            value={selection.toMonth}
            onValueChange={(value) =>
              value &&
              selection.type === "custom" &&
              onChange({ type: "custom", fromMonth: selection.fromMonth, toMonth: value })
            }
          >
            <SelectTrigger className="glass-panel filter-control h-8 gap-1.5 px-2.5 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {rankingMonths.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
    </div>
  );
}
