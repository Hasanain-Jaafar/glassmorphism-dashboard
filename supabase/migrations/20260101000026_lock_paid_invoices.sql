-- A paid invoice is revenue already recognized (CLAUDE.md: "realized sales
-- revenue only when the invoice is paid") — the previous guard only froze
-- the status column, leaving amount/deal_id/due_date silently editable
-- after payment. Freeze the whole business-data row instead. Compares
-- specific columns rather than the full row so it doesn't depend on
-- trigger firing order against set_updated_at (created_at/updated_at are
-- deliberately excluded).

create or replace function public.guard_invoice_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'paid' and (
    new.status is distinct from old.status
    or new.deal_id is distinct from old.deal_id
    or new.customer_id is distinct from old.customer_id
    or new.sales_rep_id is distinct from old.sales_rep_id
    or new.amount is distinct from old.amount
    or new.due_date is distinct from old.due_date
    or new.paid_at is distinct from old.paid_at
  ) then
    raise exception 'A paid invoice is locked and cannot be changed';
  end if;
  return new;
end;
$$;
