import { createClient } from "@/lib/supabase/client";

export type ProductSalesStats = {
  unitsSold: number;
  revenue: number;
};

/** product_id -> aggregated units/revenue across every paid invoice. */
export type ProductSalesTotals = Record<string, ProductSalesStats>;

/**
 * Realized sales per product — CLAUDE.md §3: revenue only counts once an
 * invoice is paid. Walks the pipeline backwards (paid invoices -> their
 * deals -> the originating quotation's line items) rather than one embedded
 * query, matching this codebase's existing preference for explicit
 * multi-step joins (see fetchDealIdentity/fetchAppointmentIdentity) over
 * PostgREST's nested-filter syntax.
 */
export async function fetchProductSalesTotals(): Promise<ProductSalesTotals> {
  const supabase = createClient();

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
