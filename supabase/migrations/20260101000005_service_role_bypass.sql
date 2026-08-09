-- ============================================================================
-- Fix: guard_profile_role_changes (20260101000002_rls.sql) silently reverted
-- role/is_active on every update, even ones made through the service-role
-- key (app/api/admin/** route handlers use it to create/edit sales rep
-- accounts). The service-role key has no auth.uid(), so is_admin() always
-- read false for it and the guard treated every such change as a hostile
-- self-escalation attempt.
--
-- Fix: let requests authenticated as the service_role JWT through — those
-- routes already re-check the caller is an active admin themselves
-- (requireAdmin() in lib/supabase/admin.ts) before ever using that key, so
-- this isn't reopening the hole the trigger exists to close.
-- ============================================================================

create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if not public.is_admin() then
    new.role := old.role;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;
