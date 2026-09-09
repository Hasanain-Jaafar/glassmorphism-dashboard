-- Real backing store for the Settings > Company Defaults page. Previously
-- that whole form was local React state only — nothing persisted, and
-- "Save Defaults" was a toast with no network call behind it. Fiscal Year
-- Start and the Avg. Sales / Rep Calculation picker were removed entirely
-- rather than wired up here: every date/target calculation in the app
-- (lib/company-performance.ts, lib/target-period.ts) hardcodes a Jan–Dec
-- calendar year and the monthly-sales/active-reps formula, so those two
-- controls could never have actually changed anything without a much
-- larger rework. Company Name is kept and made real, and now drives the
-- sidebar's wordmark (see components/dashboard/sidebar.tsx).
--
-- Singleton table: `id boolean primary key default true` plus the check
-- constraint makes a second row structurally impossible (id can only ever
-- be `true`), which is simpler than a UUID row callers have to know the id
-- of. Every signed-in user can read it (the sidebar needs it); only an
-- admin can update it. No insert/delete policy — the one row is seeded
-- here and the app only ever updates it.

create table public.company_settings (
  id boolean primary key default true,
  name text not null default 'Sales Dashboard',
  updated_at timestamptz not null default now(),
  constraint company_settings_singleton check (id)
);

insert into public.company_settings (id, name) values (true, 'Sales Dashboard');

alter table public.company_settings enable row level security;

create policy "company_settings_select_all" on public.company_settings
  for select using (auth.role() = 'authenticated');

create policy "company_settings_update_admin_only" on public.company_settings
  for update using (public.is_admin()) with check (public.is_admin());

create trigger set_updated_at before update on public.company_settings
  for each row execute function public.set_updated_at();
