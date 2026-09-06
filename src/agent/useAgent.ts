import { useState } from "react";
import type { ToolCall, ToolResult } from "shared/api";

/**
 * TEMPORARY STUB. The agent loop now runs server-side; this hook is rewritten
 * as the SSE client in the next step. Kept minimal so ChatView compiles and
 * the Console surface can be verified against the backend first.
 */

export interface ChatEntry {
  id: string;
  kind: "user" | "assistant" | "activity" | "notice";
  text?: string;
  call?: ToolCall;
  status?: "running" | "done" | "declined" | "error";
  result?: ToolResult;
}

export interface PendingConfirmation {
  call: ToolCall;
  approve: () => void;
  deny: () => void;
}

export function useAgent() {
  const [entries] = useState<ChatEntry[]>([]);
  return {
    entries,
    busy: false,
    pending: null as PendingConfirmation | null,
    send: async (_text: string): Promise<void> => {},
    stop: (): void => {},
    reset: (): void => {},
    agentKind: "offline" as "claude" | "offline",
    canWrite: false,
  };
}
