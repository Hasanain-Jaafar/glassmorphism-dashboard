-- ============================================================================
-- Notifications — an in-app inbox fed by SECURITY DEFINER triggers on
-- existing tables, plus per-user preferences.
--
-- Only 3 event types are wired to a real trigger in this migration:
--   coaching_note_added, new_appointment, deal_won
-- target_reached / quotation_expiring / weekly_summary exist as enum values
-- and preference columns (so Settings has somewhere to save them) but have
-- no trigger yet — see supabase/README.md.
-- ============================================================================

create type public.notification_type as enum (
  'coaching_note_added',
  'new_appointment',
  'deal_won',
  'target_reached',
  'quotation_expiring',
  'weekly_summary'
);

-- ---------------------------------------------------------------------------
-- notification_preferences — one row per user; absence of a row means "all
-- defaults", so a user who's never opened Settings still gets notified.
-- ---------------------------------------------------------------------------

create table public.notification_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  coaching_note_added boolean not null default true,
  new_appointment boolean not null default true,
  deal_won boolean not null default true,
  target_reached boolean not null default true,
  quotation_expiring boolean not null default true,
  weekly_summary boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

grant select, insert, update on public.notification_preferences to authenticated;

alter table public.notification_preferences enable row level security;

create policy "notification_preferences_select_own" on public.notification_preferences
  for select using (user_id = auth.uid());
create policy "notification_preferences_insert_own" on public.notification_preferences
  for insert with check (user_id = auth.uid());
create policy "notification_preferences_update_own" on public.notification_preferences
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- notifications — the inbox itself. Rows are only ever written by the
-- SECURITY DEFINER trigger functions below, never by client code: there is
-- deliberately no insert/delete grant or policy for `authenticated`, since a
-- client-writable insert policy would let any signed-in user create
-- notifications addressed to anyone else.
-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index notifications_recipient_unread_idx
  on public.notifications (recipient_id) where read_at is null;

grant select, update on public.notifications to authenticated;

alter table public.notifications enable row level security;

create policy "notifications_select_own" on public.notifications
  for select using (recipient_id = auth.uid());
create policy "notifications_update_own" on public.notifications
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Trigger: coaching_notes insert → notify every other active admin.
-- Sales reps never receive this — coaching_notes_select_admin_only means
-- they couldn't read the note (or /coaching) even if notified.
-- ---------------------------------------------------------------------------

create or replace function public.notify_coaching_note_added()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid;
begin
  for admin_id in
    select p.id from public.profiles p
    where p.role = 'admin' and p.is_active and p.id is distinct from new.author_id
  loop
    if not exists (
      select 1 from public.notification_preferences np
      where np.user_id = admin_id and np.coaching_note_added = false
    ) then
      insert into public.notifications (recipient_id, type, title, body, link)
      values (
        admin_id,
        'coaching_note_added',
        'New coaching note logged',
        left(new.body, 140),
        '/coaching?person=' || new.salesperson_id::text
      );
    end if;
  end loop;
  return new;
end;
$$;

create trigger notify_on_coaching_note_insert
  after insert on public.coaching_notes
  for each row execute function public.notify_coaching_note_added();

-- ---------------------------------------------------------------------------
-- Trigger: appointments insert → notify the assigned rep.
-- ---------------------------------------------------------------------------

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
      '/team?person=' || new.sales_rep_id::text
    );
  end if;
  return new;
end;
$$;

create trigger notify_on_appointment_insert
  after insert on public.appointments
  for each row execute function public.notify_new_appointment();

-- ---------------------------------------------------------------------------
-- Trigger: deals update → notify the rep the moment status becomes 'won'.
-- ---------------------------------------------------------------------------

create or replace function public.notify_deal_won()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'won' and old.status is distinct from 'won' then
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
        '/team?person=' || new.sales_rep_id::text
      );
    end if;
  end if;
  return new;
end;
$$;

create trigger notify_on_deal_won
  after update on public.deals
  for each row execute function public.notify_deal_won();
