import { createClient } from "@/lib/supabase/client";

export type CoachingNoteType = "general" | "praise" | "concern" | "action_item";

export const coachingNoteTypes: { value: CoachingNoteType; label: string }[] = [
  { value: "general", label: "General" },
  { value: "praise", label: "Praise" },
  { value: "concern", label: "Concern" },
  { value: "action_item", label: "Action Item" },
];

/** Tailwind classes for the small colored dot + badge shown per note type. */
export const noteTypeTone: Record<
  CoachingNoteType,
  { dot: string; badge: string }
> = {
  general: {
    dot: "bg-text-tertiary",
    badge: "bg-foreground/[0.06] text-text-tertiary",
  },
  praise: { dot: "bg-success", badge: "bg-success/10 text-success" },
  concern: { dot: "bg-warning", badge: "bg-warning/10 text-warning" },
  action_item: { dot: "bg-primary", badge: "bg-primary/10 text-primary" },
};

export type CoachingNote = {
  id: string;
  salespersonId: string;
  authorId: string | null;
  type: CoachingNoteType;
  body: string;
  createdAt: string;
  updatedAt: string;
};

const noteColumns =
  "id, salesperson_id, author_id, type, body, created_at, updated_at";

function mapNote(n: {
  id: string;
  salesperson_id: string;
  author_id: string | null;
  type: string;
  body: string;
  created_at: string;
  updated_at: string;
}): CoachingNote {
  return {
    id: n.id,
    salespersonId: n.salesperson_id,
    authorId: n.author_id,
    type: n.type as CoachingNoteType,
    body: n.body,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
  };
}

/** Every coaching note across the team, newest first. Admin-only via RLS. */
export async function fetchAllCoachingNotes(limit = 500): Promise<CoachingNote[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("coaching_notes")
    .select(noteColumns)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map(mapNote);
}

export async function addCoachingNote(
  salespersonId: string,
  type: CoachingNoteType,
  body: string
): Promise<CoachingNote> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("coaching_notes")
    .insert({
      salesperson_id: salespersonId,
      author_id: user?.id ?? null,
      type,
      body,
    })
    .select(noteColumns)
    .single();

  if (error) throw error;

  return mapNote(data);
}

/** Only the admin who wrote a note may edit it — enforced by RLS. */
export async function updateCoachingNote(
  id: string,
  type: CoachingNoteType,
  body: string
): Promise<CoachingNote> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("coaching_notes")
    .update({ type, body })
    .eq("id", id)
    .select(noteColumns)
    .single();

  if (error) throw error;

  return mapNote(data);
}

/** Only the admin who wrote a note may delete it — enforced by RLS. */
export async function deleteCoachingNote(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("coaching_notes").delete().eq("id", id);
  if (error) throw error;
}
