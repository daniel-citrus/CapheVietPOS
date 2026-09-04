import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import type { Role } from "../domain";
import { useAuth, type Capability } from "../auth/AuthContext";
import { useCurrentLocation } from "../location/LocationContext";
import { useRepositories } from "../repositories/RepositoryContext";
import { t, type CopyKey } from "../i18n/copy";

const NAV: { to: string; key: CopyKey; requires?: Capability }[] = [
  { to: "/items", key: "nav.items" },
  { to: "/categories", key: "nav.categories" },
  { to: "/modifier-groups", key: "nav.modifierGroups" },
  { to: "/pricing", key: "nav.pricing", requires: "pricing.read" },
  { to: "/reporting", key: "nav.reporting" },
  { to: "/analytics", key: "nav.analytics" },
  { to: "/orders", key: "nav.orders" },
];

export function AppShell({ modeToggle }: { modeToggle?: ReactNode }) {
  const { role, setRole, user, can } = useAuth();
  const { currentLocation } = useCurrentLocation();
  const { source } = useRepositories();
  const nav = NAV.filter((item) => !item.requires || can(item.requires));

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-[var(--border)] bg-[var(--surface)] md:w-56 md:border-b-0 md:border-r">
        <div className="border-b border-[var(--border)] px-4 py-4">
          <div className="text-sm font-semibold">{t("app.title")}</div>
          <div className="mt-0.5 text-xs text-[var(--muted)]">
            {currentLocation.name}
          </div>
        </div>
        <nav className="flex gap-0.5 overflow-x-auto p-2 md:flex-1 md:flex-col md:space-y-0.5 md:overflow-visible">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block whitespace-nowrap rounded-md px-3 py-1.5 text-sm ${
                  isActive
                    ? "bg-[var(--bg)] font-medium text-[var(--text)]"
                    : "text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--text)]"
                }`
              }
            >
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t border-[var(--border)] p-3 md:block">
          <label className="block text-xs font-medium text-[var(--muted)]">
            {t("role.switcher.label")}
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="mt-1 w-full rounded-md border border-[var(--border)] bg-white px-2 py-1 text-sm outline-none"
          >
            <option value="admin">{t("role.admin")}</option>
            <option value="staff">{t("role.staff")}</option>
          </select>
          <div className="mt-1.5 text-xs text-[var(--muted)]">{user.name}</div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 md:px-6">
          <span className="badge">
            <span className="dot" />
            {source === "square" ? "Square (live)" : t("app.env.mock")}
          </span>
          <div className="flex items-center gap-3">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs outline-none md:hidden"
              aria-label={t("role.switcher.label")}
            >
              <option value="admin">{t("role.admin")}</option>
              <option value="staff">{t("role.staff")}</option>
            </select>
            {modeToggle}
          </div>
        </header>
        <main className="flex-1 overflow-x-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
