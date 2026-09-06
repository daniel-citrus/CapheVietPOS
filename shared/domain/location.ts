export type LocationStatus = "active" | "inactive";

export interface Location {
  id: string;
  name: string;
  status: LocationStatus;
}
