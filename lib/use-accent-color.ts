"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type AccentColor = "violet" | "blue" | "indigo" | "amber";

export const ACCENT_COLORS: { value: AccentColor; label: string; swatch: string }[] = [
  { value: "violet", label: "Violet", swatch: "#6d5dfb" },
  { value: "blue", label: "Blue", swatch: "#3763e0" },
  { value: "indigo", label: "Indigo", swatch: "#4f46e5" },
  { value: "amber", label: "Amber", swatch: "#a8790a" },
];

export const ACCENT_STORAGE_KEY = "accent-color";
const DEFAULT_ACCENT: AccentColor = "violet";

const listeners = new Set<() => void>();

function isAccentColor(value: string | null): value is AccentColor {
  return ACCENT_COLORS.some((c) => c.value === value);
}

function applyAccent(value: AccentColor) {
  document.documentElement.dataset.accent = value;
}

/**
 * The Settings > Appearance accent color, synced with localStorage (same
 * useSyncExternalStore pattern as useLocalStorageBoolean) and mirrored onto
 * <html data-accent="..."> — the CSS side of this lives in app/globals.css's
 * [data-accent="..."] blocks. A blocking inline script in app/layout.tsx
 * applies the stored value before hydration so there's no flash of violet
 * on load for a user who picked something else.
 */
export function useAccentColor(): [AccentColor, (next: AccentColor) => void] {
  const subscribe = useCallback((listener: () => void) => {
    listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  }, []);

  const getSnapshot = useCallback(() => {
    const stored = window.localStorage.getItem(ACCENT_STORAGE_KEY);
    return isAccentColor(stored) ? stored : DEFAULT_ACCENT;
  }, []);

  const getServerSnapshot = useCallback(() => DEFAULT_ACCENT, []);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Re-applies on every mount too, so the DOM attribute stays correct even
  // if the blocking script's value and this hook's snapshot were to diverge
  // (e.g. localStorage changed in another tab before this one mounted).
  useEffect(() => {
    applyAccent(value);
  }, [value]);

  const setValue = useCallback((next: AccentColor) => {
    window.localStorage.setItem(ACCENT_STORAGE_KEY, next);
    applyAccent(next);
    listeners.forEach((listener) => listener());
  }, []);

  return [value, setValue];
}
