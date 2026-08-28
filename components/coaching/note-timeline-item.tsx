"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Pencil, Trash2, X } from "lucide-react";
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
import type { TeamMember } from "@/lib/supabase/team";
import {
  updateCoachingNote,
  coachingNoteTypes,
  noteTypeTone,
  type CoachingNote,
  type CoachingNoteType,
} from "@/lib/supabase/coaching-notes";

function TypeOption({ type }: { type: CoachingNoteType }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("size-1.5 rounded-full", noteTypeTone[type].dot)} />
      {coachingNoteTypes.find((t) => t.value === type)?.label}
    </span>
  );
}

export function NoteTimelineItem({
  note,
  author,
  isMine,
  onUpdated,
  onDelete,
}: {
  note: CoachingNote;
  author: TeamMember | undefined;
  isMine: boolean;
  onUpdated: (note: CoachingNote) => void;
  onDelete: (id: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editType, setEditType] = useState<CoachingNoteType>(note.type);
  const [editBody, setEditBody] = useState(note.body);
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const tone = noteTypeTone[note.type];
  const wasEdited =
    new Date(note.updatedAt).getTime() > new Date(note.createdAt).getTime();

  function startEdit() {
    setEditType(note.type);
    setEditBody(note.body);
    setEditError(null);
    setIsEditing(true);
  }

  async function saveEdit() {
    const trimmed = editBody.trim();
    if (!trimmed) {
      setEditError("Write a note before saving");
      return;
    }
    if (trimmed.length > 2000) {
      setEditError("Keep it under 2,000 characters");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateCoachingNote(note.id, editType, trimmed);
      onUpdated(updated);
      setIsEditing(false);
      toast.success("Note updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update the note");
    } finally {
      setSaving(false);
    }
  }

  if (isEditing) {
    return (
      <div className="rounded-xl border border-primary/30 bg-foreground/[0.02] p-4">
        <div className="flex items-center justify-between gap-3">
          <Select
            value={editType}
            onValueChange={(next) => next && setEditType(next as CoachingNoteType)}
          >
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
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            aria-label="Cancel edit"
            className="text-text-tertiary transition-colors hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
        <Textarea
          rows={3}
          value={editBody}
          onChange={(e) => setEditBody(e.target.value)}
          className="mt-3"
        />
        {editError && <p className="mt-1.5 text-xs text-danger">{editError}</p>}
        <div className="mt-3 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </Button>
          <Button type="button" size="sm" disabled={saving} onClick={saveEdit}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-glass-border/60 bg-foreground/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              tone.badge
            )}
          >
            {coachingNoteTypes.find((t) => t.value === note.type)?.label}
          </span>
          <span className="text-xs text-text-tertiary">
            {author ? author.name : "Unknown"} ·{" "}
            {format(new Date(note.createdAt), "MMM d, yyyy 'at' h:mm a")}
            {wasEdited && " · edited"}
          </span>
        </div>
        {isMine && (
          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={startEdit}
              aria-label="Edit note"
              className="text-text-tertiary transition-colors hover:text-foreground"
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(note.id)}
              aria-label="Delete note"
              className="text-text-tertiary transition-colors hover:text-danger"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        )}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">
        {note.body}
      </p>
    </div>
  );
}
