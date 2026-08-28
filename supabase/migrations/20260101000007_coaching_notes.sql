-- ============================================================================
-- Coaching notes — timestamped, admin-authored observations/assessments
-- logged per sales rep (Sales Team → Coaching Notes tab). Append-only: a
-- note can be deleted by the admin who wrote it, but not edited.
-- ============================================================================

create table public.coaching_notes (
  id uuid primary key default gen_random_uuid(),
  salesperson_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index coaching_notes_salesperson_id_idx on public.coaching_notes (salesperson_id);
create index coaching_notes_created_at_idx on public.coaching_notes (created_at desc);

-- New tables aren't covered by the schema-wide grant in 20260101000002_rls.sql
-- (it only applied to tables that existed at the time it ran).
grant select, insert, delete on public.coaching_notes to authenticated;

alter table public.coaching_notes enable row level security;

create policy "coaching_notes_select_admin_only" on public.coaching_notes
  for select using (public.is_admin());

create policy "coaching_notes_insert_admin_only" on public.coaching_notes
  for insert with check (public.is_admin());

-- Only the admin who wrote a note can delete it.
create policy "coaching_notes_delete_own" on public.coaching_notes
  for delete using (public.is_admin() and author_id = auth.uid());
