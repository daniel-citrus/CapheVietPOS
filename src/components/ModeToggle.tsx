import { useSettings } from "../settings/SettingsContext";

/**
 * Switches between the agent-first chat surface and the conventional admin
 * console. Rendered in both shells' headers.
 */
export function ModeToggle() {
  const { mode, setMode } = useSettings();
  return (
    <div className="seg" role="group" aria-label="Switch interface">
      <button
        type="button"
        aria-pressed={mode === "assistant"}
        onClick={() => setMode("assistant")}
      >
        Assistant
      </button>
      <button
        type="button"
        aria-pressed={mode === "console"}
        onClick={() => setMode("console")}
      >
        Console
      </button>
    </div>
  );
}
