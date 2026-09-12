-- ============================================================================
-- Leave management — the Team page's "Time Off" tab.
--
-- leave_requests: one row per request (vacation/sick/unpaid/other), with an
-- approval workflow (pending -> approved/rejected). `days` is computed by the
-- app from the local Sat-Thu work week (lib/working-days.ts) at submit time,
-- not recomputed here, so it stays stable even if the work week changes later.
--
-- leave_entitlements: only vacation carries an enforced annual allowance —
-- sick/unpaid/other are tracked for visibility, not capped. One row per
-- (salesperson, year); a rep with no row yet falls back to a default in the
-- app (lib/supabase/leave.ts), same pattern as notification_preferences.
-- ============================================================================

create type public.leave_type as enum ('vacation', 'sick', 'unpaid', 'other');
create type public.leave_status as enum ('pending', 'approved', 'rejected');

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  salesperson_id uuid not null references public.profiles (id) on delete cascade,
  leave_type public.leave_type not null,
  start_date date not null,
  end_date date not null,
  days numeric(5, 1) not null check (days > 0),
  reason text,
  status public.leave_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_requests_date_range check (end_date >= start_date)
);

create index leave_requests_salesperson_idx
  on public.leave_requests (salesperson_id, start_date);
create index leave_requests_status_idx
  on public.leave_requests (status) where status = 'pending';

create trigger set_updated_at before update on public.leave_requests
  for each row execute function public.set_updated_at();

create table public.leave_entitlements (
  id uuid primary key default gen_random_uuid(),
  salesperson_id uuid not null references public.profiles (id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  vacation_days numeric(5, 1) not null default 20 check (vacation_days >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (salesperson_id, year)
);

create trigger set_updated_at before update on public.leave_entitlements
  for each row execute function public.set_updated_at();
