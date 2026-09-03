import { useSyncExternalStore } from "react";

/**
 * A monotonically increasing counter bumped whenever the catalog is mutated
 * (by the agent or the admin UI). Views subscribe with `useCatalogRevision()`
 * and refetch when it changes, so a change made in chat shows up in the admin
 * list without a manual refresh.
 */

let revision = 0;
const listeners = new Set<() => void>();

export function bumpCatalogRevision() {
  revision += 1;
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useCatalogRevision(): number {
  return useSyncExternalStore(
    subscribe,
    () => revision,
    () => revision,
  );
}
