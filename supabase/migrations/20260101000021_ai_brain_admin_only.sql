-- AI Brain is now admin-only (app/api/assistant/chat/route.ts and
-- app/(dashboard)/assistant/page.tsx both gate on role already), but the app
-- layer alone isn't the real boundary — a signed-in rep could still hit
-- ai_conversations/ai_messages directly with their own session unless RLS
-- itself requires admin, per CLAUDE.md §51 ("never depend only on
-- client-side access checks"). Same admin-gating pattern as
-- coaching_notes_select_admin_only in 20260101000007_coaching_notes.sql.

drop policy if exists "ai_conversations_select_own" on public.ai_conversations;
drop policy if exists "ai_conversations_insert_own" on public.ai_conversations;
drop policy if exists "ai_conversations_update_own" on public.ai_conversations;
drop policy if exists "ai_conversations_delete_own" on public.ai_conversations;

create policy "ai_conversations_select_own_admin" on public.ai_conversations
  for select using (user_id = auth.uid() and public.is_admin());
create policy "ai_conversations_insert_own_admin" on public.ai_conversations
  for insert with check (user_id = auth.uid() and public.is_admin());
create policy "ai_conversations_update_own_admin" on public.ai_conversations
  for update using (user_id = auth.uid() and public.is_admin())
  with check (user_id = auth.uid() and public.is_admin());
create policy "ai_conversations_delete_own_admin" on public.ai_conversations
  for delete using (user_id = auth.uid() and public.is_admin());

drop policy if exists "ai_messages_select_own" on public.ai_messages;
drop policy if exists "ai_messages_insert_own" on public.ai_messages;
drop policy if exists "ai_messages_delete_own" on public.ai_messages;

create policy "ai_messages_select_own_admin" on public.ai_messages
  for select using (user_id = auth.uid() and public.is_admin());
create policy "ai_messages_insert_own_admin" on public.ai_messages
  for insert with check (user_id = auth.uid() and public.is_admin());
create policy "ai_messages_delete_own_admin" on public.ai_messages
  for delete using (user_id = auth.uid() and public.is_admin());
