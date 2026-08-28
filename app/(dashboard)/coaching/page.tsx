"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Reveal } from "@/components/motion/reveal";
import { RepRoster } from "@/components/coaching/rep-roster";
import { CoachingPanel } from "@/components/coaching/coaching-panel";
import { RecentActivity } from "@/components/coaching/recent-activity";
import { useAuth } from "@/components/providers/auth-provider";
import { fetchTeamMembers, type TeamMember } from "@/lib/supabase/team";
import {
  fetchAllCoachingNotes,
  type CoachingNote,
} from "@/lib/supabase/coaching-notes";

export default function CoachingPage() {
  const { isAdmin } = useAuth();
  const [allPeople, setAllPeople] = useState<TeamMember[] | null>(null);
  const [notes, setNotes] = useState<CoachingNote[] | null>(null);
  const [personId, setPersonId] = useState<string | null>(null);
  const [autoSelected, setAutoSelected] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    fetchTeamMembers()
      .then(setAllPeople)
      .catch((err) => toast.error(err.message ?? "Couldn't load the team"));
    fetchAllCoachingNotes()
      .then(setNotes)
      .catch((err) => toast.error(err.message ?? "Couldn't load coaching notes"));
  }, [isAdmin]);

  // The roster only lists reps (coaching notes aren't logged for admins),
  // but note authors are always admins — so the author lookup map below
  // needs every active account, not just the filtered roster.
  const people = useMemo(
    () => allPeople?.filter((p) => p.role === "sales_rep") ?? null,
    [allPeople]
  );

  // Default to the first rep once the roster loads (React's documented
  // "adjust state during render" pattern — see app/(dashboard)/team/page.tsx).
  if (!autoSelected && people && people.length > 0) {
    setAutoSelected(true);
    setPersonId(people[0].id);
  }

  const peopleById = useMemo(
    () => new Map((allPeople ?? []).map((p) => [p.id, p])),
    [allPeople]
  );
  const selected = personId ? peopleById.get(personId) : undefined;

  const notesByPerson = useMemo(() => {
    const map = new Map<string, CoachingNote[]>();
    for (const note of notes ?? []) {
      const list = map.get(note.salespersonId) ?? [];
      list.push(note);
      map.set(note.salespersonId, list);
    }
    return map;
  }, [notes]);

  const selectedNotes = personId ? (notesByPerson.get(personId) ?? []) : [];

  function handleNoteAdded(note: CoachingNote) {
    setNotes((prev) => [note, ...(prev ?? [])]);
  }

  function handleNoteUpdated(note: CoachingNote) {
    setNotes((prev) => prev?.map((n) => (n.id === note.id ? note : n)) ?? null);
  }

  function handleNoteDeleted(id: string) {
    setNotes((prev) => prev?.filter((n) => n.id !== id) ?? null);
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Reveal>
          <PageHeader title="Coaching" />
        </Reveal>
        <Reveal delay={0.05}>
          <div className="glass-panel flex flex-col items-center rounded-2xl p-10 text-center">
            <Lock className="size-6 text-text-tertiary" />
            <p className="mt-3 text-sm font-medium text-foreground">
              Admins only
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-text-tertiary">
              Coaching notes are private manager assessments and aren&apos;t
              visible to sales representatives.
            </p>
          </div>
        </Reveal>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader
          title="Coaching"
          description="Timestamped observations and assessments, logged per rep"
        />
      </Reveal>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-6">
        <Reveal delay={0.05}>
          <RepRoster
            people={people}
            notesByPerson={notesByPerson}
            selectedId={personId}
            onSelect={setPersonId}
          />
        </Reveal>
        <Reveal delay={0.1}>
          <CoachingPanel
            person={selected}
            notes={selectedNotes}
            notesLoading={notes === null}
            peopleById={peopleById}
            onNoteAdded={handleNoteAdded}
            onNoteUpdated={handleNoteUpdated}
            onNoteDeleted={handleNoteDeleted}
          />
        </Reveal>
      </div>

      <Reveal delay={0.15}>
        <RecentActivity notes={notes} peopleById={peopleById} />
      </Reveal>
    </div>
  );
}
