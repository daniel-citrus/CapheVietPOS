/**
 * Auth is stubbed — no real identity. Two roles only:
 *  - admin: full access to all screens and mutations
 *  - staff: view-only; cannot reach pricing, cannot create/edit/archive anything
 *
 * The client flips the role with a "View as" switcher and sends it as the
 * `X-Role` header; the server treats that header as the source of truth and
 * enforces `can()` on every mutation. Real auth (Square OAuth / Clerk) replaces
 * the provider internals and the header later; `can()` and its call sites stay.
 */
export type Role = "admin" | "staff";

export interface CurrentUser {
  id: string;
  name: string;
  role: Role;
}

export type Capability = "menu.write" | "pricing.read" | "pricing.write";

const CAPABILITIES: Record<Role, readonly Capability[]> = {
  admin: ["menu.write", "pricing.read", "pricing.write"],
  staff: [],
};

export function can(role: Role, capability: Capability): boolean {
  return CAPABILITIES[role].includes(capability);
}

export function userForRole(role: Role): CurrentUser {
  return role === "staff"
    ? { id: "u-staff", name: "Staff (demo)", role: "staff" }
    : { id: "u-admin", name: "Admin (demo)", role: "admin" };
}

/** Coerce an untrusted `X-Role` header value to a Role (defaults to admin). */
export function roleFromHeader(value: unknown): Role {
  return value === "staff" ? "staff" : "admin";
}
