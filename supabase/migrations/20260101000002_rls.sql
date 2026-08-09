-- ============================================================================
-- Row Level Security — run after 20260101000001_schema.sql
--
-- Model (per CLAUDE.md §51):
--   Admin          → all business data
--   Sales Rep      → own sales-related records, own KPIs, own targets
-- ============================================================================

-- Safety net: ensure the `authenticated` role can reach these tables at all.
-- (Supabase projects normally grant this by default, but this makes the
-- migration self-contained regardless of project defaults.)
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- is_admin() — security definer so it can read profiles without recursing
-- into the RLS policy that calls it.
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

-- Prevent a non-admin from writing their own role/is_active via a profile
-- update (RLS is row-level, not column-level, so this trigger is the guard).
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;

create trigger guard_profile_role_changes
  before update on public.profiles
  for each row execute function public.prevent_self_role_escalation();

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_admin_only" on public.profiles
  for insert with check (public.is_admin());
  -- Signup itself inserts via the handle_new_user() trigger (security definer),
  -- which runs as the table owner and bypasses RLS — this policy only governs
  -- direct client-side inserts.

create policy "profiles_update" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

create policy "profiles_delete_admin_only" on public.profiles
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------

alter table public.customers enable row level security;

create policy "customers_select" on public.customers
  for select using (public.is_admin() or owner_id = auth.uid());

create policy "customers_insert" on public.customers
  for insert with check (public.is_admin() or owner_id = auth.uid());

create policy "customers_update" on public.customers
  for update using (public.is_admin() or owner_id = auth.uid())
  with check (public.is_admin() or owner_id = auth.uid());

create policy "customers_delete" on public.customers
  for delete using (public.is_admin() or owner_id = auth.uid());

-- ---------------------------------------------------------------------------
-- products — shared catalog: every signed-in user can read, only admin writes
-- ---------------------------------------------------------------------------

alter table public.products enable row level security;

create policy "products_select_all" on public.products
  for select using (auth.role() = 'authenticated');

create policy "products_insert_admin_only" on public.products
  for insert with check (public.is_admin());

create policy "products_update_admin_only" on public.products
  for update using (public.is_admin()) with check (public.is_admin());

create policy "products_delete_admin_only" on public.products
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- appointments
-- ---------------------------------------------------------------------------

alter table public.appointments enable row level security;

create policy "appointments_select" on public.appointments
  for select using (public.is_admin() or sales_rep_id = auth.uid());

create policy "appointments_insert" on public.appointments
  for insert with check (public.is_admin() or sales_rep_id = auth.uid());

create policy "appointments_update" on public.appointments
  for update using (public.is_admin() or sales_rep_id = auth.uid())
  with check (public.is_admin() or sales_rep_id = auth.uid());

create policy "appointments_delete" on public.appointments
  for delete using (public.is_admin() or sales_rep_id = auth.uid());

-- ---------------------------------------------------------------------------
-- quotations
-- ---------------------------------------------------------------------------

alter table public.quotations enable row level security;

create policy "quotations_select" on public.quotations
  for select using (public.is_admin() or sales_rep_id = auth.uid());

create policy "quotations_insert" on public.quotations
  for insert with check (public.is_admin() or sales_rep_id = auth.uid());

create policy "quotations_update" on public.quotations
  for update using (public.is_admin() or sales_rep_id = auth.uid())
  with check (public.is_admin() or sales_rep_id = auth.uid());

create policy "quotations_delete" on public.quotations
  for delete using (public.is_admin() or sales_rep_id = auth.uid());

-- ---------------------------------------------------------------------------
-- quotation_items — ownership derives from the parent quotation
-- ---------------------------------------------------------------------------

alter table public.quotation_items enable row level security;

create policy "quotation_items_select" on public.quotation_items
  for select using (
    public.is_admin() or exists (
      select 1 from public.quotations q
      where q.id = quotation_items.quotation_id and q.sales_rep_id = auth.uid()
    )
  );

create policy "quotation_items_insert" on public.quotation_items
  for insert with check (
    public.is_admin() or exists (
      select 1 from public.quotations q
      where q.id = quotation_items.quotation_id and q.sales_rep_id = auth.uid()
    )
  );

create policy "quotation_items_update" on public.quotation_items
  for update using (
    public.is_admin() or exists (
      select 1 from public.quotations q
      where q.id = quotation_items.quotation_id and q.sales_rep_id = auth.uid()
    )
  )
  with check (
    public.is_admin() or exists (
      select 1 from public.quotations q
      where q.id = quotation_items.quotation_id and q.sales_rep_id = auth.uid()
    )
  );

create policy "quotation_items_delete" on public.quotation_items
  for delete using (
    public.is_admin() or exists (
      select 1 from public.quotations q
      where q.id = quotation_items.quotation_id and q.sales_rep_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- deals
-- ---------------------------------------------------------------------------

alter table public.deals enable row level security;

create policy "deals_select" on public.deals
  for select using (public.is_admin() or sales_rep_id = auth.uid());

create policy "deals_insert" on public.deals
  for insert with check (public.is_admin() or sales_rep_id = auth.uid());

create policy "deals_update" on public.deals
  for update using (public.is_admin() or sales_rep_id = auth.uid())
  with check (public.is_admin() or sales_rep_id = auth.uid());

create policy "deals_delete" on public.deals
  for delete using (public.is_admin() or sales_rep_id = auth.uid());

-- ---------------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------------

alter table public.invoices enable row level security;

create policy "invoices_select" on public.invoices
  for select using (public.is_admin() or sales_rep_id = auth.uid());

create policy "invoices_insert" on public.invoices
  for insert with check (public.is_admin() or sales_rep_id = auth.uid());

create policy "invoices_update" on public.invoices
  for update using (public.is_admin() or sales_rep_id = auth.uid())
  with check (public.is_admin() or sales_rep_id = auth.uid());

create policy "invoices_delete" on public.invoices
  for delete using (public.is_admin() or sales_rep_id = auth.uid());

-- ---------------------------------------------------------------------------
-- targets — company targets are readable by everyone (dashboard context),
-- individual targets are admin + the owning rep only. Only admins write.
-- ---------------------------------------------------------------------------

alter table public.targets enable row level security;

create policy "targets_select" on public.targets
  for select using (
    public.is_admin()
    or target_type = 'company'
    or salesperson_id = auth.uid()
  );

create policy "targets_insert_admin_only" on public.targets
  for insert with check (public.is_admin());

create policy "targets_update_admin_only" on public.targets
  for update using (public.is_admin()) with check (public.is_admin());

create policy "targets_delete_admin_only" on public.targets
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- activities — append-only audit log
-- ---------------------------------------------------------------------------

alter table public.activities enable row level security;

create policy "activities_select" on public.activities
  for select using (public.is_admin() or actor_id = auth.uid());

create policy "activities_insert" on public.activities
  for insert with check (public.is_admin() or actor_id = auth.uid());
