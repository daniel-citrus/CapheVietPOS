import { useState } from "react";
import { useAuth } from "./auth/AuthContext";
import { hasAnthropicKey } from "./config/env";
import { AdminView } from "./features/admin/AdminView";
import { ChatView } from "./features/chat/ChatView";
import { useRepositories } from "./repositories/RepositoryContext";
import { useSettings } from "./settings/SettingsContext";

function DataSourceBadge() {
  const { source } = useRepositories();
  if (source === "square") {
    return (
      <span className="badge badge--live">
        <span className="dot" /> Square
      </span>
    );
  }
  return (
    <span className="badge badge--mock">
      <span className="dot" /> Demo data
    </span>
  );
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { role, setRole } = useAuth();
  const { requireConfirmation, setRequireConfirmation } = useSettings();
  const { source } = useRepositories();

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 25 }}
        onClick={onClose}
      />
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
            {hasAnthropicKey ? "Claude" : "Offline parser"}
          </span>
        </div>
        <p
          style={{
            marginTop: 10,
            fontSize: "0.75rem",
            color: "var(--muted)",
          }}
        >
          Set <code>VITE_DATA_SOURCE</code>, <code>SQUARE_ACCESS_TOKEN</code> and{" "}
          <code>VITE_ANTHROPIC_API_KEY</code> in <code>.env.local</code>.
        </p>
      </div>
    </>
  );
}

export default function App() {
  const { view, setView } = useSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-brand">
          <span className="mark">c</span>
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
        {settingsOpen && (
          <SettingsPanel onClose={() => setSettingsOpen(false)} />
        )}
      </header>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "10px 14px 0",
        }}
      >
        <div className="seg" role="group" aria-label="Switch view">
          <button
            aria-pressed={view === "chat"}
            onClick={() => setView("chat")}
          >
            Chat
          </button>
          <button
            aria-pressed={view === "admin"}
            onClick={() => setView("admin")}
          >
            Manage menu
          </button>
        </div>
      </div>

      <main className="app-main">
        {view === "chat" ? <ChatView /> : <AdminView />}
      </main>
    </div>
  );
}
