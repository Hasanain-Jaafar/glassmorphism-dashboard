import { createClient } from "@/lib/supabase/client";

export type DealStatus = "open" | "won" | "lost";

export type Deal = {
  id: string;
  salesRepId: string;
  customerId: string | null;
  quotationId: string | null;
  status: DealStatus;
  amount: number;
  /** ISO datetime, or null if still open. */
  closedAt: string | null;
  createdAt: string;
};

type DealRow = {
  id: string;
  sales_rep_id: string;
  customer_id: string | null;
  quotation_id: string | null;
  status: DealStatus;
  amount: number | string;
  closed_at: string | null;
  created_at: string;
};

const SELECT_COLUMNS =
  "id, sales_rep_id, customer_id, quotation_id, status, amount, closed_at, created_at";

function fromRow(row: DealRow): Deal {
  return {
    id: row.id,
    salesRepId: row.sales_rep_id,
    customerId: row.customer_id,
    quotationId: row.quotation_id,
    status: row.status,
    amount: Number(row.amount),
    closedAt: row.closed_at,
    createdAt: row.created_at,
  };
}

export async function fetchDeals(): Promise<Deal[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("deals")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export type DealInput = {
  salesRepId: string;
  customerId: string | null;
  quotationId: string | null;
  status: DealStatus;
  amount: number;
};

function toRow(values: DealInput) {
  return {
    sales_rep_id: values.salesRepId,
    customer_id: values.customerId,
    quotation_id: values.quotationId,
    status: values.status,
    amount: values.amount,
  };
}

export async function createDeal(values: DealInput): Promise<Deal> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("deals")
    .insert(toRow(values))
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateDeal(id: string, values: DealInput): Promise<Deal> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("deals")
    .update(toRow(values))
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data);
}

/** Won/Lost both close the deal — closed_at records exactly when. */
export async function updateDealStatus(
  id: string,
  status: DealStatus
): Promise<Deal> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("deals")
    .update({
      status,
      closed_at: status === "open" ? null : new Date().toISOString(),
    })
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data);
}
