import {
  rankingMonths,
  companyMonthlyTotal,
  companyYearlyTotal,
  salesForPeriod,
  type Salesperson,
} from "@/lib/mock-data";
import { seasonalTarget } from "@/lib/sales-analytics";

/**
 * "Target Period" logic for the /targets page's Individual tab. Company and
 * per-person actuals still come from the mock revenueSeries/seasonal curve
 * (see lib/sales-analytics.ts's doc comment) — real per-month history only
 * exists for company targets in Supabase, not company/rep actual sales yet.
 */
export type TargetPeriodType = "year" | "quarter" | "month" | "custom";

export const targetPeriodTypeOptions: { value: TargetPeriodType; label: string }[] = [
  { value: "year", label: "Year" },
  { value: "quarter", label: "Quarter" },
  { value: "month", label: "Month" },
  { value: "custom", label: "Custom" },
];

export const MONTH_NUMBERS: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

const fullYearMonths = Object.keys(MONTH_NUMBERS);

export type QuarterValue = "Q1" | "Q2" | "Q3" | "Q4";

export type QuarterOption = {
  value: QuarterValue;
  label: string;
  /** Only the months within this quarter that data actually exists for (YTD). */
  months: string[];
};

/** Quarters are dropped entirely once no month in them has data yet (YTD). */
export const quarterOptions: QuarterOption[] = (
  ["Q1", "Q2", "Q3", "Q4"] as const
)
  .map((quarter, i) => {
    const all = fullYearMonths.slice(i * 3, i * 3 + 3);
    const months = all.filter((m) => rankingMonths.includes(m));
    return { value: quarter, label: `${quarter} (${all[0]}–${all[2]})`, months };
  })
  .filter((q) => q.months.length > 0);

export type TargetPeriodSelection =
  | { type: "year" }
  | { type: "quarter"; quarter: QuarterValue }
  | { type: "month"; month: string }
  | { type: "custom"; fromMonth: string; toMonth: string };

export function defaultSelectionFor(type: TargetPeriodType): TargetPeriodSelection {
  switch (type) {
    case "year":
      return { type: "year" };
    case "quarter":
      return {
        type: "quarter",
        quarter: quarterOptions[quarterOptions.length - 1]?.value ?? "Q1",
      };
    case "month":
      return { type: "month", month: rankingMonths[rankingMonths.length - 1] };
    case "custom":
      return {
        type: "custom",
        fromMonth: rankingMonths[0],
        toMonth: rankingMonths[rankingMonths.length - 1],
      };
  }
}

/** The month labels a selection covers — empty array for "year" (handled as a whole-year total instead). */
export function monthsForSelection(selection: TargetPeriodSelection): string[] {
  switch (selection.type) {
    case "quarter":
      return quarterOptions.find((q) => q.value === selection.quarter)?.months ?? [];
    case "month":
      return [selection.month];
    case "custom": {
      const fromIdx = rankingMonths.indexOf(selection.fromMonth);
      const toIdx = rankingMonths.indexOf(selection.toMonth);
      if (fromIdx === -1 || toIdx === -1 || fromIdx > toIdx) return [];
      return rankingMonths.slice(fromIdx, toIdx + 1);
    }
    default:
      return [];
  }
}

export function periodLabel(selection: TargetPeriodSelection): string {
  switch (selection.type) {
    case "year":
      return "Full Year";
    case "quarter":
      return quarterOptions.find((q) => q.value === selection.quarter)?.label ?? selection.quarter;
    case "month":
      return selection.month;
    case "custom":
      return selection.fromMonth === selection.toMonth
        ? selection.fromMonth
        : `${selection.fromMonth} – ${selection.toMonth}`;
  }
}

export function companyActualForSelection(
  selection: TargetPeriodSelection,
  year: number
): number {
  if (selection.type === "year") return companyYearlyTotal(year);
  return monthsForSelection(selection).reduce(
    (sum, month) => sum + companyMonthlyTotal(month),
    0
  );
}

export function companyTargetForSelection(
  selection: TargetPeriodSelection,
  targets: { yearlyTarget: number; monthlyTargets: Record<number, number> }
): number {
  if (selection.type === "year") return targets.yearlyTarget;
  return monthsForSelection(selection).reduce((sum, month) => {
    const num = MONTH_NUMBERS[month];
    return sum + (num ? (targets.monthlyTargets[num] ?? 0) : 0);
  }, 0);
}

export function personTargetForSelection(
  person: Salesperson,
  selection: TargetPeriodSelection
): number {
  if (selection.type === "year") return person.yearlyTarget;
  return monthsForSelection(selection).reduce(
    (sum, month) => sum + seasonalTarget(person.monthlyTarget, month),
    0
  );
}

export function personActualForSelection(
  person: Salesperson,
  selection: TargetPeriodSelection,
  year: number
): number {
  if (selection.type === "year") return person.yearlySales;
  return monthsForSelection(selection).reduce(
    (sum, month) => sum + salesForPeriod(person, year, month),
    0
  );
}
