import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CurrentUser, Role } from "shared/domain";

/**
 * P1 auth is stubbed. There is no real identity and no security — the role is a
 * value in context that the dev "View as" switcher flips, so we can build and
 * demo permission-gated UI. In P3 this is replaced by real auth (Square OAuth or
 * Clerk); the `can()` helper and call sites stay the same.
 */

const USERS: Record<Role, CurrentUser> = {
  admin: { id: "u-admin", name: "Admin (demo)", role: "admin" },
  staff: { id: "u-staff", name: "Staff (demo)", role: "staff" },
};

/** Capabilities keyed by a short action name. Extend as screens are added. */
export type Capability =
  | "catalog.write"
  | "pricing.read"
  | "pricing.write";

const CAPABILITIES: Record<Role, Capability[]> = {
  admin: ["catalog.write", "pricing.read", "pricing.write"],
  staff: [],
};

interface AuthValue {
  user: CurrentUser;
  role: Role;
  setRole: (role: Role) => void;
  can: (capability: Capability) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

const ROLE_KEY = "cvp.devRole";

function initialRole(): Role {
  const stored = sessionStorage.getItem(ROLE_KEY);
  return stored === "staff" || stored === "admin" ? stored : "admin";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(initialRole);

  const setRole = useCallback((next: Role) => {
    sessionStorage.setItem(ROLE_KEY, next);
    setRoleState(next);
  }, []);

  const can = useCallback(
    (capability: Capability) => CAPABILITIES[role].includes(capability),
    [role],
  );

  const value = useMemo<AuthValue>(
    () => ({ user: USERS[role], role, setRole, can }),
    [role, setRole, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
