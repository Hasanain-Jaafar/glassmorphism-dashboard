import { createClient } from "@/lib/supabase/client";
import { MONTH_NUMBERS } from "@/lib/target-period";

export { MONTH_NUMBERS };

export type CompanyTargets = {
  yearlyTarget: number;
  /** Month number (1–12) → target amount, for whichever months have a saved row. */
  monthlyTargets: Record<number, number>;
  /** Individual-only — never populated by fetchCompanyTargets/saveCompanyTargets. */
  yearlyAppointmentsTarget?: number;
  monthlyAppointmentsTargets?: Record<number, number>;
  yearlyDealsTarget?: number;
  monthlyDealsTargets?: Record<number, number>;
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

/**
 * Only the fields actually passed get written — `amount` on its own (the
 * Company tab's calls) never touches appointments_target/deals_target on an
 * existing row, and vice versa.
 */
type UpsertValues = {
  amount?: number;
  appointmentsTarget?: number;
  dealsTarget?: number;
};

async function upsertTarget(
  targetType: "company" | "individual",
  salespersonId: string | null,
  periodType: "yearly" | "monthly",
  year: number,
  month: number | null,
  values: UpsertValues
): Promise<void> {
  const supabase = createClient();

  let query = supabase
    .from("targets")
    .select("id")
    .eq("target_type", targetType)
    .eq("period_type", periodType)
    .eq("year", year);
  query =
    salespersonId === null
      ? query.is("salesperson_id", salespersonId)
      : query.eq("salesperson_id", salespersonId);
  query = month === null ? query.is("month", month) : query.eq("month", month);

  const { data: existing, error: selectError } = await query.maybeSingle();
  if (selectError) throw selectError;

  if (existing) {
    const updates: Record<string, number> = {};
    if (values.amount !== undefined) updates.amount = values.amount;
    if (values.appointmentsTarget !== undefined) {
      updates.appointments_target = values.appointmentsTarget;
    }
    if (values.dealsTarget !== undefined) updates.deals_target = values.dealsTarget;

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase
        .from("targets")
        .update(updates)
        .eq("id", existing.id);
      if (error) throw error;
    }
  } else {
    const { error } = await supabase.from("targets").insert({
      target_type: targetType,
      period_type: periodType,
      salesperson_id: salespersonId,
      year,
      month,
      amount: values.amount ?? 0,
      appointments_target: values.appointmentsTarget ?? null,
      deals_target: values.dealsTarget ?? null,
    });
    if (error) throw error;
  }
}

export async function saveCompanyTargets(
  year: number,
  month: number,
  values: { yearlyTarget: number; monthlyTarget: number }
): Promise<void> {
  await upsertTarget("company", null, "yearly", year, null, {
    amount: values.yearlyTarget,
  });
  await upsertTarget("company", null, "monthly", year, month, {
    amount: values.monthlyTarget,
  });
}

/** Every individual target row for a year, grouped by salesperson_id — one round trip for the whole Targets → Individual tab (and the Team page's Salesperson Comparison). */
export async function fetchIndividualTargets(
  year: number
): Promise<Record<string, CompanyTargets>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("targets")
    .select("salesperson_id, period_type, amount, month, appointments_target, deals_target")
    .eq("target_type", "individual")
    .eq("year", year);
  if (error) throw error;

  const byPerson: Record<string, CompanyTargets> = {};
  for (const row of data ?? []) {
    if (!row.salesperson_id) continue;
    const entry = (byPerson[row.salesperson_id] ??= {
      yearlyTarget: 0,
      monthlyTargets: {},
      yearlyAppointmentsTarget: 0,
      monthlyAppointmentsTargets: {},
      yearlyDealsTarget: 0,
      monthlyDealsTargets: {},
    });
    if (row.period_type === "yearly") {
      entry.yearlyTarget = Number(row.amount);
      if (row.appointments_target != null) {
        entry.yearlyAppointmentsTarget = row.appointments_target;
      }
      if (row.deals_target != null) entry.yearlyDealsTarget = row.deals_target;
    } else if (row.period_type === "monthly" && row.month != null) {
      entry.monthlyTargets[row.month] = Number(row.amount);
      if (row.appointments_target != null) {
        entry.monthlyAppointmentsTargets![row.month] = row.appointments_target;
      }
      if (row.deals_target != null) {
        entry.monthlyDealsTargets![row.month] = row.deals_target;
      }
    }
  }
  return byPerson;
}

export async function saveIndividualTarget(
  salespersonId: string,
  year: number,
  month: number,
  values: {
    yearlyTarget: number;
    monthlyTarget: number;
    yearlyAppointmentsTarget?: number;
    monthlyAppointmentsTarget?: number;
    yearlyDealsTarget?: number;
    monthlyDealsTarget?: number;
  }
): Promise<void> {
  await upsertTarget("individual", salespersonId, "yearly", year, null, {
    amount: values.yearlyTarget,
    appointmentsTarget: values.yearlyAppointmentsTarget,
    dealsTarget: values.yearlyDealsTarget,
  });
  await upsertTarget("individual", salespersonId, "monthly", year, month, {
    amount: values.monthlyTarget,
    appointmentsTarget: values.monthlyAppointmentsTarget,
    dealsTarget: values.monthlyDealsTarget,
  });
}
