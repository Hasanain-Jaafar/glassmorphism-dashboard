-- ============================================================================
-- Admin Inbox — 1:1 direct messages between admins (/inbox), with Supabase
-- Realtime for live sync. A thread is an unordered pair of admins; RLS
-- enforces both the membership boundary (only the two participants can
-- read/write a thread) and, at insert time, that both participants are
-- actually admins — the app already only offers other admins as recipients,
-- but per CLAUDE.md §51 that's not the real boundary, RLS is.
-- ============================================================================

create table public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  participant_one uuid not null references public.profiles (id) on delete cascade,
  participant_two uuid not null references public.profiles (id) on delete cascade,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  created_at timestamptz not null default now(),
  constraint dm_threads_distinct_participants check (participant_one <> participant_two)
);

-- One thread per unordered pair — (a, b) and (b, a) collapse to the same row.
create unique index dm_threads_pair_idx on public.dm_threads (
  least(participant_one, participant_two),
  greatest(participant_one, participant_two)
);
create index dm_threads_participant_one_idx on public.dm_threads (participant_one);
create index dm_threads_participant_two_idx on public.dm_threads (participant_two);

create table public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index dm_messages_thread_created_idx on public.dm_messages (thread_id, created_at);
create index dm_messages_unread_idx on public.dm_messages (thread_id) where read_at is null;

-- ---------------------------------------------------------------------------
-- last_message_at / last_message_preview are system-maintained, never
-- written by the client — SECURITY DEFINER so it works without granting
-- UPDATE on dm_threads to authenticated at all (same shape as the
-- notify_* triggers in 20260101000010_notifications.sql).
-- ---------------------------------------------------------------------------

create or replace function public.touch_dm_thread()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dm_threads
  set last_message_at = new.created_at,
      last_message_preview = left(new.body, 140)
  where id = new.thread_id;
  return new;
end;
$$;

create trigger touch_dm_thread_on_message_insert
  after insert on public.dm_messages
  for each row execute function public.touch_dm_thread();

grant select, insert on public.dm_threads to authenticated;
grant select, insert on public.dm_messages to authenticated;
-- Column-scoped: a recipient can flip read_at on a message, never rewrite
-- its body or reassign its sender — RLS is row-level only, this is the
-- column-level backstop.
grant update (read_at) on public.dm_messages to authenticated;

alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;

create policy "dm_threads_select_participant" on public.dm_threads
  for select using (participant_one = auth.uid() or participant_two = auth.uid());

create policy "dm_threads_insert_participant_admins_only" on public.dm_threads
  for insert with check (
    (participant_one = auth.uid() or participant_two = auth.uid())
    and exists (select 1 from public.profiles p where p.id = participant_one and p.role = 'admin')
    and exists (select 1 from public.profiles p where p.id = participant_two and p.role = 'admin')
  );

create policy "dm_messages_select_thread_participant" on public.dm_messages
  for select using (
    exists (
      select 1 from public.dm_threads t
      where t.id = dm_messages.thread_id
        and (t.participant_one = auth.uid() or t.participant_two = auth.uid())
    )
  );

create policy "dm_messages_insert_sender_admin_only" on public.dm_messages
  for insert with check (
    sender_id = auth.uid()
    and public.is_admin()
    and exists (
      select 1 from public.dm_threads t
      where t.id = dm_messages.thread_id
        and (t.participant_one = auth.uid() or t.participant_two = auth.uid())
    )
  );

-- Only the recipient (the non-sender participant) ever marks a message read.
create policy "dm_messages_update_mark_read_by_recipient" on public.dm_messages
  for update using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.dm_threads t
      where t.id = dm_messages.thread_id
        and (t.participant_one = auth.uid() or t.participant_two = auth.uid())
    )
  )
  with check (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.dm_threads t
      where t.id = dm_messages.thread_id
        and (t.participant_one = auth.uid() or t.participant_two = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Realtime — live sync across every admin session with /inbox open, same
-- idempotent pattern as 20260101000012_customers_realtime.sql.
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dm_threads'
  ) then
    alter publication supabase_realtime add table public.dm_threads;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dm_messages'
  ) then
    alter publication supabase_realtime add table public.dm_messages;
  end if;
end $$;
