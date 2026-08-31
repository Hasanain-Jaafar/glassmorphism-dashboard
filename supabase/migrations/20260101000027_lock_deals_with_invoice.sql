-- Same bug as invoices (20260101000026): the previous guard only froze the
-- status column once a deal had an invoice, leaving quotation_id/amount/
-- customer_id/sales_rep_id silently editable — able to retroactively
-- change what a real invoice was actually generated against. Freeze the
-- whole business-data row instead, same approach as invoices.

create or replace function public.guard_deal_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.invoices where deal_id = old.id) and (
    new.status is distinct from old.status
    or new.quotation_id is distinct from old.quotation_id
    or new.customer_id is distinct from old.customer_id
    or new.sales_rep_id is distinct from old.sales_rep_id
    or new.amount is distinct from old.amount
    or new.closed_at is distinct from old.closed_at
  ) then
    raise exception 'A deal with an invoice is locked and cannot be changed';
  end if;
  return new;
end;
$$;
