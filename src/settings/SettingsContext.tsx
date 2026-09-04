import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/** Which top-level surface is showing. */
export type AppMode = "assistant" | "console";

interface Settings {
  /** "assistant" = agent-first chat UI; "console" = conventional admin UI. */
  mode: AppMode;
  setMode: (m: AppMode) => void;
  /** Show an approve/deny card before the agent runs any mutating tool. */
  requireConfirmation: boolean;
  setRequireConfirmation: (v: boolean) => void;
}

const SettingsContext = createContext<Settings | null>(null);

const KEY = "cpv.settings";

function load(): { mode: AppMode; requireConfirmation: boolean } {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    return {
      mode: raw.mode === "console" ? "console" : "assistant",
      requireConfirmation: raw.requireConfirmation !== false,
    };
  } catch {
    return { mode: "assistant", requireConfirmation: true };
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const initial = load();
  const [mode, setMode] = useState<AppMode>(initial.mode);
  const [requireConfirmation, setRequireConfirmation] = useState(
    initial.requireConfirmation,
  );

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify({ mode, requireConfirmation }));
  }, [mode, requireConfirmation]);

  const value = useMemo<Settings>(
    () => ({ mode, setMode, requireConfirmation, setRequireConfirmation }),
    [mode, requireConfirmation],
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
