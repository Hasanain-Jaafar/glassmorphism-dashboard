-- Same bug as deals (20260101000027) and invoices (20260101000026): the
-- previous guard only froze the status column once a quotation had a deal,
-- leaving appointment_id/total/valid_until/customer_id/sales_rep_id — and,
-- worse, the entire quotation_items line-item table — silently editable
-- after a deal was already generated against this quotation's total.
--
-- lib/supabase/quotations.ts's updateQuotation() always updates the
-- `quotations` row first and throws (stopping) before ever touching
-- quotation_items if that fails, so locking the parent row alone already
-- protects items from the app. The quotation_items trigger below closes
-- the same gap for anything that writes directly against the DB.

create or replace function public.guard_quotation_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.deals where quotation_id = old.id) and (
    new.status is distinct from old.status
    or new.appointment_id is distinct from old.appointment_id
    or new.customer_id is distinct from old.customer_id
    or new.sales_rep_id is distinct from old.sales_rep_id
    or new.valid_until is distinct from old.valid_until
    or new.total is distinct from old.total
  ) then
    raise exception 'A quotation with a deal is locked and cannot be changed';
  end if;
  return new;
end;
$$;

create or replace function public.guard_quotation_items_when_locked()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_quotation_id uuid := coalesce(new.quotation_id, old.quotation_id);
begin
  if exists (select 1 from public.deals where quotation_id = target_quotation_id) then
    raise exception 'Cannot change line items of a quotation that already has a deal';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger quotation_items_guard_when_locked
  before insert or update or delete on public.quotation_items
  for each row execute function public.guard_quotation_items_when_locked();
