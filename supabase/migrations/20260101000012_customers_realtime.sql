-- Enables Supabase Realtime (Postgres change broadcasts) for customers, so
-- when one admin adds/edits/deletes a customer, every other admin with
-- /customers open sees it immediately instead of needing to refresh.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'customers'
  ) then
    alter publication supabase_realtime add table public.customers;
  end if;
end $$;
