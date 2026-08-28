-- ============================================================================
-- Makes coaching notes editable (Coaching page timeline): adds updated_at so
-- an edited note can show "edited" in the UI, and an update policy scoped to
-- the note's own author — same author-only rule the delete policy already
-- uses.
-- ============================================================================

alter table public.coaching_notes
  add column if not exists updated_at timestamptz not null default now();

create trigger set_updated_at before update on public.coaching_notes
  for each row execute function public.set_updated_at();

create policy "coaching_notes_update_own" on public.coaching_notes
  for update using (public.is_admin() and author_id = auth.uid())
  with check (public.is_admin() and author_id = auth.uid());
