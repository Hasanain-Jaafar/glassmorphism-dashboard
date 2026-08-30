-- ============================================================================
-- Wires up the 3 notification types that shipped in
-- 20260101000010_notifications.sql as preference-only placeholders:
--   target_reached, quotation_expiring, weekly_summary
--
-- target_reached fires from a trigger on `invoices` (the moment an invoice
-- becomes paid — the only event that can move a target from "not reached" to
-- "reached", since revenue only counts once paid, per CLAUDE.md §3).
-- quotation_expiring and weekly_summary are calendar-driven, not row-driven,
-- so they run off `pg_cron` instead of a table trigger.
--
-- REQUIRES pg_cron: on Supabase, enable it once via Dashboard → Database →
-- Extensions → search "pg_cron" → Enable (or run
-- `create extension if not exists pg_cron with schema extensions;` if your
-- project role allows it). Without it, this migration's `create extension`
-- line will fail and the two `cron.schedule(...)` calls at the bottom won't
-- run — the target_reached trigger still works fine on its own.
-- ============================================================================

create extension if not exists pg_cron with schema extensions;

-- ---------------------------------------------------------------------------
-- target_reached — dedup log so a rep/company doesn't get re-notified on
-- every subsequent paid invoice in a period they've already hit target in.
-- No client access: only ever written by the SECURITY DEFINER function below.
-- ---------------------------------------------------------------------------

create table public.target_achievement_notifications (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('individual', 'company')),
  period_type public.period_type not null,
  salesperson_id uuid references public.profiles (id) on delete cascade,
  year integer not null,
  month smallint,
  created_at timestamptz not null default now()
);

-- Mirrors targets_unique_scope's null-safe uniqueness pattern from
-- 20260101000001_schema.sql (salesperson_id is null for company scope, month
-- is null for yearly).
create unique index target_achievement_notifications_unique
  on public.target_achievement_notifications (
    scope,
    period_type,
    coalesce(salesperson_id, '00000000-0000-0000-0000-000000000000'::uuid),
    year,
    coalesce(month, 0)
  );

alter table public.target_achievement_notifications enable row level security;
-- No policies — this table has no legitimate client use, so RLS with zero
-- policies denies `authenticated` entirely even if it were ever granted
-- table privileges by mistake.

create or replace function public.check_target_reached()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  rep_id uuid := new.sales_rep_id;
  pay_year int;
  pay_month int;
  target_amount numeric;
  actual_amount numeric;
  inserted int;
  admin_id uuid;
begin
  -- Only the moment an invoice actually becomes paid — not every edit to an
  -- already-paid invoice.
  if new.status is distinct from 'paid' or new.paid_at is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'paid' then
    return new;
  end if;

  pay_year := extract(year from new.paid_at)::int;
  pay_month := extract(month from new.paid_at)::int;

  -- Individual monthly target.
  select amount into target_amount from public.targets
    where target_type = 'individual' and period_type = 'monthly'
      and salesperson_id = rep_id and year = pay_year and month = pay_month;
  if target_amount is not null and target_amount > 0 then
    select coalesce(sum(amount), 0) into actual_amount from public.invoices
      where sales_rep_id = rep_id and status = 'paid'
        and extract(year from paid_at)::int = pay_year
        and extract(month from paid_at)::int = pay_month;
    if actual_amount >= target_amount then
      insert into public.target_achievement_notifications (scope, period_type, salesperson_id, year, month)
      values ('individual', 'monthly', rep_id, pay_year, pay_month)
      on conflict do nothing;
      get diagnostics inserted = row_count;
      if inserted > 0 and not exists (
        select 1 from public.notification_preferences np
        where np.user_id = rep_id and np.target_reached = false
      ) then
        insert into public.notifications (recipient_id, type, title, body, link)
        values (
          rep_id, 'target_reached', 'Monthly target reached',
          'You hit your ' || trim(to_char(new.paid_at, 'Month')) || ' target.',
          '/targets?tab=individual'
        );
      end if;
    end if;
  end if;

  -- Individual yearly target.
  select amount into target_amount from public.targets
    where target_type = 'individual' and period_type = 'yearly'
      and salesperson_id = rep_id and year = pay_year;
  if target_amount is not null and target_amount > 0 then
    select coalesce(sum(amount), 0) into actual_amount from public.invoices
      where sales_rep_id = rep_id and status = 'paid'
        and extract(year from paid_at)::int = pay_year;
    if actual_amount >= target_amount then
      insert into public.target_achievement_notifications (scope, period_type, salesperson_id, year, month)
      values ('individual', 'yearly', rep_id, pay_year, null)
      on conflict do nothing;
      get diagnostics inserted = row_count;
      if inserted > 0 and not exists (
        select 1 from public.notification_preferences np
        where np.user_id = rep_id and np.target_reached = false
      ) then
        insert into public.notifications (recipient_id, type, title, body, link)
        values (
          rep_id, 'target_reached', 'Yearly target reached',
          'You hit your ' || pay_year || ' target.',
          '/targets?tab=individual'
        );
      end if;
    end if;
  end if;

  -- Company monthly target — every active admin gets notified.
  select amount into target_amount from public.targets
    where target_type = 'company' and period_type = 'monthly'
      and year = pay_year and month = pay_month;
  if target_amount is not null and target_amount > 0 then
    select coalesce(sum(amount), 0) into actual_amount from public.invoices
      where status = 'paid'
        and extract(year from paid_at)::int = pay_year
        and extract(month from paid_at)::int = pay_month;
    if actual_amount >= target_amount then
      insert into public.target_achievement_notifications (scope, period_type, salesperson_id, year, month)
      values ('company', 'monthly', null, pay_year, pay_month)
      on conflict do nothing;
      get diagnostics inserted = row_count;
      if inserted > 0 then
        for admin_id in
          select p.id from public.profiles p where p.role = 'admin' and p.is_active
        loop
          if not exists (
            select 1 from public.notification_preferences np
            where np.user_id = admin_id and np.target_reached = false
          ) then
            insert into public.notifications (recipient_id, type, title, body, link)
            values (
              admin_id, 'target_reached', 'Company monthly target reached',
              'The team hit its ' || trim(to_char(new.paid_at, 'Month')) || ' target.',
              '/targets'
            );
          end if;
        end loop;
      end if;
    end if;
  end if;

  -- Company yearly target — every active admin gets notified.
  select amount into target_amount from public.targets
    where target_type = 'company' and period_type = 'yearly' and year = pay_year;
  if target_amount is not null and target_amount > 0 then
    select coalesce(sum(amount), 0) into actual_amount from public.invoices
      where status = 'paid' and extract(year from paid_at)::int = pay_year;
    if actual_amount >= target_amount then
      insert into public.target_achievement_notifications (scope, period_type, salesperson_id, year, month)
      values ('company', 'yearly', null, pay_year, null)
      on conflict do nothing;
      get diagnostics inserted = row_count;
      if inserted > 0 then
        for admin_id in
          select p.id from public.profiles p where p.role = 'admin' and p.is_active
        loop
          if not exists (
            select 1 from public.notification_preferences np
            where np.user_id = admin_id and np.target_reached = false
          ) then
            insert into public.notifications (recipient_id, type, title, body, link)
            values (
              admin_id, 'target_reached', 'Company yearly target reached',
              'The team hit its ' || pay_year || ' target.',
              '/targets'
            );
          end if;
        end loop;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists notify_on_target_reached on public.invoices;

create trigger notify_on_target_reached
  after insert or update on public.invoices
  for each row execute function public.check_target_reached();

-- ---------------------------------------------------------------------------
-- quotation_expiring — a daily pg_cron job, since it's driven by the
-- calendar (valid_until) rather than a row change.
-- ---------------------------------------------------------------------------

alter table public.quotations
  add column if not exists expiring_notified boolean not null default false;

-- Renewing a quotation (pushing valid_until out, or re-sending it) should
-- allow a fresh "expiring soon" notification later.
create or replace function public.reset_quotation_expiring_flag()
returns trigger
language plpgsql
as $$
begin
  if new.valid_until is distinct from old.valid_until
     or (new.status = 'sent' and old.status is distinct from 'sent') then
    new.expiring_notified = false;
  end if;
  return new;
end;
$$;

drop trigger if exists reset_quotation_expiring_flag on public.quotations;

create trigger reset_quotation_expiring_flag before update on public.quotations
  for each row execute function public.reset_quotation_expiring_flag();

create or replace function public.notify_expiring_quotations()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  q record;
begin
  for q in
    select id, sales_rep_id, valid_until
    from public.quotations
    where status = 'sent'
      and valid_until is not null
      and valid_until between current_date and current_date + interval '3 days'
      and not expiring_notified
  loop
    update public.quotations set expiring_notified = true where id = q.id;

    if not exists (
      select 1 from public.notification_preferences np
      where np.user_id = q.sales_rep_id and np.quotation_expiring = false
    ) then
      insert into public.notifications (recipient_id, type, title, body, link)
      values (
        q.sales_rep_id,
        'quotation_expiring',
        'Quotation expiring soon',
        'Expires ' || to_char(q.valid_until, 'Mon DD, YYYY') || '.',
        '/quotations'
      );
    end if;
  end loop;
end;
$$;

select cron.schedule(
  'notify-expiring-quotations',
  '0 8 * * *',
  $$select public.notify_expiring_quotations();$$
);

-- ---------------------------------------------------------------------------
-- weekly_summary — a Monday-morning pg_cron job. Unlike the other 5
-- preferences, weekly_summary defaults to false (see
-- 20260101000010_notifications.sql), so a user has to explicitly opt in via
-- Settings — "no row" does NOT mean "on" for this one.
-- ---------------------------------------------------------------------------

create or replace function public.send_weekly_summaries()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  week_start timestamptz := date_trunc('week', now()) - interval '7 days';
  week_end timestamptz := date_trunc('week', now());
  rep_sales numeric;
  rep_deals int;
  company_sales numeric;
  company_deals int;
  top_rep_name text;
begin
  select coalesce(sum(amount), 0) into company_sales
    from public.invoices
    where status = 'paid' and paid_at >= week_start and paid_at < week_end;

  select count(*) into company_deals
    from public.deals
    where status = 'won' and closed_at >= week_start and closed_at < week_end;

  select p.full_name into top_rep_name
    from public.invoices i
    join public.profiles p on p.id = i.sales_rep_id
    where i.status = 'paid' and i.paid_at >= week_start and i.paid_at < week_end
    group by p.id, p.full_name
    order by sum(i.amount) desc
    limit 1;

  for rec in
    select p.id, p.role
    from public.profiles p
    join public.notification_preferences np on np.user_id = p.id
    where p.is_active and np.weekly_summary = true
  loop
    if rec.role = 'admin' then
      insert into public.notifications (recipient_id, type, title, body, link)
      values (
        rec.id,
        'weekly_summary',
        'Weekly performance summary',
        'Team closed $' || trim(to_char(company_sales, 'FM999,999,990')) ||
          ' across ' || company_deals || ' deal' || case when company_deals = 1 then '' else 's' end ||
          case when top_rep_name is not null then '. Top performer: ' || top_rep_name || '.' else '.' end,
        '/dashboard'
      );
    else
      select coalesce(sum(amount), 0) into rep_sales
        from public.invoices
        where sales_rep_id = rec.id and status = 'paid'
          and paid_at >= week_start and paid_at < week_end;

      select count(*) into rep_deals
        from public.deals
        where sales_rep_id = rec.id and status = 'won'
          and closed_at >= week_start and closed_at < week_end;

      insert into public.notifications (recipient_id, type, title, body, link)
      values (
        rec.id,
        'weekly_summary',
        'Your weekly performance summary',
        'You closed $' || trim(to_char(rep_sales, 'FM999,999,990')) ||
          ' across ' || rep_deals || ' deal' || case when rep_deals = 1 then '' else 's' end || ' last week.',
        '/team?tab=kpi'
      );
    end if;
  end loop;
end;
$$;

select cron.schedule(
  'send-weekly-summaries',
  '0 8 * * 1',
  $$select public.send_weekly_summaries();$$
);
