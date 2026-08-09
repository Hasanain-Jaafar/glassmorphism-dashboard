import { createClient } from "@/lib/supabase/client";

export type CompanyTargets = {
  yearlyTarget: number;
  monthlyTarget: number;
};

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

export async function fetchCompanyTargets(
  year: number,
  month: number
): Promise<CompanyTargets> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("targets")
    .select("period_type, amount, month")
    .eq("target_type", "company")
    .is("salesperson_id", null)
    .eq("year", year);
  if (error) throw error;

  const yearly = data?.find((row) => row.period_type === "yearly");
  const monthly = data?.find(
    (row) => row.period_type === "monthly" && row.month === month
  );

  return {
    yearlyTarget: yearly ? Number(yearly.amount) : 0,
    monthlyTarget: monthly ? Number(monthly.amount) : 0,
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
  values: CompanyTargets
): Promise<void> {
  await upsertCompanyTarget("yearly", year, null, values.yearlyTarget);
  await upsertCompanyTarget("monthly", year, month, values.monthlyTarget);
}
