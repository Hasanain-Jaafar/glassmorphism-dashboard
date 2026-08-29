"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Reveal } from "@/components/motion/reveal";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
} from "@/lib/supabase/notifications";
import { cn } from "@/lib/utils";

// Notifications are never deleted server-side (see the `notifications` table
// in supabase/migrations/20260101000010_notifications.sql — there's no
// delete grant/policy for `authenticated`), so this is a real, permanent
// history. The bell dropdown only shows the latest 20 as a quick preview;
// this page is where the full archive lives.
const HISTORY_LIMIT = 200;

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);

  useEffect(() => {
    fetchNotifications(HISTORY_LIMIT)
      .then(setNotifications)
      .catch(() => setNotifications([]));
  }, []);

  const unreadCount = (notifications ?? []).filter((n) => !n.readAt).length;

  // Unread stays unread until the user actually opens that notification —
  // just visiting this page no longer clears everything at once.
  function handleSelect(notification: AppNotification) {
    if (!notification.readAt) {
      setNotifications(
        (prev) =>
          prev?.map((n) =>
            n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n
          ) ?? prev
      );
      markNotificationRead(notification.id).catch(() => {
        // Non-critical — the bell badge will just re-count on its next poll.
      });
    }
    if (notification.link) router.push(notification.link);
  }

  async function handleMarkAllRead() {
    if (unreadCount === 0) return;
    setNotifications(
      (prev) =>
        prev?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? prev
    );
    try {
      await markAllNotificationsRead();
    } catch {
      // Non-critical — the bell badge will just re-count on its next poll.
    }
  }

  return (
    <div className="space-y-6">
      <Reveal>
        <PageHeader
          title="Notifications"
          description="Every update you've received, kept for as long as you need it"
          actions={
            unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                Mark all read
              </Button>
            )
          }
        />
      </Reveal>

      <Reveal delay={0.05}>
        {notifications === null ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass-panel flex flex-col items-center gap-3 rounded-2xl p-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-foreground/[0.06] text-text-tertiary">
              <Bell className="size-5" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">
                No notifications yet
              </p>
              <p className="mt-1 text-xs text-text-tertiary">
                Appointment, deal, and coaching updates will show up here as
                they happen.
              </p>
            </div>
          </div>
        ) : (
          <div className="glass-panel overflow-hidden rounded-2xl shadow-sm">
            <ul className="divide-y divide-glass-border/60">
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(notification)}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-foreground/[0.03] sm:px-5"
                  >
                    <span
                      className={cn(
                        "mt-2 size-1.5 shrink-0 rounded-full",
                        notification.readAt ? "bg-transparent" : "bg-primary"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="mt-0.5 text-sm text-text-secondary">
                          {notification.body}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-text-tertiary">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Reveal>
    </div>
  );
}
