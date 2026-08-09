import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * Service-role Supabase client. Bypasses Row Level Security entirely — only
 * ever call this from a Route Handler / Server Action, after `requireAdmin()`
 * has verified the caller. Never import this into a client component.
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

type RequireAdminResult =
  | { user: { id: string }; error: null; status: 200 }
  | { user: null; error: string; status: 401 | 403 };

/**
 * Verifies the current request's session (via cookies, not a client-supplied
 * value) belongs to an active admin. Must be checked before any service-role
 * write, since the service-role client itself enforces no authorization.
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, error: "Unauthorized", status: 401 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return { user: null, error: "Forbidden", status: 403 };
  }

  return { user: { id: user.id }, error: null, status: 200 };
}
