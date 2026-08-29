-- Two fixes to the notification triggers from
-- 20260101000010_notifications.sql:
--
-- 1. Both notify_new_appointment() and notify_deal_won() linked to
--    '/team?person=<rep id>' — the Team overview page, highlighting the
--    rep's card. That's not "the place it notifies about": clicking a "New
--    appointment" notification should open that appointment, and clicking
--    "Deal won" should open that deal. Point them at
--    /appointments?id=<appointment id> and /deals?id=<deal id> instead,
--    which the Appointments/Deals pages now handle by scrolling to and
--    briefly flashing that exact row (see the `?id=` deep link in
--    app/(dashboard)/appointments/page.tsx and app/(dashboard)/deals/page.tsx).
--
-- 2. notify_on_deal_won only fired `after update`, so a deal created
--    directly with status "won" (the create form's status dropdown allows
--    this — see createDeal in lib/supabase/deals.ts) never notified anyone:
--    there's no "flip" for an update-only trigger to catch, since the row
--    is born already won. Fire on insert too, same as
--    activate_customer_on_deal_won in 20260101000014_customer_auto_activate.sql.
--
-- Both `create or replace function` and `drop trigger if exists` make this
-- safe to run even if 20260101000010 was already applied.

create or replace function public.notify_new_appointment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.notification_preferences np
    where np.user_id = new.sales_rep_id and np.new_appointment = false
  ) then
    insert into public.notifications (recipient_id, type, title, body, link)
    values (
      new.sales_rep_id,
      'new_appointment',
      'New appointment scheduled',
      new.title,
      '/appointments?id=' || new.id::text
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_deal_won()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'won' and (tg_op = 'INSERT' or old.status is distinct from 'won') then
    if not exists (
      select 1 from public.notification_preferences np
      where np.user_id = new.sales_rep_id and np.deal_won = false
    ) then
      insert into public.notifications (recipient_id, type, title, body, link)
      values (
        new.sales_rep_id,
        'deal_won',
        'Deal won',
        'A quotation converted into a closed deal.',
        '/deals?id=' || new.id::text
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_on_deal_won on public.deals;

create trigger notify_on_deal_won
  after insert or update on public.deals
  for each row execute function public.notify_deal_won();
