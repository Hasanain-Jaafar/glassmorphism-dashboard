import { rankingMonths } from "@/lib/mock-data";

/**
 * "Target Period" logic for the /targets page's Individual tab — the
 * month/quarter/year/custom-range period picker and target-lookup helpers.
 * Real per-rep actuals for a selection are computed separately, from real
 * invoices, by computePersonActualForMonths in lib/company-performance.ts.
 */

/** A real salesperson plus their fetched individual targets — see fetchIndividualTargets in lib/supabase/targets.ts. Sales figures are 0 until the appointments/quotations/deals/invoices workflow exists. */
export type TargetPerson = {
  id: string;
  name: string;
  role: string;
  initials: string;
  avatarUrl: string | null;
  monthlySales: number;
  monthlyTarget: number;
  yearlySales: number;
  yearlyTarget: number;
  /** Month number (1–12) → target amount. */
  monthlyTargets: Record<number, number>;
  /** Current month only — mirrors monthlyTarget above, for the edit dialog. */
  monthlyAppointmentsTarget?: number;
  yearlyAppointmentsTarget?: number;
  monthlyAppointmentsTargets?: Record<number, number>;
  monthlyDealsTarget?: number;
  yearlyDealsTarget?: number;
  monthlyDealsTargets?: Record<number, number>;
};
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

/** The most recent month the mock company timeline has data for — stands in for "today" across the app (see lib/mock-data.ts's currentYear). */
export const currentMonthLabel = rankingMonths[rankingMonths.length - 1];
export const currentMonthNumber = MONTH_NUMBERS[currentMonthLabel];

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
  person: TargetPerson,
  selection: TargetPeriodSelection
): number {
  if (selection.type === "year") return person.yearlyTarget;
  return monthsForSelection(selection).reduce((sum, month) => {
    const num = MONTH_NUMBERS[month];
    return sum + (num ? (person.monthlyTargets[num] ?? 0) : 0);
  }, 0);
}

/** companyTargetForSelection is generic over any {yearlyTarget, monthlyTargets} shape, so it doubles as the reducer for these two non-revenue metrics. */
export function personAppointmentsTargetForSelection(
  person: TargetPerson,
  selection: TargetPeriodSelection
): number {
  return companyTargetForSelection(selection, {
    yearlyTarget: person.yearlyAppointmentsTarget ?? 0,
    monthlyTargets: person.monthlyAppointmentsTargets ?? {},
  });
}

export function personDealsTargetForSelection(
  person: TargetPerson,
  selection: TargetPeriodSelection
): number {
  return companyTargetForSelection(selection, {
    yearlyTarget: person.yearlyDealsTarget ?? 0,
    monthlyTargets: person.monthlyDealsTargets ?? {},
  });
}
