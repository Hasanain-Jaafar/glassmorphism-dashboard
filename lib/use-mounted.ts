import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True once the component has hydrated on the client. Avoids SSR/client mismatches without setState-in-effect. */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
