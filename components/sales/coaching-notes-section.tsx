"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { NotebookPen, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import type { TeamMember } from "@/lib/supabase/team";
import {
  fetchCoachingNotes,
  addCoachingNote,
  deleteCoachingNote,
  type CoachingNote,
} from "@/lib/supabase/coaching-notes";

const noteSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, "Write a note before saving")
    .max(2000, "Keep it under 2,000 characters"),
});
type NoteInput = z.input<typeof noteSchema>;
type NoteOutput = z.output<typeof noteSchema>;

export function CoachingNotesSection({ people }: { people: TeamMember[] }) {
  const { user } = useAuth();
  const [personId, setPersonId] = useState<string | null>(null);
  const [autoSelected, setAutoSelected] = useState(false);

  // Default to the first rep once the roster loads (React's documented
  // "adjust state during render" pattern — see app/(dashboard)/team/page.tsx).
  if (!autoSelected && people.length > 0) {
    setAutoSelected(true);
    setPersonId(people[0].id);
  }

  const peopleById = useMemo(
    () => new Map(people.map((p) => [p.id, p])),
    [people]
  );
  const selected = personId ? peopleById.get(personId) : undefined;

  const [notesState, setNotesState] = useState<{
    personId: string;
    notes: CoachingNote[];
  } | null>(null);
  const notes = notesState?.personId === personId ? notesState.notes : null;

  useEffect(() => {
    if (!personId) return;
    fetchCoachingNotes(personId)
      .then((data) => setNotesState({ personId, notes: data }))
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Couldn't load notes")
      );
  }, [personId]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NoteInput, unknown, NoteOutput>({
    resolver: zodResolver(noteSchema),
    defaultValues: { body: "" },
  });

  async function onSubmit({ body }: NoteOutput) {
    if (!personId) return;
    try {
      await addCoachingNote(personId, body);
      reset();
      setNotesState({ personId, notes: await fetchCoachingNotes(personId) });
      toast.success("Note saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the note");
    }
  }

  async function handleDelete(id: string) {
    if (!personId || !notes) return;
    const previous = notes;
    setNotesState({ personId, notes: notes.filter((n) => n.id !== id) });
    try {
      await deleteCoachingNote(id);
    } catch (err) {
      setNotesState({ personId, notes: previous });
      toast.error(err instanceof Error ? err.message : "Couldn't delete the note");
    }
  }

  if (people.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center">
        <p className="text-sm font-medium text-foreground">
          No sales representatives yet
        </p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-text-tertiary">
          Add your first team member from Settings → Team & Access to start
          logging coaching notes.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-xs">
        <Select
          value={personId ?? undefined}
          onValueChange={(next) => next && setPersonId(next)}
        >
          <SelectTrigger className="glass-panel h-9 w-full gap-2 rounded-xl px-3">
            <SelectValue>{() => selected?.name ?? "Select a salesperson"}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {people.map((person) => (
              <SelectItem key={person.id} value={person.id}>
                {person.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="glass-panel rounded-2xl p-5 shadow-sm sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          <Textarea
            rows={3}
            placeholder={`Log an observation about ${selected?.name.split(" ")[0] ?? "this rep"}…`}
            {...register("body")}
          />
          {errors.body && (
            <p className="text-xs text-danger">{errors.body.message}</p>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !personId}>
              {isSubmitting ? "Saving…" : "Add Note"}
            </Button>
          </div>
        </form>

        <div className="mt-6 space-y-3 border-t border-glass-border pt-6">
          {notes === null ? (
            <>
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </>
          ) : notes.length === 0 ? (
            <div className="py-6 text-center">
              <NotebookPen className="mx-auto size-5 text-text-tertiary" />
              <p className="mt-2 text-sm text-text-tertiary">
                No notes yet for {selected?.name}.
              </p>
            </div>
          ) : (
            notes.map((note) => {
              const author = note.authorId
                ? peopleById.get(note.authorId)
                : undefined;
              const isMine = note.authorId === user?.id;

              return (
                <div
                  key={note.id}
                  className="rounded-xl border border-glass-border/60 bg-foreground/[0.02] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {author ? author.name : "Unknown"}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>
                    {isMine && (
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        className="text-text-tertiary transition-colors hover:text-danger"
                        aria-label="Delete note"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">
                    {note.body}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
