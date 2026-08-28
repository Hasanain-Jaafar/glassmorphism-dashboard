"use client";

import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { format, isSameMonth } from "date-fns";
import { NotebookPen } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { NoteTimelineItem } from "@/components/coaching/note-timeline-item";
import { NoteFormatToolbar } from "@/components/coaching/note-format-toolbar";
import type { TeamMember } from "@/lib/supabase/team";
import {
  addCoachingNote,
  deleteCoachingNote,
  coachingNoteTypes,
  noteTypeTone,
  type CoachingNote,
  type CoachingNoteType,
} from "@/lib/supabase/coaching-notes";

const roleLabels: Record<TeamMember["role"], string> = {
  admin: "Administrator",
  sales_rep: "Sales Representative",
};

const noteSchema = z.object({
  type: z.enum(["general", "praise", "concern", "action_item"]),
  body: z
    .string()
    .trim()
    .min(1, "Write a note before saving")
    .max(2000, "Keep it under 2,000 characters"),
});
type NoteInput = z.input<typeof noteSchema>;
type NoteOutput = z.output<typeof noteSchema>;

function TypeOption({ type }: { type: CoachingNoteType }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-1.5 rounded-full", noteTypeTone[type].dot)} />
      {coachingNoteTypes.find((t) => t.value === type)?.label}
    </span>
  );
}

export function CoachingPanel({
  person,
  notes,
  notesLoading,
  peopleById,
  onNoteAdded,
  onNoteUpdated,
  onNoteDeleted,
}: {
  person: TeamMember | undefined;
  notes: CoachingNote[];
  notesLoading: boolean;
  peopleById: Map<string, TeamMember>;
  onNoteAdded: (note: CoachingNote) => void;
  onNoteUpdated: (note: CoachingNote) => void;
  onNoteDeleted: (id: string) => void;
}) {
  const { user } = useAuth();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NoteInput, unknown, NoteOutput>({
    resolver: zodResolver(noteSchema),
    defaultValues: { type: "general", body: "" },
  });

  async function onSubmit({ type, body }: NoteOutput) {
    if (!person) return;
    try {
      const note = await addCoachingNote(person.id, type, body);
      onNoteAdded(note);
      reset({ type: "general", body: "" });
      toast.success("Note saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save the note");
    }
  }

  async function handleDelete(id: string) {
    onNoteDeleted(id);
    try {
      await deleteCoachingNote(id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete the note");
    }
  }

  if (!person) {
    return (
      <div className="glass-panel flex h-full min-h-[360px] flex-col items-center justify-center rounded-2xl p-8 text-center">
        <NotebookPen className="size-6 text-text-tertiary" />
        <p className="mt-3 text-sm font-medium text-foreground">Select a rep</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-text-tertiary">
          Pick someone from the roster to log or review coaching notes.
        </p>
      </div>
    );
  }

  const thisMonthCount = notes.filter((n) =>
    isSameMonth(new Date(n.createdAt), new Date())
  ).length;
  const lastNote = notes[0];

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-2xl p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
            {person.initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {person.name}
            </p>
            <p className="truncate text-xs text-text-tertiary">
              {roleLabels[person.role]}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-glass-border pt-4 text-center">
          <div>
            <p className="text-lg font-semibold text-foreground">{notes.length}</p>
            <p className="text-xs text-text-tertiary">Total Notes</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">{thisMonthCount}</p>
            <p className="text-xs text-text-tertiary">This Month</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              {lastNote ? format(new Date(lastNote.createdAt), "MMM d") : "—"}
            </p>
            <p className="text-xs text-text-tertiary">Last Note</p>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5 shadow-sm sm:p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-8 gap-2 rounded-lg">
                    <SelectValue>
                      {(value: CoachingNoteType) => <TypeOption type={value} />}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {coachingNoteTypes.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <TypeOption type={t.value} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <Controller
            name="body"
            control={control}
            render={({ field: { ref, ...field } }) => (
              <div className="space-y-2">
                <NoteFormatToolbar
                  textareaRef={bodyRef}
                  value={field.value}
                  onChange={field.onChange}
                />
                <Textarea
                  {...field}
                  ref={(el) => {
                    ref(el);
                    bodyRef.current = el;
                  }}
                  rows={3}
                  placeholder={`Log an observation about ${person.name.split(" ")[0]}…`}
                />
              </div>
            )}
          />
          {errors.body && (
            <p className="text-xs text-danger">{errors.body.message}</p>
          )}
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Add Note"}
            </Button>
          </div>
        </form>
      </div>

      <div className="glass-panel rounded-2xl p-5 shadow-sm sm:p-6">
        <h3 className="text-sm font-semibold text-foreground">Timeline</h3>
        <div className="mt-4 space-y-3">
          {notesLoading ? (
            <>
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </>
          ) : notes.length === 0 ? (
            <p className="py-6 text-center text-sm text-text-tertiary">
              No notes yet for {person.name}.
            </p>
          ) : (
            notes.map((note) => (
              <NoteTimelineItem
                key={note.id}
                note={note}
                author={note.authorId ? peopleById.get(note.authorId) : undefined}
                isMine={note.authorId === user?.id}
                onUpdated={onNoteUpdated}
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
