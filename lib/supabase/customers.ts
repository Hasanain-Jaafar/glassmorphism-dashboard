import { createClient } from "@/lib/supabase/client";
import type { Customer, CustomerStatus } from "@/lib/customers-data";

type CustomerRow = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  status: CustomerStatus;
  owner_id: string | null;
  created_at: string;
};

const SELECT_COLUMNS =
  "id, name, company, email, phone, address, status, owner_id, created_at";

/**
 * Real Supabase customers, mapped onto the richer mock-era `Customer` shape
 * (see lib/customers-data.ts). Revenue/deals/outstanding/last-purchase live
 * on separate appointments/quotations/deals/invoices rows, not on this table,
 * so they're left at 0 here — callers overlay real values via
 * `withCustomerAggregates` (lib/customers-data.ts) once they've fetched the
 * pipeline tables. See app/(dashboard)/customers/page.tsx and
 * components/customers/customer-pulse.tsx for the two current call sites.
 */
function fromRow(row: CustomerRow): Customer {
  return {
    id: row.id,
    company: row.company ?? "",
    contactPerson: row.name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    address: row.address ?? "",
    status: row.status,
    assignedSalespersonId: row.owner_id ?? "",
    totalSales: 0,
    totalDeals: 0,
    outstandingAmount: 0,
    lastPurchaseDate: null,
    createdAt: row.created_at.slice(0, 10),
  };
}

export async function fetchCustomers(): Promise<Customer[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .select(SELECT_COLUMNS)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(fromRow);
}

export type CustomerInput = {
  company: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  status: CustomerStatus;
  assignedSalespersonId: string;
};

function toRow(values: CustomerInput) {
  return {
    name: values.contactPerson,
    company: values.company,
    email: values.email,
    phone: values.phone,
    address: values.address,
    status: values.status,
    owner_id: values.assignedSalespersonId,
  };
}

export async function createCustomer(values: CustomerInput): Promise<Customer> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert(toRow(values))
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data);
}

export async function updateCustomer(
  id: string,
  values: CustomerInput
): Promise<Customer> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .update(toRow(values))
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return fromRow(data);
}

/**
 * Live-updates the customers list across every admin session with
 * /customers open — one admin's add/edit/delete reaches everyone else
 * without a manual refresh, via Supabase Realtime (see migration 12,
 * `alter publication supabase_realtime add table customers`). Returns an
 * unsubscribe function to call on unmount.
 */
export function subscribeToCustomers(handlers: {
  onInsert: (customer: Customer) => void;
  onUpdate: (customer: Customer) => void;
  onDelete: (id: string) => void;
}): () => void {
  const supabase = createClient();
  const channel = supabase
    .channel("customers-changes")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "customers" },
      (payload) => handlers.onInsert(fromRow(payload.new as CustomerRow))
    )
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "customers" },
      (payload) => handlers.onUpdate(fromRow(payload.new as CustomerRow))
    )
    .on(
      "postgres_changes",
      { event: "DELETE", schema: "public", table: "customers" },
      (payload) => handlers.onDelete((payload.old as { id: string }).id)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
