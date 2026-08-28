import { createClient } from "@/lib/supabase/client";

export type CoachingNote = {
  id: string;
  salespersonId: string;
  authorId: string | null;
  body: string;
  createdAt: string;
};

/** Timestamped observations logged for one rep, newest first. Admin-only via RLS. */
export async function fetchCoachingNotes(
  salespersonId: string
): Promise<CoachingNote[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("coaching_notes")
    .select("id, salesperson_id, author_id, body, created_at")
    .eq("salesperson_id", salespersonId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((n) => ({
    id: n.id,
    salespersonId: n.salesperson_id,
    authorId: n.author_id,
    body: n.body,
    createdAt: n.created_at,
  }));
}

export async function addCoachingNote(
  salespersonId: string,
  body: string
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("coaching_notes").insert({
    salesperson_id: salespersonId,
    author_id: user?.id ?? null,
    body,
  });

  if (error) throw error;
}

/** Only the admin who wrote a note may delete it — enforced by RLS. */
export async function deleteCoachingNote(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("coaching_notes").delete().eq("id", id);
  if (error) throw error;
}
