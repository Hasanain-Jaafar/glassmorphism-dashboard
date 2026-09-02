"use client";

import { Switch } from "@/components/ui/switch";
import { useLocalStorageBoolean } from "@/lib/use-local-storage-boolean";
import { KPI_WAVE_ANIMATIONS_STORAGE_KEY } from "@/lib/kpi-wave";

export function AppearanceSection() {
  const [animateKpiCards, setAnimateKpiCards] = useLocalStorageBoolean(
    KPI_WAVE_ANIMATIONS_STORAGE_KEY,
    true
  );

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-sm sm:p-6">
      <h3 className="text-sm font-semibold text-foreground sm:text-base">
        Appearance
      </h3>
      <p className="mt-0.5 text-xs text-text-tertiary">
        Just for this browser — not synced across devices.
      </p>

      <ul className="mt-5 divide-y divide-glass-border">
        <li className="flex items-center justify-between gap-4 py-3.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Animated KPI cards
            </p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              The subtle wave motion on metric cards across Dashboard, Team,
              Customers, and other pages.
            </p>
          </div>
          <Switch
            checked={animateKpiCards}
            onCheckedChange={setAnimateKpiCards}
          />
        </li>
      </ul>
    </div>
  );
}
