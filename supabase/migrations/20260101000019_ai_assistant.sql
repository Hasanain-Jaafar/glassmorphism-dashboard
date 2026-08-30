-- ============================================================================
-- AI Assistant — per-user chat history for the /assistant page. Private by
-- design: every policy is scoped to auth.uid(), so even an admin only ever
-- sees their own conversations, never a team-wide chat log.
-- ============================================================================

create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  -- Denormalized from ai_conversations.user_id so RLS on this table doesn't
  -- need a join/exists subquery on every row check.
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index ai_conversations_user_id_updated_at_idx
  on public.ai_conversations (user_id, updated_at desc);
create index ai_messages_conversation_id_created_at_idx
  on public.ai_messages (conversation_id, created_at);

create trigger set_updated_at before update on public.ai_conversations
  for each row execute function public.set_updated_at();

grant select, insert, update, delete on public.ai_conversations to authenticated;
grant select, insert, update, delete on public.ai_messages to authenticated;

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;

create policy "ai_conversations_select_own" on public.ai_conversations
  for select using (user_id = auth.uid());
create policy "ai_conversations_insert_own" on public.ai_conversations
  for insert with check (user_id = auth.uid());
create policy "ai_conversations_update_own" on public.ai_conversations
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "ai_conversations_delete_own" on public.ai_conversations
  for delete using (user_id = auth.uid());

create policy "ai_messages_select_own" on public.ai_messages
  for select using (user_id = auth.uid());
create policy "ai_messages_insert_own" on public.ai_messages
  for insert with check (user_id = auth.uid());
create policy "ai_messages_delete_own" on public.ai_messages
  for delete using (user_id = auth.uid());
