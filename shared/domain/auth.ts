/**
 * P1 auth is stubbed. Two roles only:
 *  - admin: full access to all screens and mutations
 *  - staff: view-only; cannot reach pricing, cannot create/edit/archive anything
 */
export type Role = "admin" | "staff";

export interface CurrentUser {
  id: string;
  name: string;
  role: Role;
}
