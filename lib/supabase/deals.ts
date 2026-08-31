import { createClient } from "@/lib/supabase/client";

export type DealStatus = "open" | "won" | "lost";

export type Deal = {
  id: string;
  salesRepId: string;
  customerId: string;
  quotationId: string;
  status: DealStatus;
  amount: number;
  /** ISO datetime, or null if still open. */
  closedAt: string | null;
  createdAt: string;
};

type DealRow = {
  id: string;
  sales_rep_id: string;
  customer_id: string;
  quotation_id: string;
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
  quotationId: string;
  status: DealStatus;
  amount: number;
};

// Customer + Sales Rep are always derived from the linked quotation, never
// caller-supplied — this is the single choke point that keeps a deal from
// ever pointing at a different customer/rep than its own quotation.
async function fetchQuotationIdentity(
  supabase: ReturnType<typeof createClient>,
  quotationId: string
): Promise<{ customerId: string; salesRepId: string }> {
  const { data, error } = await supabase
    .from("quotations")
    .select("customer_id, sales_rep_id")
    .eq("id", quotationId)
    .single();
  if (error) throw error;
  return { customerId: data.customer_id, salesRepId: data.sales_rep_id };
}

export async function createDeal(values: DealInput): Promise<Deal> {
  const supabase = createClient();
  const { customerId, salesRepId } = await fetchQuotationIdentity(
    supabase,
    values.quotationId
  );

  // The create form's status dropdown offers "Won"/"Lost" like any other
  // status (not just via the edit form or the Mark Won/Lost quick actions)
  // — stamp closed_at on creation too. Otherwise a deal created directly as
  // won/lost has closed_at null forever, excluding it from a customer's
  // Total Deals timing (see computeCustomerAggregates).
  const { data, error } = await supabase
    .from("deals")
    .insert({
      sales_rep_id: salesRepId,
      customer_id: customerId,
      quotation_id: values.quotationId,
      status: values.status,
      amount: values.amount,
      closed_at: values.status !== "open" ? new Date().toISOString() : null,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateDeal(id: string, values: DealInput): Promise<Deal> {
  const supabase = createClient();
  const { customerId, salesRepId } = await fetchQuotationIdentity(
    supabase,
    values.quotationId
  );

  // The edit form lets status be set to "won"/"lost" directly (not just via
  // the Mark Won/Lost quick actions) — stamp closed_at on that transition
  // too, but preserve the original timestamp if it was already closed, and
  // clear it if reopened. Otherwise a won deal with no closed_at is silently
  // excluded from a customer's Total Deals timing (see deriveCustomerActivity
  // in components/customers/customer-detail-sheet.tsx).
  let closedAt: string | null = null;
  if (values.status !== "open") {
    const { data: existing, error: fetchError } = await supabase
      .from("deals")
      .select("status, closed_at")
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;
    closedAt =
      existing.status !== "open" && existing.closed_at
        ? existing.closed_at
        : new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("deals")
    .update({
      sales_rep_id: salesRepId,
      customer_id: customerId,
      quotation_id: values.quotationId,
      status: values.status,
      amount: values.amount,
      closed_at: closedAt,
    })
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data);
}

/**
 * Won/Lost both close the deal — closed_at records exactly when. Preserves
 * the original timestamp if the deal was already closed (e.g. re-selecting
 * "Won" on an already-won deal), matching updateDeal's guard above — a
 * re-affirmed status should never shift when a sale actually happened.
 */
export async function updateDealStatus(
  id: string,
  status: DealStatus
): Promise<Deal> {
  const supabase = createClient();

  let closedAt: string | null = null;
  if (status !== "open") {
    const { data: existing, error: fetchError } = await supabase
      .from("deals")
      .select("status, closed_at")
      .eq("id", id)
      .single();
    if (fetchError) throw fetchError;
    closedAt =
      existing.status !== "open" && existing.closed_at
        ? existing.closed_at
        : new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("deals")
    .update({ status, closed_at: closedAt })
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data);
}

/** Only succeeds while no invoice references this deal (DB-enforced). */
export async function deleteDeal(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("deals").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error("Can't delete — this deal already has an invoice linked to it.");
    }
    throw error;
  }
}
