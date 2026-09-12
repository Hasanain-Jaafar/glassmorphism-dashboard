-- ============================================================================
-- Widens profiles_select so every signed-in user can read the whole team
-- roster, not just their own row.
--
-- Before this, a sales rep's fetchTeamMembers() (lib/supabase/team.ts) only
-- ever returned their own profile — profiles_select was `id = auth.uid() or
-- is_admin()`. That silently broke every feature that needs to resolve a
-- *different* person's name/avatar for a non-admin viewer: the Team page's
-- "All Salespeople" tab, NeedsFollowUp's rep names, and the Attendance tab's
-- shared team calendar / coverage-conflict popup (which showed "Someone" for
-- every coworker instead of their name).
--
-- Same shared-roster pattern already used for products_select_all — write
-- access stays admin-only (profiles_insert/update/delete are untouched).
-- ============================================================================

drop policy "profiles_select" on public.profiles;

create policy "profiles_select" on public.profiles
  for select using (auth.role() = 'authenticated');
