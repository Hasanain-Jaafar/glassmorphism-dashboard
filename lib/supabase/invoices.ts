import { createClient } from "@/lib/supabase/client";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export type Invoice = {
  id: string;
  dealId: string;
  salesRepId: string;
  customerId: string;
  status: InvoiceStatus;
  amount: number;
  /** ISO date, or null if not set. */
  dueDate: string | null;
  /** ISO datetime — set the moment revenue is realized (see CLAUDE.md §3). */
  paidAt: string | null;
  createdAt: string;
};

type InvoiceRow = {
  id: string;
  deal_id: string;
  sales_rep_id: string;
  customer_id: string;
  status: InvoiceStatus;
  amount: number | string;
  due_date: string | null;
  paid_at: string | null;
  created_at: string;
};

const SELECT_COLUMNS =
  "id, deal_id, sales_rep_id, customer_id, status, amount, due_date, paid_at, created_at";

function fromRow(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    dealId: row.deal_id,
    salesRepId: row.sales_rep_id,
    customerId: row.customer_id,
    status: row.status,
    amount: Number(row.amount),
    dueDate: row.due_date,
    paidAt: row.paid_at,
    createdAt: row.created_at,
  };
}

export async function fetchInvoices(): Promise<Invoice[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export type InvoiceInput = {
  dealId: string;
  status: InvoiceStatus;
  amount: number;
  dueDate: string | null;
};

// Customer + Sales Rep are always derived from the linked deal, never
// caller-supplied — this is the single choke point that keeps an invoice
// from ever pointing at a different customer/rep than its own deal.
async function fetchDealIdentity(
  supabase: ReturnType<typeof createClient>,
  dealId: string
): Promise<{ customerId: string; salesRepId: string }> {
  const { data, error } = await supabase
    .from("deals")
    .select("customer_id, sales_rep_id")
    .eq("id", dealId)
    .single();
  if (error) throw error;
  return { customerId: data.customer_id, salesRepId: data.sales_rep_id };
}

export async function createInvoice(values: InvoiceInput): Promise<Invoice> {
  const supabase = createClient();
  const { customerId, salesRepId } = await fetchDealIdentity(supabase, values.dealId);

  // The create form's status dropdown offers "Paid" like any other status
  // (not just via the edit form or the "Mark Paid" quick action) — stamp
  // paid_at on creation too. Otherwise an invoice created directly as paid
  // has status "paid" but paid_at null forever, and is silently excluded
  // from revenue (computeCustomerAggregates requires both).
  const { data, error } = await supabase
    .from("invoices")
    .insert({
      sales_rep_id: salesRepId,
      customer_id: customerId,
      deal_id: values.dealId,
      status: values.status,
      amount: values.amount,
      due_date: values.dueDate,
      paid_at: values.status === "paid" ? new Date().toISOString() : null,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateInvoice(
  id: string,
  values: InvoiceInput
): Promise<Invoice> {
  const supabase = createClient();
  const { customerId, salesRepId } = await fetchDealIdentity(supabase, values.dealId);

  // The edit form lets status be set to "paid" directly (not just via the
  // "Mark Paid" quick action) — stamp paid_at on that transition too, but
  // preserve the original timestamp if it was already paid, and clear it
  // for any non-paid status. Otherwise a paid invoice with no paid_at never
  // counts as real revenue (see deriveCustomerActivity in
  // components/customers/customer-detail-sheet.tsx).
  let paidAt: string | null = null;
  if (values.status === "paid") {
    const { data: existing, error: fetchError } = await supabase
      .from("invoices")
      .select("status, paid_at")
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;
    paidAt =
      existing.status === "paid" && existing.paid_at
        ? existing.paid_at
        : new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("invoices")
    .update({
      sales_rep_id: salesRepId,
      customer_id: customerId,
      deal_id: values.dealId,
      status: values.status,
      amount: values.amount,
      due_date: values.dueDate,
      paid_at: paidAt,
    })
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data);
}

/**
 * Only "paid" stamps paid_at — this is the moment CLAUDE.md's "revenue only
 * counts once paid" rule is satisfied. Preserves the original timestamp if
 * the invoice was already paid (e.g. re-selecting "Paid" on an already-paid
 * invoice), matching updateInvoice's guard above — a re-affirmed status
 * should never shift when revenue was actually realized.
 */
export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus
): Promise<Invoice> {
  const supabase = createClient();

  let paidAt: string | null = null;
  if (status === "paid") {
    const { data: existing, error: fetchError } = await supabase
      .from("invoices")
      .select("status, paid_at")
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;
    paidAt =
      existing.status === "paid" && existing.paid_at
        ? existing.paid_at
        : new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("invoices")
    .update({ status, paid_at: paidAt })
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data);
}
