-- Appointments/Deals count targets alongside the existing revenue target,
-- for the Targets → Individual tab's per-rep edit dialog. Reuses the same
-- targets row (one per target_type/period_type/salesperson/year/month) —
-- no new table or RLS needed, since targets_select/targets_insert_admin_only/
-- etc. (20260101000002_rls.sql) already cover exactly the access this needs:
-- admin writes, the owning rep can read their own row.

alter table public.targets
  add column if not exists appointments_target integer
    check (appointments_target is null or appointments_target >= 0),
  add column if not exists deals_target integer
    check (deals_target is null or deals_target >= 0);
