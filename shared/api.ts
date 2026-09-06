/**
 * The client ⇄ server wire contract. The frontend's `HttpCatalogRepository`
 * and `useAgent`, and the backend's route handlers, are the two ends of this.
 */

import type { ErrorCode } from "./errors";

// --- REST ------------------------------------------------------------------

/** Failure envelope for every REST endpoint. */
export interface ApiErrorBody {
  error: { code: ErrorCode; message: string };
}

/** `GET /api/meta` */
export interface Meta {
  /** Where the catalog reads/writes: in-memory fixtures or live Square. */
  dataSource: "mock" | "square";
  /** Whether the server has an Anthropic key — the chat still works either way. */
  agentAvailable: boolean;
}

/** Stub identity sent on every request as the `X-Role` header. */
export type RoleHeader = "admin" | "staff";

// --- Agent ---------------------------------------------------------------

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  /** Mutating calls are gated by a human Apply/Skip before they run. */
  mutates: boolean;
}

export interface ToolResult {
  ok: boolean;
  /** Human-readable line shown in the transcript. */
  summary: string;
  /** Structured payload handed back to the model. */
  data?: unknown;
}

/**
 * Events streamed from `POST /api/agent/chat` (SSE, one JSON object per
 * `data:` line). `useAgent` folds these into the chat transcript.
 */
export type AgentEvent =
  | { type: "text"; text: string }
  | { type: "tool_call"; call: ToolCall }
  | { type: "awaiting_confirmation"; call: ToolCall }
  | { type: "tool_result"; call: ToolCall; result: ToolResult }
  | { type: "notice"; message: string }
  | { type: "done" }
  | { type: "error"; message: string };

/** `POST /api/agent/chat` request body. */
export interface AgentChatRequest {
  /** Client-generated; the server keeps that conversation's history in memory. */
  conversationId: string;
  message: string;
}

/** `POST /api/agent/confirm` request body. */
export interface AgentConfirmRequest {
  callId: string;
  approved: boolean;
}

/** `POST /api/agent/abort` request body. */
export interface AgentAbortRequest {
  conversationId: string;
}
