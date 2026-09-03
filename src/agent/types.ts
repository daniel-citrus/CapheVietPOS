import type { ToolResult } from "./catalogTools";

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  mutates: boolean;
}

/** Streamed back to the chat view as the agent works through a turn. */
export type AgentEvent =
  | { type: "text"; text: string }
  | { type: "tool_call"; call: ToolCall }
  | { type: "tool_result"; call: ToolCall; result: ToolResult }
  | { type: "error"; message: string };

export interface AgentTurn {
  /** Emit a partial or full assistant text chunk. */
  emit(event: AgentEvent): void;
  /** Ask the human to approve a mutating tool call. Resolves false on deny. */
  confirm(call: ToolCall): Promise<boolean>;
  /** Abort signal for the whole turn. */
  signal: AbortSignal;
}

export interface Agent {
  readonly kind: "claude" | "offline";
  send(userText: string, turn: AgentTurn): Promise<void>;
  reset(): void;
}
