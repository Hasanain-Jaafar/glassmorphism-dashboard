import { createClient } from "@/lib/supabase/client";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export type Invoice = {
  id: string;
  dealId: string | null;
  salesRepId: string;
  customerId: string | null;
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
  deal_id: string | null;
  sales_rep_id: string;
  customer_id: string | null;
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
  salesRepId: string;
  customerId: string | null;
  dealId: string | null;
  status: InvoiceStatus;
  amount: number;
  dueDate: string | null;
};

function toRow(values: InvoiceInput) {
  return {
    sales_rep_id: values.salesRepId,
    customer_id: values.customerId,
    deal_id: values.dealId,
    status: values.status,
    amount: values.amount,
    due_date: values.dueDate,
  };
}

export async function createInvoice(values: InvoiceInput): Promise<Invoice> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invoices")
    .insert(toRow(values))
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
  const { data, error } = await supabase
    .from("invoices")
    .update(toRow(values))
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data);
}

/** Only "paid" stamps paid_at — this is the moment CLAUDE.md's "revenue only counts once paid" rule is satisfied. */
export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus
): Promise<Invoice> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invoices")
    .update({
      status,
      paid_at: status === "paid" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data);
}
