import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { ModeToggle } from "../../components/ModeToggle";
import { PhinMark } from "../../components/PhinMark";
import { useAnthropicAvailability } from "../../config/agentAvailability";
import { useRepositories } from "../../repositories/RepositoryContext";
import { useSettings } from "../../settings/SettingsContext";
import { ChatView } from "../chat/ChatView";

function DataSourceBadge() {
  const { source } = useRepositories();
  return source === "square" ? (
    <span className="badge badge--live">
      <span className="dot" /> Square
    </span>
  ) : (
    <span className="badge badge--mock">
      <span className="dot" /> Demo data
    </span>
  );
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { role, setRole } = useAuth();
  const { requireConfirmation, setRequireConfirmation } = useSettings();
  const { source } = useRepositories();
  const availability = useAnthropicAvailability();

  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 25 }} onClick={onClose} />
      <div className="settings-panel" role="dialog" aria-label="Settings">
        <h4>Settings</h4>
        <div className="settings-row">
          <span>View as</span>
          <select
            className="mini-select"
            value={role}
            onChange={(e) => setRole(e.target.value as "admin" | "staff")}
          >
            <option value="admin">Admin</option>
            <option value="staff">Staff (read-only)</option>
          </select>
        </div>
        <div className="settings-row">
          <span>Confirm every change</span>
          <input
            type="checkbox"
            className="switch"
            checked={requireConfirmation}
            onChange={(e) => setRequireConfirmation(e.target.checked)}
          />
        </div>
        <div className="settings-row">
          <span>Catalog source</span>
          <span style={{ color: "var(--muted)" }}>
            {source === "square" ? "Square (live)" : "Mock fixtures"}
          </span>
        </div>
        <div className="settings-row">
          <span>Agent</span>
          <span style={{ color: "var(--muted)" }}>
            {availability === "checking"
              ? "Checking…"
              : availability === "available"
                ? "Claude"
                : "Offline parser"}
          </span>
        </div>
        <p style={{ marginTop: 10, fontSize: "0.75rem", color: "var(--muted)" }}>
          Set <code>VITE_DATA_SOURCE</code> here, and{" "}
          <code>SQUARE_ACCESS_TOKEN</code> / <code>ANTHROPIC_API_KEY</code> in{" "}
          <code>.env.local</code> — both are read server-side only, never
          bundled into the browser.
        </p>
      </div>
    </>
  );
}

export function AssistantView() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-brand">
          <span className="mark">
            <PhinMark />
          </span>
          Cà phê Việt
        </span>
        <span className="spacer" />
        <DataSourceBadge />
        <button
          className="icon-btn"
          aria-label="Settings"
          onClick={() => setSettingsOpen((v) => !v)}
        >
          ⚙
        </button>
        {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}
      </header>

      <div className="app-modebar">
        <ModeToggle />
      </div>

      <main className="app-main">
        <ChatView />
      </main>
    </div>
  );
}
