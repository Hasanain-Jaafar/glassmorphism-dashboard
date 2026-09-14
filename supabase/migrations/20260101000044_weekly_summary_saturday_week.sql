-- ============================================================================
-- Weekly performance summary moves from a Monday/Mon-Sun window to a
-- Saturday-Friday window delivered Sunday morning — aligns the report with a
-- Sun-Thu work week (Fri-Sat weekend) instead of a Mon-Sun one. Also points
-- the notification at the new /reports/weekly report page (with the week's
-- Saturday as the `week` query param) instead of /dashboard, since the
-- notification body alone is no longer the whole story — see
-- lib/weekly-report.ts for the page-side math that has to stay in sync with
-- the week-boundary formula below.
-- ============================================================================

create or replace function public.send_weekly_summaries()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  rec record;
  -- Saturday-anchored week: this_saturday is the Saturday that starts the
  -- current (possibly still in-progress) week bucket, computed the same way
  -- regardless of which day this function actually runs on. dow: 0=Sun..6=Sat
  -- (matches JS Date#getDay(), which lib/weekly-report.ts relies on).
  this_saturday date := current_date - ((extract(dow from current_date)::int + 1) % 7);
  week_start_date date := this_saturday - 7;
  week_start timestamptz := week_start_date::timestamptz;
  week_end timestamptz := this_saturday::timestamptz;
  company_sales numeric;
  company_deals int;
  top_rep_name text;
  report_link text := '/reports/weekly?week=' || to_char(week_start_date, 'YYYY-MM-DD');
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
    select p.id
    from public.profiles p
    join public.notification_preferences np on np.user_id = p.id
    where p.is_active and p.role = 'admin' and np.weekly_summary = true
  loop
    insert into public.notifications (recipient_id, type, title, body, link)
    values (
      rec.id,
      'weekly_summary',
      'Weekly performance summary',
      'Team closed $' || trim(to_char(company_sales, 'FM999,999,990')) ||
        ' across ' || company_deals || ' deal' || case when company_deals = 1 then '' else 's' end ||
        case when top_rep_name is not null then '. Top performer: ' || top_rep_name || '.' else '.' end,
      report_link
    );
  end loop;
end;
$$;

-- Re-registering the same job name updates its schedule in place rather than
-- creating a duplicate job.
select cron.schedule(
  'send-weekly-summaries',
  '0 8 * * 0',
  $$select public.send_weekly_summaries();$$
);
