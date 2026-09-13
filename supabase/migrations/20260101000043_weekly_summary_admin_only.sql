-- ---------------------------------------------------------------------------
-- Weekly performance summary becomes an admin-only notification — sales
-- reps no longer see the toggle in Settings (components/settings/
-- notifications-section.tsx) and should no longer be sent one, including
-- any rep who had already opted in before this change.
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
      '/dashboard'
    );
  end loop;
end;
$$;

-- Existing reps who'd already opted in (before this became admin-only)
-- would otherwise sit with a stale "on" preference they can no longer see
-- or turn off, since the toggle is now hidden for their role.
update public.notification_preferences np
set weekly_summary = false
from public.profiles p
where p.id = np.user_id and p.role <> 'admin' and np.weekly_summary = true;
