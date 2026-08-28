"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { TeamMember } from "@/lib/supabase/team";
import type { CoachingNote } from "@/lib/supabase/coaching-notes";

export function RepRoster({
  people,
  notesByPerson,
  selectedId,
  onSelect,
}: {
  people: TeamMember[] | null;
  notesByPerson: Map<string, CoachingNote[]>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!people) return [];
    const q = query.trim().toLowerCase();
    return q ? people.filter((p) => p.name.toLowerCase().includes(q)) : people;
  }, [people, query]);

  return (
    <div className="glass-panel flex h-full flex-col rounded-2xl p-4 shadow-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-text-tertiary" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search reps…"
          className="h-9 pl-8"
        />
      </div>

      <ul className="mt-3 flex-1 space-y-0.5 overflow-y-auto">
        {people === null ? (
          [0, 1, 2, 3].map((i) => (
            <li key={i} className="p-1">
              <Skeleton className="h-14 rounded-xl" />
            </li>
          ))
        ) : filtered.length === 0 ? (
          <li className="px-2 py-6 text-center text-xs text-text-tertiary">
            No matches
          </li>
        ) : (
          filtered.map((person) => {
            const notes = notesByPerson.get(person.id) ?? [];
            const lastNote = notes[0];
            const isSelected = person.id === selectedId;

            return (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => onSelect(person.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-colors",
                    isSelected ? "bg-primary/10" : "hover:bg-foreground/[0.04]"
                  )}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                    {person.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {person.name}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">
                      {notes.length
                        ? `${notes.length} note${notes.length === 1 ? "" : "s"}`
                        : "No notes yet"}
                      {lastNote &&
                        ` · ${formatDistanceToNow(new Date(lastNote.createdAt), { addSuffix: true })}`}
                    </p>
                  </div>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
