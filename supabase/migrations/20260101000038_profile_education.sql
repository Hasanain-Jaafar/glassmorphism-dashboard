-- ============================================================================
-- Adds an `education` field to profiles, collected on the Add/Edit
-- Salesperson forms (Settings -> Team & Access) and shown as a column on the
-- /team "All Salespeople" table.
-- ============================================================================

alter table public.profiles
  add column if not exists education text
    check (education in ('primary_school', 'high_school', 'college'));
