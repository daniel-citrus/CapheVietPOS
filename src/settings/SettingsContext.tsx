import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ViewMode = "chat" | "admin";

interface Settings {
  /** Which surface is showing: the chat agent or the conventional admin UI. */
  view: ViewMode;
  setView: (v: ViewMode) => void;
  /** Show an approve/deny card before the agent runs any mutating tool. */
  requireConfirmation: boolean;
  setRequireConfirmation: (v: boolean) => void;
}

const SettingsContext = createContext<Settings | null>(null);

const KEY = "cpv.settings";

function load(): { view: ViewMode; requireConfirmation: boolean } {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return {
      view: raw.view === "admin" ? "admin" : "chat",
      requireConfirmation: raw.requireConfirmation !== false,
    };
  } catch {
    return { view: "chat", requireConfirmation: true };
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const initial = load();
  const [view, setView] = useState<ViewMode>(initial.view);
  const [requireConfirmation, setRequireConfirmation] = useState(
    initial.requireConfirmation,
  );

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ view, requireConfirmation }));
  }, [view, requireConfirmation]);

  const value = useMemo<Settings>(
    () => ({
      view,
      setView,
      requireConfirmation,
      setRequireConfirmation,
    }),
    [view, requireConfirmation],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): Settings {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
