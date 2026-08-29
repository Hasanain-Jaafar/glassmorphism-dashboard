-- customers_select — a sales rep should be able to see a customer's basic
-- info whenever that customer appears on one of their OWN pipeline records
-- (appointment/quotation/deal/invoice), not only when they are the
-- customer's owner. Previously customers_select only checked owner_id, while
-- appointments/quotations/deals/invoices are scoped by sales_rep_id — two
-- different fields. If a customer is reassigned, or an admin puts a
-- different rep on an appointment/deal than the customer's current owner,
-- that rep's customer_id join returns nothing under RLS: their table rows
-- fall back to showing "Unassigned" even though customer_id is set
-- correctly on the appointment/quotation/deal/invoice row.
--
-- This only widens SELECT. Insert/update/delete stay owner-only (or admin) —
-- being on a shared pipeline record doesn't grant edit rights to someone
-- else's customer record.

drop policy "customers_select" on public.customers;

create policy "customers_select" on public.customers
  for select using (
    public.is_admin()
    or owner_id = auth.uid()
    or exists (
      select 1 from public.appointments a
      where a.customer_id = customers.id and a.sales_rep_id = auth.uid()
    )
    or exists (
      select 1 from public.quotations q
      where q.customer_id = customers.id and q.sales_rep_id = auth.uid()
    )
    or exists (
      select 1 from public.deals d
      where d.customer_id = customers.id and d.sales_rep_id = auth.uid()
    )
    or exists (
      select 1 from public.invoices i
      where i.customer_id = customers.id and i.sales_rep_id = auth.uid()
    )
  );
