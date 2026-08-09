-- ============================================================================
-- Sales Management Dashboard — core schema
-- Run this first, in the Supabase SQL Editor (or `supabase db push`).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('admin', 'sales_rep');
create type public.appointment_status as enum ('scheduled', 'completed', 'cancelled', 'no_show');
create type public.quotation_status as enum ('draft', 'sent', 'accepted', 'rejected', 'expired');
create type public.deal_status as enum ('open', 'won', 'lost');
create type public.invoice_status as enum ('draft', 'sent', 'paid', 'overdue', 'cancelled');
create type public.product_status as enum ('active', 'draft', 'archived');
create type public.target_type as enum ('company', 'individual');
create type public.period_type as enum ('monthly', 'yearly');

-- ---------------------------------------------------------------------------
-- profiles — one row per auth.users row (admin or sales_rep)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  role public.user_role not null default 'sales_rep',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'App-level profile for every signed-up user; role drives RLS.';

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  company text,
  address text,
  owner_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- products — the catalog
-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text not null unique,
  category text not null,
  brand text,
  price numeric(12, 2) not null default 0 check (price >= 0),
  status public.product_status not null default 'draft',
  description text,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- appointments — start of the sales pipeline
-- ---------------------------------------------------------------------------

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  sales_rep_id uuid not null references public.profiles (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  title text not null,
  scheduled_at timestamptz not null,
  status public.appointment_status not null default 'scheduled',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- quotations
-- ---------------------------------------------------------------------------

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  sales_rep_id uuid not null references public.profiles (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  appointment_id uuid references public.appointments (id) on delete set null,
  status public.quotation_status not null default 'draft',
  total numeric(12, 2) not null default 0 check (total >= 0),
  valid_until date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.quotation_items (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- deals — a won/lost quotation
-- ---------------------------------------------------------------------------

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  sales_rep_id uuid not null references public.profiles (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  quotation_id uuid references public.quotations (id) on delete set null,
  status public.deal_status not null default 'open',
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- invoices — revenue only counts once status = 'paid' (per CLAUDE.md)
-- ---------------------------------------------------------------------------

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid references public.deals (id) on delete set null,
  sales_rep_id uuid not null references public.profiles (id) on delete cascade,
  customer_id uuid references public.customers (id) on delete set null,
  status public.invoice_status not null default 'draft',
  amount numeric(12, 2) not null default 0 check (amount >= 0),
  due_date date,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- targets — company or individual, monthly or yearly
-- ---------------------------------------------------------------------------

create table public.targets (
  id uuid primary key default gen_random_uuid(),
  target_type public.target_type not null,
  period_type public.period_type not null,
  amount numeric(12, 2) not null check (amount >= 0),
  salesperson_id uuid references public.profiles (id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  month smallint check (month between 1 and 12),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint targets_individual_needs_salesperson
    check (target_type = 'company' or salesperson_id is not null),
  constraint targets_monthly_needs_month
    check (period_type = 'yearly' or month is not null),
  constraint targets_yearly_has_no_month
    check (period_type = 'monthly' or month is null)
);

-- One target per (type, period, salesperson, year, month) combination.
create unique index targets_unique_scope on public.targets (
  target_type,
  period_type,
  coalesce(salesperson_id, '00000000-0000-0000-0000-000000000000'::uuid),
  year,
  coalesce(month, 0)
);

-- ---------------------------------------------------------------------------
-- activities — lightweight audit / timeline log
-- ---------------------------------------------------------------------------

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes for the common access patterns (own-records lookups, dashboards)
-- ---------------------------------------------------------------------------

create index customers_owner_id_idx on public.customers (owner_id);
create index appointments_sales_rep_id_idx on public.appointments (sales_rep_id);
create index appointments_scheduled_at_idx on public.appointments (scheduled_at);
create index quotations_sales_rep_id_idx on public.quotations (sales_rep_id);
create index quotation_items_quotation_id_idx on public.quotation_items (quotation_id);
create index deals_sales_rep_id_idx on public.deals (sales_rep_id);
create index invoices_sales_rep_id_idx on public.invoices (sales_rep_id);
create index invoices_status_paid_at_idx on public.invoices (status, paid_at);
create index targets_salesperson_id_idx on public.targets (salesperson_id);
create index targets_year_month_idx on public.targets (year, month);
create index activities_entity_idx on public.activities (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.products
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.quotations
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.deals
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.invoices
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.targets
  for each row execute function public.set_updated_at();
