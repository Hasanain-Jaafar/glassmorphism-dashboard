import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/components/providers/auth-provider";
import type { Appointment, AppointmentStatus } from "@/lib/supabase/appointments";
import type { Quotation, QuotationStatus } from "@/lib/supabase/quotations";
import type { Deal, DealStatus } from "@/lib/supabase/deals";
import type { Invoice, InvoiceStatus } from "@/lib/supabase/invoices";
import type { TeamMember } from "@/lib/supabase/team";
import type { CompanyTargets } from "@/lib/supabase/targets";

/**
 * Read-only, server-scoped counterparts to lib/supabase/*.ts's fetch
 * functions. Those all hardcode the browser client (@/lib/supabase/client),
 * which reads cookies via `document` and can't run in a Route Handler — these
 * take the request-scoped server client instead (lib/supabase/server.ts),
 * so RLS still restricts a sales rep to their own rows and lets an admin see
 * everything, exactly like the pages that use the browser versions.
 */
export type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

function initialsFromName(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export async function fetchAppointmentsServer(
  supabase: ServerSupabase
): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, sales_rep_id, customer_id, title, scheduled_at, status, notes, created_at")
    .order("scheduled_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    salesRepId: row.sales_rep_id,
    customerId: row.customer_id,
    title: row.title,
    scheduledAt: row.scheduled_at,
    status: row.status as AppointmentStatus,
    notes: row.notes ?? "",
    createdAt: row.created_at,
  }));
}

export async function fetchQuotationsServer(
  supabase: ServerSupabase
): Promise<Pick<Quotation, "id" | "salesRepId" | "status" | "total" | "createdAt">[]> {
  const { data, error } = await supabase
    .from("quotations")
    .select("id, sales_rep_id, status, total, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    salesRepId: row.sales_rep_id,
    status: row.status as QuotationStatus,
    total: Number(row.total),
    createdAt: row.created_at,
  }));
}

export async function fetchDealsServer(supabase: ServerSupabase): Promise<Deal[]> {
  const { data, error } = await supabase
    .from("deals")
    .select("id, sales_rep_id, customer_id, quotation_id, status, amount, closed_at, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    salesRepId: row.sales_rep_id,
    customerId: row.customer_id,
    quotationId: row.quotation_id,
    status: row.status as DealStatus,
    amount: Number(row.amount),
    closedAt: row.closed_at,
    createdAt: row.created_at,
  }));
}

export async function fetchInvoicesServer(supabase: ServerSupabase): Promise<Invoice[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, deal_id, sales_rep_id, customer_id, status, amount, due_date, paid_at, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    dealId: row.deal_id,
    salesRepId: row.sales_rep_id,
    customerId: row.customer_id,
    status: row.status as InvoiceStatus,
    amount: Number(row.amount),
    dueDate: row.due_date,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  }));
}

/**
 * Active accounts visible to the caller — for a sales rep, RLS's
 * `profiles_select` policy (id = auth.uid() or is_admin()) collapses this to
 * just their own row, so ranking/team tools naturally degrade to "just you".
 */
export async function fetchTeamMembersServer(supabase: ServerSupabase): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, avatar_url, role, is_active, has_car, start_date")
    .eq("is_active", true)
    .order("full_name");
  if (error) throw error;
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.full_name,
    role: p.role as UserRole,
    initials: initialsFromName(p.full_name),
    avatarUrl: p.avatar_url,
    email: p.email,
    phone: p.phone,
    hasCar: p.has_car,
    startDate: p.start_date,
    monthlySales: 0,
    monthlyTarget: 0,
    yearlySales: 0,
    yearlyTarget: 0,
    closedDeals: 0,
    conversionRate: 0,
    avgDeal: 0,
    totalAppointments: 0,
  }));
}

export async function fetchCompanyTargetsServer(
  supabase: ServerSupabase,
  year: number
): Promise<CompanyTargets> {
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
  return { yearlyTarget: yearly ? Number(yearly.amount) : 0, monthlyTargets };
}

/** RLS scopes this to the caller's own rows for a rep, everyone's for an admin. */
export async function fetchIndividualTargetsServer(
  supabase: ServerSupabase,
  year: number
): Promise<Record<string, CompanyTargets>> {
  const { data, error } = await supabase
    .from("targets")
    .select("salesperson_id, period_type, amount, month")
    .eq("target_type", "individual")
    .eq("year", year);
  if (error) throw error;

  const byPerson: Record<string, CompanyTargets> = {};
  for (const row of data ?? []) {
    if (!row.salesperson_id) continue;
    const entry = (byPerson[row.salesperson_id] ??= { yearlyTarget: 0, monthlyTargets: {} });
    if (row.period_type === "yearly") {
      entry.yearlyTarget = Number(row.amount);
    } else if (row.period_type === "monthly" && row.month != null) {
      entry.monthlyTargets[row.month] = Number(row.amount);
    }
  }
  return byPerson;
}
