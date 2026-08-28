import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { ChartCard } from "@/components/dashboard/chart-card";
import type { TeamMember } from "@/lib/supabase/team";
import {
  coachingNoteTypes,
  noteTypeTone,
  type CoachingNote,
} from "@/lib/supabase/coaching-notes";

export function RecentActivity({
  notes,
  peopleById,
}: {
  notes: CoachingNote[] | null;
  peopleById: Map<string, TeamMember>;
}) {
  const recent = (notes ?? []).slice(0, 6);

  return (
    <ChartCard
      title="Recent Activity"
      description="Latest coaching notes across the team"
    >
      {notes === null ? (
        <p className="py-6 text-center text-sm text-text-tertiary">Loading…</p>
      ) : recent.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-tertiary">
          No coaching notes logged yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {recent.map((note) => {
            const person = peopleById.get(note.salespersonId);
            const tone = noteTypeTone[note.type];

            return (
              <li key={note.id} className="flex items-start gap-3">
                <span
                  className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", tone.dot)}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-secondary">
                    <span className="font-medium text-foreground">
                      {person?.name ?? "Unknown"}
                    </span>{" "}
                    <span className="text-text-tertiary">
                      · {coachingNoteTypes.find((t) => t.value === note.type)?.label} ·{" "}
                      {formatDistanceToNow(new Date(note.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </p>
                  <p className="truncate text-xs text-text-tertiary">{note.body}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </ChartCard>
  );
}
