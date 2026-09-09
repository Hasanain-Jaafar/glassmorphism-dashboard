"use client";

import { Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useLocalStorageBoolean } from "@/lib/use-local-storage-boolean";
import { KPI_WAVE_ANIMATIONS_STORAGE_KEY } from "@/lib/kpi-wave";
import { ACCENT_COLORS, useAccentColor } from "@/lib/use-accent-color";

export function AppearanceSection() {
  const [animateKpiCards, setAnimateKpiCards] = useLocalStorageBoolean(
    KPI_WAVE_ANIMATIONS_STORAGE_KEY,
    true
  );
  const [accent, setAccent] = useAccentColor();

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
            <p className="text-sm font-medium text-foreground">Accent color</p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              Buttons, active nav, charts, and highlights — tuned for both
              light and dark mode.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {ACCENT_COLORS.map((color) => {
              const isActive = accent === color.value;
              return (
                <button
                  key={color.value}
                  type="button"
                  aria-label={color.label}
                  aria-pressed={isActive}
                  title={color.label}
                  onClick={() => setAccent(color.value)}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full ring-2 ring-offset-2 ring-offset-[var(--surface-2)] transition-transform hover:scale-110",
                    isActive ? "ring-foreground/50" : "ring-transparent"
                  )}
                >
                  <span
                    className="flex size-5 items-center justify-center rounded-full"
                    style={{ backgroundColor: color.swatch }}
                  >
                    {isActive && <Check className="size-3 text-white" />}
                  </span>
                </button>
              );
            })}
          </div>
        </li>

        <li className="flex items-center justify-between gap-4 py-3.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              Animations on metric cards
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
