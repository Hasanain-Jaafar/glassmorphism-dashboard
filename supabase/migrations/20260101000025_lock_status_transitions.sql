-- Once a record has spawned a real child, its status is finalized:
--   - a quotation with any deal can never change status again
--   - a deal with any invoice can never change status again
--   - a paid invoice can never change status again
-- This closes a gap where the row-action quick actions were correctly
-- gated by current status, but the full Edit dialog's status dropdown
-- let you silently move a quotation/deal backward after a child already
-- existed, or un-pay an invoice whose revenue was already recognized.
-- security definer + explicit search_path matches the existing
-- activate_customer_on_deal_won() convention (20260101000014).

create or replace function public.guard_quotation_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and exists (select 1 from public.deals where quotation_id = old.id)
  then
    raise exception 'Cannot change the status of a quotation that already has a deal';
  end if;
  return new;
end;
$$;

create trigger quotations_guard_status_change
  before update on public.quotations
  for each row execute function public.guard_quotation_status_change();

create or replace function public.guard_deal_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status
     and exists (select 1 from public.invoices where deal_id = old.id)
  then
    raise exception 'Cannot change the status of a deal that already has an invoice';
  end if;
  return new;
end;
$$;

create trigger deals_guard_status_change
  before update on public.deals
  for each row execute function public.guard_deal_status_change();

create or replace function public.guard_invoice_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'paid' and new.status is distinct from old.status then
    raise exception 'Cannot change the status of a paid invoice';
  end if;
  return new;
end;
$$;

create trigger invoices_guard_status_change
  before update on public.invoices
  for each row execute function public.guard_invoice_status_change();
