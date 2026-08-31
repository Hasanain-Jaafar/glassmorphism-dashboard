"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ColumnVisibilityState, OnChangeFn } from "@tanstack/react-table";

const emptyVisibility: ColumnVisibilityState = {};

// getSnapshot must return a referentially stable value when nothing has
// changed — useSyncExternalStore re-renders whenever it differs by
// reference, so parsing fresh on every call would loop forever. Cache the
// parsed result per key, keyed on the raw string it came from.
const cache = new Map<string, { raw: string | null; value: ColumnVisibilityState }>();
const listeners = new Map<string, Set<() => void>>();

function readRaw(storageKey: string): string | null {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function getSnapshot(storageKey: string): ColumnVisibilityState {
  const raw = readRaw(storageKey);
  const cached = cache.get(storageKey);
  if (cached && cached.raw === raw) return cached.value;

  let value: ColumnVisibilityState;
  try {
    value = raw ? JSON.parse(raw) : emptyVisibility;
  } catch {
    value = emptyVisibility;
  }
  cache.set(storageKey, { raw, value });
  return value;
}

// SSR has no localStorage — this is what both the server render and the
// first client render (pre-hydration) show, so they match. The real
// persisted value swaps in right after, handled by useSyncExternalStore
// itself rather than a manual effect.
function getServerSnapshot(): ColumnVisibilityState {
  return emptyVisibility;
}

function subscribe(storageKey: string, onStoreChange: () => void) {
  let set = listeners.get(storageKey);
  if (!set) {
    set = new Set();
    listeners.set(storageKey, set);
  }
  set.add(onStoreChange);

  // The native "storage" event only fires in *other* tabs, never the one
  // that made the change — same-tab updates are announced via notify().
  const handleStorage = (event: StorageEvent) => {
    if (event.key === storageKey) onStoreChange();
  };
  window.addEventListener("storage", handleStorage);

  return () => {
    set.delete(onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function notify(storageKey: string) {
  listeners.get(storageKey)?.forEach((listener) => listener());
}

/** Column visibility, persisted per-table to localStorage under `storageKey`. */
export function usePersistedColumnVisibility(
  storageKey: string
): [ColumnVisibilityState, OnChangeFn<ColumnVisibilityState>] {
  const columnVisibility = useSyncExternalStore(
    (onStoreChange) => subscribe(storageKey, onStoreChange),
    () => getSnapshot(storageKey),
    getServerSnapshot
  );

  const setColumnVisibility = useCallback<OnChangeFn<ColumnVisibilityState>>(
    (updater) => {
      const next =
        typeof updater === "function" ? updater(getSnapshot(storageKey)) : updater;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // Ignore — e.g. private browsing with storage blocked.
      }
      notify(storageKey);
    },
    [storageKey]
  );

  return [columnVisibility, setColumnVisibility];
}
