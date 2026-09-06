import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import type { Role } from "shared/domain";
import { useAuth, type Capability } from "../auth/AuthContext";
import { PhinMark } from "../components/PhinMark";
import { useCurrentLocation } from "../location/LocationContext";
import { useMeta } from "../meta/MetaContext";
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

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `block whitespace-nowrap rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-[color-mix(in_srgb,var(--color-primary)_12%,transparent)] text-[var(--color-primary)]"
      : "text-[var(--color-text-muted)] hover:bg-[color-mix(in_srgb,var(--color-text)_6%,transparent)] hover:text-[var(--color-text)]"
  }`;

export function AppShell({ modeToggle }: { modeToggle?: ReactNode }) {
  const { role, setRole, user, can } = useAuth();
  const { currentLocation } = useCurrentLocation();
  const { dataSource } = useMeta();
  const nav = NAV.filter((item) => !item.requires || can(item.requires));

  const roleSelect = (
    <select
      value={role}
      onChange={(e) => setRole(e.target.value as Role)}
      className="rounded-[var(--radius)] bg-[var(--color-surface)] px-2 py-1.5 text-xs shadow-[inset_0_0_0_1px_var(--color-border)] outline-none"
      aria-label={t("role.switcher.label")}
    >
      <option value="admin">{t("role.admin")}</option>
      <option value="staff">{t("role.staff")}</option>
    </select>
  );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col bg-[var(--color-surface)] shadow-[inset_-1px_0_0_var(--color-border)] md:w-56">
        <div className="flex items-center gap-2.5 px-4 py-4 shadow-[inset_0_-1px_0_var(--color-border)]">
          <PhinMark className="h-7 w-7 shrink-0 text-[var(--color-primary)]" />
          <div className="min-w-0">
            <div className="font-serif text-base leading-tight">
              {t("app.title")}
            </div>
            <div className="text-xs text-[var(--color-text-muted)]">
              {currentLocation.name}
            </div>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-2 md:flex-1 md:flex-col md:space-y-0.5 md:overflow-visible">
          {nav.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              {t(item.key)}
            </NavLink>
          ))}
        </nav>
        <div className="hidden p-3 shadow-[inset_0_1px_0_var(--color-border)] md:block">
          <span className="mb-1.5 block text-xs font-semibold text-[var(--color-text-muted)]">
            {t("role.switcher.label")}
          </span>
          {roleSelect}
          <div className="mt-1.5 text-xs text-[var(--color-text-muted)]">
            {user.name}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-header justify-between md:px-6">
          <span className={`badge ${dataSource === "square" ? "badge--live" : "badge--mock"}`}>
            <span className="dot" />
            {dataSource === "square" ? "Square · live" : "Demo data"}
          </span>
          <div className="flex items-center gap-2.5">
            <span className="md:hidden">{roleSelect}</span>
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
