import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/components/providers/auth-provider";
import type { Appointment, AppointmentStatus } from "@/lib/supabase/appointments";
import type { Quotation, QuotationStatus } from "@/lib/supabase/quotations";
import type { Deal, DealStatus } from "@/lib/supabase/deals";
import type { Invoice, InvoiceStatus } from "@/lib/supabase/invoices";
import type { TeamMember } from "@/lib/supabase/team";
import type { CompanyTargets } from "@/lib/supabase/targets";
import type { LeaveRequest, LeaveType, LeaveStatus } from "@/lib/supabase/leave";
import type { Customer, CustomerStatus } from "@/lib/customers-data";
import type { Product, ProductStatus } from "@/lib/mock-data";
import type { ProductSalesTotals } from "@/lib/supabase/product-sales";
import { computeActivityTrend } from "@/lib/activity-trend";

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
    .select(
      "id, full_name, email, phone, avatar_url, role, is_active, has_car, start_date, education"
    )
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
    education: p.education,
    monthlySales: 0,
    monthlyTarget: 0,
    yearlySales: 0,
    yearlyTarget: 0,
    closedDeals: 0,
    conversionRate: 0,
    avgDeal: 0,
    totalAppointments: 0,
    salesTrend: [],
    openPipelineValue: 0,
    activityTrend: computeActivityTrend([]),
    stalledCount: 0,
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

export type KnowledgeBaseDocumentContent = { title: string; content: string };

/** Admin-only via RLS — a rep's session (were it ever used here) would just get an empty array. */
export async function fetchKnowledgeBaseServer(
  supabase: ServerSupabase
): Promise<KnowledgeBaseDocumentContent[]> {
  const { data, error } = await supabase
    .from("knowledge_base_documents")
    .select("title, content")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * RLS scopes this the same way lib/supabase/leave.ts's fetchLeaveRequests
 * does: an admin sees every request, a rep sees their own (any status) plus
 * every other approved one — matches the shared "who's out" team calendar.
 */
export async function fetchLeaveRequestsServer(
  supabase: ServerSupabase
): Promise<LeaveRequest[]> {
  const { data, error } = await supabase
    .from("leave_requests")
    .select(
      "id, salesperson_id, leave_type, start_date, end_date, days, reason, status, reviewed_by, reviewed_at, review_note, created_at"
    )
    .order("start_date", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    salespersonId: row.salesperson_id,
    leaveType: row.leave_type as LeaveType,
    startDate: row.start_date,
    endDate: row.end_date,
    days: Number(row.days),
    reason: row.reason,
    status: row.status as LeaveStatus,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    reviewNote: row.review_note,
    createdAt: row.created_at,
  }));
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

/**
 * Raw customer rows only — totalSales/totalDeals/outstandingAmount/
 * lastPurchaseDate are left at 0/null here, exactly like the browser
 * version (lib/supabase/customers.ts's fetchCustomers). Callers overlay
 * real aggregates via withCustomerAggregates (lib/customers-data.ts) once
 * they've also fetched deals/invoices.
 */
export async function fetchCustomersServer(supabase: ServerSupabase): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("id, name, company, email, phone, address, status, owner_id, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    company: row.company ?? "",
    contactPerson: row.name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    address: row.address ?? "",
    status: row.status as CustomerStatus,
    assignedSalespersonId: row.owner_id ?? "",
    totalSales: 0,
    totalDeals: 0,
    outstandingAmount: 0,
    lastPurchaseDate: null,
    createdAt: row.created_at.slice(0, 10),
  }));
}

export async function fetchProductsServer(supabase: ServerSupabase): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id, name, sku, category, brand, price, status, description, delivery_time, made_in, created_at")
    .order("name");
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    sku: row.sku,
    category: row.category,
    brand: row.brand,
    price: Number(row.price),
    status: row.status as ProductStatus,
    description: row.description,
    deliveryTime: row.delivery_time,
    madeIn: row.made_in,
    createdAt: row.created_at,
  }));
}

/**
 * Same walk-the-pipeline-backwards logic as the browser version
 * (lib/supabase/product-sales.ts's fetchProductSalesTotals), duplicated
 * here for the server client rather than parametrized — matches how every
 * other fetch*Server function in this file relates to its browser
 * counterpart.
 */
export async function fetchProductSalesTotalsServer(
  supabase: ServerSupabase
): Promise<ProductSalesTotals> {
  const { data: paidInvoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("deal_id")
    .eq("status", "paid");
  if (invoicesError) throw invoicesError;

  const dealIds = [
    ...new Set((paidInvoices ?? []).map((row) => row.deal_id).filter(Boolean)),
  ];
  if (dealIds.length === 0) return {};

  const { data: wonDeals, error: dealsError } = await supabase
    .from("deals")
    .select("quotation_id")
    .in("id", dealIds)
    .eq("status", "won");
  if (dealsError) throw dealsError;

  const quotationIds = [
    ...new Set((wonDeals ?? []).map((row) => row.quotation_id).filter(Boolean)),
  ];
  if (quotationIds.length === 0) return {};

  const { data: items, error: itemsError } = await supabase
    .from("quotation_items")
    .select("product_id, quantity, unit_price")
    .in("quotation_id", quotationIds);
  if (itemsError) throw itemsError;

  const totals: ProductSalesTotals = {};
  for (const item of items ?? []) {
    if (!item.product_id) continue;
    const quantity = Number(item.quantity);
    const revenue = quantity * Number(item.unit_price);
    const existing = totals[item.product_id];
    if (existing) {
      existing.unitsSold += quantity;
      existing.revenue += revenue;
    } else {
      totals[item.product_id] = { unitsSold: quantity, revenue };
    }
  }
  return totals;
}
