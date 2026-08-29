"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow, isSameMonth } from "date-fns";
import { ChartCard } from "@/components/dashboard/chart-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import { fetchTeamMembers, type TeamMember } from "@/lib/supabase/team";
import {
  fetchAllCoachingNotes,
  coachingNoteTypes,
  noteTypeTone,
  type CoachingNote,
} from "@/lib/supabase/coaching-notes";
import { cn } from "@/lib/utils";

/** Coaching notes are private manager assessments (see /coaching) — this
 * card mirrors that page's admin-only gate rather than relying on the
 * sidebar to hide it. */
export function CoachingPulse() {
  const { isAdmin } = useAuth();
  const [notes, setNotes] = useState<CoachingNote[] | null>(null);
  const [people, setPeople] = useState<TeamMember[]>([]);

  useEffect(() => {
    if (!isAdmin) return;
    fetchAllCoachingNotes(50)
      .then(setNotes)
      .catch(() => setNotes([]));
    fetchTeamMembers()
      .then(setPeople)
      .catch(() => {});
  }, [isAdmin]);

  if (!isAdmin) return null;

  const peopleById = new Map(people.map((p) => [p.id, p]));
  const thisMonth = (notes ?? []).filter((n) =>
    isSameMonth(new Date(n.createdAt), new Date())
  );
  const countsByType = coachingNoteTypes.map((t) => ({
    ...t,
    count: thisMonth.filter((n) => n.type === t.value).length,
  }));
  const recent = (notes ?? []).slice(0, 3);

  return (
    <ChartCard
      title="Coaching Pulse"
      description="Manager notes logged across the team"
      actions={
        notes !== null && (
          <span className="shrink-0 rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
            {thisMonth.length} this month
          </span>
        )
      }
    >
      {notes === null ? (
        <div className="space-y-3">
          <Skeleton className="h-2 w-full rounded-full" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-foreground/[0.06]">
            {countsByType.map((t) => {
              const pct = thisMonth.length ? (t.count / thisMonth.length) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={t.value}
                  className={cn("h-full", noteTypeTone[t.value].dot)}
                  style={{ width: `${pct}%` }}
                />
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-tertiary">
            {countsByType.map((t) => (
              <span key={t.value} className="flex items-center gap-1.5">
                <span className={cn("size-1.5 rounded-full", noteTypeTone[t.value].dot)} />
                {t.label} <span className="font-medium text-foreground">{t.count}</span>
              </span>
            ))}
          </div>

          {recent.length === 0 ? (
            <p className="mt-5 py-2 text-center text-xs text-text-tertiary">
              No coaching notes logged yet.
            </p>
          ) : (
            <ul className="mt-5 space-y-2.5">
              {recent.map((note) => {
                const person = peopleById.get(note.salespersonId);
                const tone = noteTypeTone[note.type];
                return (
                  <li key={note.id} className="flex items-start gap-2.5">
                    <span
                      className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", tone.dot)}
                    />
                    <p className="min-w-0 flex-1 truncate text-xs text-text-secondary">
                      <span className="font-medium text-foreground">
                        {person?.name ?? "Unknown"}
                      </span>{" "}
                      · {coachingNoteTypes.find((t) => t.value === note.type)?.label} ·{" "}
                      {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </ChartCard>
  );
}
