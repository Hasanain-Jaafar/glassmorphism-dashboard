"use client";

import { formatDistanceToNow } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { otherParticipant, type InboxThread } from "@/lib/supabase/inbox";
import type { TeamMember } from "@/lib/supabase/team";

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function ThreadList({
  admins,
  threads,
  unreadByThread,
  currentUserId,
  activeOtherId,
  onSelect,
}: {
  admins: TeamMember[] | null;
  threads: InboxThread[];
  unreadByThread: Map<string, number>;
  currentUserId: string;
  activeOtherId: string | null;
  onSelect: (otherId: string) => void;
}) {
  if (admins === null) {
    return (
      <div className="space-y-1.5 p-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (admins.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-xs text-text-tertiary">
        No other admins yet.
      </p>
    );
  }

  const threadByOtherId = new Map(
    threads.map((thread) => [otherParticipant(thread, currentUserId), thread])
  );

  const rows = [...admins].sort((a, b) => {
    const threadA = threadByOtherId.get(a.id);
    const threadB = threadByOtherId.get(b.id);
    if (threadA && threadB) {
      return +new Date(threadB.lastMessageAt) - +new Date(threadA.lastMessageAt);
    }
    if (threadA) return -1;
    if (threadB) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <ul className="h-full space-y-0.5 overflow-y-auto p-1.5">
      {rows.map((admin) => {
        const thread = threadByOtherId.get(admin.id);
        const unread = thread ? (unreadByThread.get(thread.id) ?? 0) : 0;

        return (
          <li key={admin.id}>
            <button
              type="button"
              onClick={() => onSelect(admin.id)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
                admin.id === activeOtherId
                  ? "bg-primary/10 text-foreground"
                  : "text-text-secondary hover:bg-foreground/[0.04]"
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                {admin.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={admin.avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  initials(admin.name)
                )}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{admin.name}</p>
                  {thread && (
                    <span className="shrink-0 text-[11px] text-text-tertiary">
                      {formatDistanceToNow(new Date(thread.lastMessageAt), {
                        addSuffix: true,
                      })}
                    </span>
                  )}
                </div>
                <p className="truncate text-xs text-text-tertiary">
                  {thread?.lastMessagePreview ?? "No messages yet"}
                </p>
              </div>

              {unread > 0 && (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
