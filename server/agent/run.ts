import type { AgentEvent, ToolCall } from "shared/api";
import type { CatalogToolbox } from "./catalogTools";

/** Everything a turn needs, wired up by the `/api/agent/chat` route. */
export interface AgentRun {
  emit(event: AgentEvent): void;
  /** Resolves once the human approves (or false on deny / timeout / abort). */
  confirm(call: ToolCall): Promise<boolean>;
  signal: AbortSignal;
  toolbox: CatalogToolbox;
  /** From `req.can("catalog.write")` — enforced here, not just in the UI. */
  canWrite: boolean;
}

/** What the model is told after a tool ran (or didn't). */
export interface ToolOutcome {
  content: string;
  isError: boolean;
}

/**
 * The shared per-tool-call path used by both the Claude loop and the offline
 * parser: announce → permission-check → confirm (if mutating) → execute →
 * report. Emits `tool_call` / `awaiting_confirmation` / `tool_result` events.
 */
export async function handleToolCall(
  run: AgentRun,
  call: ToolCall,
): Promise<ToolOutcome> {
  run.emit({ type: "tool_call", call });

  if (call.mutates) {
    if (!run.canWrite) {
      const summary =
        "You're viewing as staff — changes are disabled. Switch to admin to make this change.";
      run.emit({ type: "tool_result", call, result: { ok: false, summary } });
      return { content: summary, isError: true };
    }
    const approved = await run.confirm(call);
    if (!approved) {
      const summary = "You declined this change.";
      run.emit({ type: "tool_result", call, result: { ok: false, summary } });
      return {
        content: "The user declined this change. Do not retry it.",
        isError: true,
      };
    }
  }

  const result = await run.toolbox.run(call.name, call.args);
  run.emit({ type: "tool_result", call, result });
  return {
    content: JSON.stringify({ summary: result.summary, data: result.data }),
    isError: !result.ok,
  };
}
