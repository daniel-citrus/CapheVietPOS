import { createContext, useContext, type ReactNode } from "react";
import type { Location } from "../domain";
import { useAsync } from "../lib/useAsync";
import { useRepositories } from "../repositories/RepositoryContext";
import { Spinner } from "../components/ui";

/**
 * The data model is multi-location (every location-scoped entity carries a
 * locationId). P1 has one location and no switcher UI — this context just
 * resolves "the current location" so screens have something to display and the
 * switcher seam exists for later.
 */
interface LocationValue {
  currentLocation: Location;
  allLocations: Location[];
}

const LocationContext = createContext<LocationValue | null>(null);

export function LocationProvider({ children }: { children: ReactNode }) {
  const { catalog } = useRepositories();
  const { data, loading, error } = useAsync(() => catalog.listLocations(), []);

  if (loading) return <Spinner label="Loading…" />;
  if (error || !data?.length) {
    return (
      <div className="p-6 text-sm text-red-700">
        Could not load locations.
      </div>
    );
  }

  const value: LocationValue = {
    currentLocation: data.find((l) => l.status === "active") ?? data[0],
    allLocations: data,
  };

  return (
    <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
  );
}

export function useCurrentLocation(): LocationValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useCurrentLocation must be used within LocationProvider");
  return ctx;
}
