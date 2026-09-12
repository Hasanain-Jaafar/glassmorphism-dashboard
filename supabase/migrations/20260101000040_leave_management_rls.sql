-- ============================================================================
-- RLS for leave_requests / leave_entitlements — run after
-- 20260101000039_leave_management.sql.
--
-- leave_requests select is the one asymmetric policy here: an approved
-- request is visible to every signed-in user (the shared "who's out" team
-- calendar depends on this), but a pending or rejected request is visible
-- only to its owner and admins — nobody needs to see a coworker's leave
-- reason while it's still awaiting a decision.
--
-- The update/delete policies double as the "reps can't self-approve" guard:
-- a rep can only touch a row that is currently pending (`using`) and only if
-- it stays pending after the write (`with check`) — any attempt to flip
-- status themselves fails the check clause. Only public.is_admin() can move
-- a request to approved/rejected.
-- ============================================================================

alter table public.leave_requests enable row level security;

create policy "leave_requests_select" on public.leave_requests
  for select using (
    public.is_admin()
    or salesperson_id = auth.uid()
    or status = 'approved'
  );

create policy "leave_requests_insert" on public.leave_requests
  for insert with check (
    public.is_admin()
    or (salesperson_id = auth.uid() and status = 'pending')
  );

create policy "leave_requests_update" on public.leave_requests
  for update using (
    public.is_admin() or (salesperson_id = auth.uid() and status = 'pending')
  )
  with check (
    public.is_admin() or (salesperson_id = auth.uid() and status = 'pending')
  );

create policy "leave_requests_delete" on public.leave_requests
  for delete using (
    public.is_admin() or (salesperson_id = auth.uid() and status = 'pending')
  );

alter table public.leave_entitlements enable row level security;

create policy "leave_entitlements_select" on public.leave_entitlements
  for select using (public.is_admin() or salesperson_id = auth.uid());

create policy "leave_entitlements_insert_admin_only" on public.leave_entitlements
  for insert with check (public.is_admin());

create policy "leave_entitlements_update_admin_only" on public.leave_entitlements
  for update using (public.is_admin()) with check (public.is_admin());

create policy "leave_entitlements_delete_admin_only" on public.leave_entitlements
  for delete using (public.is_admin());
