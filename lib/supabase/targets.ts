import { createClient } from "@/lib/supabase/client";
import { MONTH_NUMBERS } from "@/lib/target-period";

export { MONTH_NUMBERS };

export type CompanyTargets = {
  yearlyTarget: number;
  /** Month number (1–12) → target amount, for whichever months have a saved row. */
  monthlyTargets: Record<number, number>;
};

/** Fetches every company target row for a year in one query, so switching between Month/Quarter/Custom periods doesn't need a refetch. */
export async function fetchCompanyTargets(year: number): Promise<CompanyTargets> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("targets")
    .select("period_type, amount, month")
    .eq("target_type", "company")
    .is("salesperson_id", null)
    .eq("year", year);
  if (error) throw error;

  const yearly = data?.find((row) => row.period_type === "yearly");
  const monthlyTargets: Record<number, number> = {};
  for (const row of data ?? []) {
    if (row.period_type === "monthly" && row.month != null) {
      monthlyTargets[row.month] = Number(row.amount);
    }
  }

  return {
    yearlyTarget: yearly ? Number(yearly.amount) : 0,
    monthlyTargets,
  };
}

async function upsertCompanyTarget(
  periodType: "yearly" | "monthly",
  year: number,
  month: number | null,
  amount: number
): Promise<void> {
  const supabase = createClient();

  let query = supabase
    .from("targets")
    .select("id")
    .eq("target_type", "company")
    .eq("period_type", periodType)
    .eq("year", year)
    .is("salesperson_id", null);
  query = month === null ? query.is("month", month) : query.eq("month", month);

  const { data: existing, error: selectError } = await query.maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    const { error } = await supabase
      .from("targets")
      .update({ amount })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("targets").insert({
      target_type: "company",
      period_type: periodType,
      year,
      month,
      amount,
    });
    if (error) throw error;
  }
}

export async function saveCompanyTargets(
  year: number,
  month: number,
  values: { yearlyTarget: number; monthlyTarget: number }
): Promise<void> {
  await upsertCompanyTarget("yearly", year, null, values.yearlyTarget);
  await upsertCompanyTarget("monthly", year, month, values.monthlyTarget);
}
