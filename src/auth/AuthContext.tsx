import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  can as canFor,
  roleFromHeader,
  userForRole,
  type Capability,
  type CurrentUser,
  type Role,
} from "shared/domain";
import { setRoleHeader } from "../repositories/apiClient";

export type { Capability };

/**
 * Auth is stubbed. The role is a value in context that the "View as" switcher
 * flips; it's also pushed into `apiClient` so every `/api/*` request carries an
 * `X-Role` header the server enforces. Real auth replaces the internals later.
 */

interface AuthValue {
  user: CurrentUser;
  role: Role;
  setRole: (role: Role) => void;
  can: (capability: Capability) => boolean;
}

const AuthContext = createContext<AuthValue | null>(null);

const ROLE_KEY = "cvp.devRole";

function initialRole(): Role {
  return roleFromHeader(sessionStorage.getItem(ROLE_KEY));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(initialRole);

  useEffect(() => {
    setRoleHeader(role);
  }, [role]);

  const setRole = useCallback((next: Role) => {
    sessionStorage.setItem(ROLE_KEY, next);
    setRoleHeader(next);
    setRoleState(next);
  }, []);

  const can = useCallback(
    (capability: Capability) => canFor(role, capability),
    [role],
  );

  const value = useMemo<AuthValue>(
    () => ({ user: userForRole(role), role, setRole, can }),
    [role, setRole, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
