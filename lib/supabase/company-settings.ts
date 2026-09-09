import { createClient } from "@/lib/supabase/client";

export const DEFAULT_COMPANY_NAME = "Sales Dashboard";

/** The one company_settings row — see migration 37. Readable by every signed-in user, admin-only to update. */
export async function fetchCompanyName(): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("company_settings")
    .select("name")
    .eq("id", true)
    .single();
  if (error) throw error;
  return data.name;
}

export async function saveCompanyName(name: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("company_settings")
    .update({ name })
    .eq("id", true);
  if (error) throw error;
}
