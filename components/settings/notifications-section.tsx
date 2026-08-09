"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

type NotificationPref = {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
};

const initialPrefs: NotificationPref[] = [
  {
    id: "target-reached",
    label: "Target reached",
    description: "When you or your team hit a monthly or yearly target.",
    enabled: true,
  },
  {
    id: "new-appointment",
    label: "New appointment",
    description: "When an appointment is scheduled with a customer.",
    enabled: true,
  },
  {
    id: "quotation-expiring",
    label: "Quotation expiring",
    description: "When a sent quotation is about to expire.",
    enabled: true,
  },
  {
    id: "deal-won",
    label: "Deal won",
    description: "When a quotation converts into a closed deal.",
    enabled: true,
  },
  {
    id: "weekly-summary",
    label: "Weekly performance summary",
    description: "A recap of team performance every Monday.",
    enabled: false,
  },
];

export function NotificationsSection() {
  const [prefs, setPrefs] = useState(initialPrefs);

  function toggle(id: string) {
    setPrefs((prev) =>
      prev.map((pref) => {
        if (pref.id !== id) return pref;
        const next = { ...pref, enabled: !pref.enabled };
        toast.success(`${pref.label} ${next.enabled ? "enabled" : "disabled"}`);
        return next;
      })
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-sm sm:p-6">
      <h3 className="text-sm font-semibold text-foreground sm:text-base">
        Notifications
      </h3>
      <p className="mt-0.5 text-xs text-text-tertiary">
        Choose what you want to be notified about.
      </p>

      <ul className="mt-5 divide-y divide-glass-border">
        {prefs.map((pref) => (
          <li
            key={pref.id}
            className="flex items-center justify-between gap-4 py-3.5"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {pref.label}
              </p>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {pref.description}
              </p>
            </div>
            <Switch
              checked={pref.enabled}
              onCheckedChange={() => toggle(pref.id)}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
