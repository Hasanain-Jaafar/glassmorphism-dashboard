import { createClient } from "@/lib/supabase/client";

export type QuotationStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";

export type QuotationItem = {
  id: string;
  productId: string | null;
  quantity: number;
  unitPrice: number;
};

export type Quotation = {
  id: string;
  salesRepId: string;
  customerId: string;
  appointmentId: string;
  status: QuotationStatus;
  total: number;
  /** ISO date, or null if not set. */
  validUntil: string | null;
  items: QuotationItem[];
  createdAt: string;
};

type QuotationItemRow = {
  id: string;
  product_id: string | null;
  quantity: number;
  unit_price: number | string;
};

type QuotationRow = {
  id: string;
  sales_rep_id: string;
  customer_id: string;
  appointment_id: string;
  status: QuotationStatus;
  total: number | string;
  valid_until: string | null;
  created_at: string;
  quotation_items: QuotationItemRow[];
};

const SELECT_COLUMNS =
  "id, sales_rep_id, customer_id, appointment_id, status, total, valid_until, created_at, quotation_items(id, product_id, quantity, unit_price)";

function fromRow(row: QuotationRow): Quotation {
  return {
    id: row.id,
    salesRepId: row.sales_rep_id,
    customerId: row.customer_id,
    appointmentId: row.appointment_id,
    status: row.status,
    total: Number(row.total),
    validUntil: row.valid_until,
    items: (row.quotation_items ?? []).map((item) => ({
      id: item.id,
      productId: item.product_id,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
    })),
    createdAt: row.created_at,
  };
}

export async function fetchQuotations(): Promise<Quotation[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quotations")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export type QuotationItemInput = {
  productId: string | null;
  quantity: number;
  unitPrice: number;
};

export type QuotationInput = {
  appointmentId: string;
  status: QuotationStatus;
  validUntil: string | null;
  items: QuotationItemInput[];
};

function quotationTotal(items: QuotationItemInput[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

// Customer + Sales Rep are always derived from the linked appointment, never
// caller-supplied — this is the single choke point that keeps a quotation
// from ever pointing at a different customer/rep than its own appointment.
async function fetchAppointmentIdentity(
  supabase: ReturnType<typeof createClient>,
  appointmentId: string
): Promise<{ customerId: string; salesRepId: string }> {
  const { data, error } = await supabase
    .from("appointments")
    .select("customer_id, sales_rep_id")
    .eq("id", appointmentId)
    .single();
  if (error) throw error;
  return { customerId: data.customer_id, salesRepId: data.sales_rep_id };
}

export async function createQuotation(values: QuotationInput): Promise<Quotation> {
  const supabase = createClient();
  const { customerId, salesRepId } = await fetchAppointmentIdentity(
    supabase,
    values.appointmentId
  );
  const { data: quotation, error } = await supabase
    .from("quotations")
    .insert({
      sales_rep_id: salesRepId,
      customer_id: customerId,
      appointment_id: values.appointmentId,
      status: values.status,
      total: quotationTotal(values.items),
      valid_until: values.validUntil,
    })
    .select("id")
    .single();
  if (error) throw error;

  if (values.items.length > 0) {
    const { error: itemsError } = await supabase.from("quotation_items").insert(
      values.items.map((item) => ({
        quotation_id: quotation.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }))
    );
    if (itemsError) throw itemsError;
  }

  return fetchQuotationById(quotation.id);
}

export async function updateQuotation(
  id: string,
  values: QuotationInput
): Promise<Quotation> {
  const supabase = createClient();
  const { customerId, salesRepId } = await fetchAppointmentIdentity(
    supabase,
    values.appointmentId
  );
  const { error } = await supabase
    .from("quotations")
    .update({
      sales_rep_id: salesRepId,
      customer_id: customerId,
      appointment_id: values.appointmentId,
      status: values.status,
      total: quotationTotal(values.items),
      valid_until: values.validUntil,
    })
    .eq("id", id);
  if (error) throw error;

  // Replace all line items rather than diff them — quotations are small
  // enough (a handful of items) that this is simpler and just as correct.
  const { error: deleteError } = await supabase
    .from("quotation_items")
    .delete()
    .eq("quotation_id", id);
  if (deleteError) throw deleteError;

  if (values.items.length > 0) {
    const { error: itemsError } = await supabase.from("quotation_items").insert(
      values.items.map((item) => ({
        quotation_id: id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }))
    );
    if (itemsError) throw itemsError;
  }

  return fetchQuotationById(id);
}

export async function updateQuotationStatus(
  id: string,
  status: QuotationStatus
): Promise<Quotation> {
  const supabase = createClient();
  const { error } = await supabase
    .from("quotations")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
  return fetchQuotationById(id);
}

/** Only succeeds while no deal references this quotation (DB-enforced). */
export async function deleteQuotation(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("quotations").delete().eq("id", id);
  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "Can't delete — this quotation already has a deal linked to it."
      );
    }
    throw error;
  }
}

async function fetchQuotationById(id: string): Promise<Quotation> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("quotations")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .single();
  if (error) throw error;
  return fromRow(data);
}
