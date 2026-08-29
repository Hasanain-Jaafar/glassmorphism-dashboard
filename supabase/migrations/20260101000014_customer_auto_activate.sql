-- Auto-activate a customer the moment their first deal closes won, matching
-- the promise already shown in the Add Customer dialog ("New customers
-- start as a Prospect until their first deal closes") — until now nothing
-- backed that copy; status was a purely manual admin field.
--
-- Only Prospect -> Active is automatic. Fires on insert (a deal can be
-- created directly with status "won" via the create form's status dropdown
-- — see createDeal in lib/supabase/deals.ts) and on update transitioning
-- into 'won' (not re-fired on every edit to an already-won deal). Admin-set
-- 'inactive' customers are left alone — that's a deliberate admin call, not
-- something a deal should silently override. Security definer so it can
-- update the customers row even for a rep who doesn't own that customer
-- (their deal's sales_rep_id RLS scope wouldn't otherwise cover it).

create or replace function public.activate_customer_on_deal_won()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_id is not null
     and new.status = 'won'
     and (tg_op = 'INSERT' or old.status is distinct from 'won') then
    update public.customers
    set status = 'active', updated_at = now()
    where id = new.customer_id and status = 'prospect';
  end if;
  return new;
end;
$$;

create trigger activate_customer_on_deal_won
  after insert or update on public.deals
  for each row execute function public.activate_customer_on_deal_won();
