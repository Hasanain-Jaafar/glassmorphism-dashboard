"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";
import {
  fetchNotificationPreferences,
  saveNotificationPreference,
  type NotificationPreferences,
} from "@/lib/supabase/notifications";

type PrefRow = {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
  adminOnly?: boolean;
};

const rows: PrefRow[] = [
  {
    key: "coachingNoteAdded",
    label: "Coaching note logged",
    description: "When another admin logs a coaching note about a rep.",
    adminOnly: true,
  },
  {
    key: "newAppointment",
    label: "New appointment",
    description: "When an appointment is scheduled with a customer.",
  },
  {
    key: "dealWon",
    label: "Deal won",
    description: "When a quotation converts into a closed deal.",
  },
  {
    key: "targetReached",
    label: "Target reached",
    description: "When you or your team hit a monthly or yearly target.",
  },
  {
    key: "quotationExpiring",
    label: "Quotation expiring",
    description: "When a sent quotation is about to expire.",
  },
  {
    key: "weeklySummary",
    label: "Weekly performance summary",
    description: "A recap of team performance every Monday.",
  },
];

export function NotificationsSection() {
  const { isAdmin } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    fetchNotificationPreferences()
      .then(setPrefs)
      .catch((error: Error) => toast.error(error.message));
  }, []);

  async function toggle(row: PrefRow) {
    if (!prefs) return;
    const next = !prefs[row.key];
    setPrefs({ ...prefs, [row.key]: next });
    try {
      await saveNotificationPreference(row.key, next);
      toast.success(`${row.label} ${next ? "enabled" : "disabled"}`);
    } catch (error) {
      setPrefs((prev) => (prev ? { ...prev, [row.key]: !next } : prev));
      toast.error(
        error instanceof Error ? error.message : "Couldn't save that preference"
      );
    }
  }

  const visibleRows = rows.filter((row) => !row.adminOnly || isAdmin);

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-sm sm:p-6">
      <h3 className="text-sm font-semibold text-foreground sm:text-base">
        Notifications
      </h3>
      <p className="mt-0.5 text-xs text-text-tertiary">
        Choose what you want to be notified about.
      </p>

      {prefs === null ? (
        <div className="mt-5 space-y-3.5">
          {visibleRows.map((row) => (
            <Skeleton key={row.key} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <ul className="mt-5 divide-y divide-glass-border">
          {visibleRows.map((row) => (
            <li
              key={row.key}
              className="flex items-center justify-between gap-4 py-3.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{row.label}</p>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {row.description}
                </p>
              </div>
              <Switch
                checked={prefs[row.key]}
                onCheckedChange={() => toggle(row)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
