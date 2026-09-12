-- Enables Supabase Realtime for leave_requests, so a sales rep sees their
-- request flip to Approved/Rejected the moment an admin decides it, and an
-- admin sees a new request the moment it's submitted — without a manual
-- refresh. Same pattern as 20260101000012_customers_realtime.sql.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'leave_requests'
  ) then
    alter publication supabase_realtime add table public.leave_requests;
  end if;
end $$;
