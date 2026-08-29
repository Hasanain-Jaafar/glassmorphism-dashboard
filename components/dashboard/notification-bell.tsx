"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers/auth-provider";
import {
  fetchNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from "@/lib/supabase/notifications";
import { cn } from "@/lib/utils";

const POLL_INTERVAL_MS = 60_000;

export function NotificationBell() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    function load() {
      fetchNotifications(20)
        .then((data) => {
          if (!cancelled) setNotifications(data);
        })
        .catch(() => {
          if (!cancelled) setNotifications((prev) => prev ?? []);
        });
    }

    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  const unreadCount = (notifications ?? []).filter((n) => !n.readAt).length;

  async function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && unreadCount > 0) {
      setNotifications(
        (prev) =>
          prev?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? prev
      );
      try {
        await markAllNotificationsRead();
      } catch {
        // Non-critical — the badge will just re-count correctly on the next poll.
      }
    }
  }

  function handleSelect(notification: AppNotification) {
    setOpen(false);
    if (notification.link) router.push(notification.link);
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            className="relative flex size-9 items-center justify-center rounded-xl text-text-secondary transition-colors hover:bg-foreground/[0.04]"
          />
        }
      >
        <Bell className="size-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="w-80 p-0">
        <div className="border-b border-glass-border px-3.5 py-2.5">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {notifications === null ? (
            <p className="px-2 py-6 text-center text-xs text-text-tertiary">Loading…</p>
          ) : notifications.length === 0 ? (
            <p className="px-2 py-6 text-center text-xs text-text-tertiary">
              No notifications yet.
            </p>
          ) : (
            <ul>
              {notifications.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(notification)}
                    className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-foreground/[0.04]"
                  >
                    <span
                      className={cn(
                        "mt-1.5 size-1.5 shrink-0 rounded-full",
                        notification.readAt ? "bg-transparent" : "bg-primary"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {notification.title}
                      </p>
                      {notification.body && (
                        <p className="mt-0.5 truncate text-xs text-text-tertiary">
                          {notification.body}
                        </p>
                      )}
                      <p className="mt-0.5 text-[11px] text-text-tertiary">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
