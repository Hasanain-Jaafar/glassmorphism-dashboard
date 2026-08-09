"use client";

import { useCallback, useSyncExternalStore } from "react";

const listenersByKey = new Map<string, Set<() => void>>();

function getListeners(key: string) {
  let set = listenersByKey.get(key);
  if (!set) {
    set = new Set();
    listenersByKey.set(key, set);
  }
  return set;
}

/** A boolean synced with localStorage, safe for SSR/hydration via useSyncExternalStore. */
export function useLocalStorageBoolean(
  key: string,
  defaultValue = false
): [boolean, (next: boolean) => void] {
  const subscribe = useCallback(
    (listener: () => void) => {
      const listeners = getListeners(key);
      listeners.add(listener);
      window.addEventListener("storage", listener);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", listener);
      };
    },
    [key]
  );

  const getSnapshot = useCallback(() => {
    const stored = window.localStorage.getItem(key);
    return stored === null ? defaultValue : stored === "true";
  }, [key, defaultValue]);

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (next: boolean) => {
      window.localStorage.setItem(key, String(next));
      getListeners(key).forEach((listener) => listener());
    },
    [key]
  );

  return [value, setValue];
}
