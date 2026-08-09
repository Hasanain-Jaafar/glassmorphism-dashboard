-- ============================================================================
-- Adds optional bio fields collected on the Add/Edit Salesperson forms
-- (Settings -> Team & Access), shown on the /team "All Salespeople" table.
-- ============================================================================

alter table public.profiles
  add column if not exists has_car boolean not null default false,
  add column if not exists start_date date;
