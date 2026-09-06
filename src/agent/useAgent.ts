import { useCallback, useRef, useState } from "react";
import type { AgentEvent, ToolCall, ToolResult } from "shared/api";
import { useAuth } from "../auth/AuthContext";
import { useMeta } from "../meta/MetaContext";
import { bumpMenuRevision } from "../api/menuRevision";
import { currentRoleHeader } from "../api/client";
import { useSettings } from "../settings/SettingsContext";

/**
 * Thin client for the server-side agent. `POST /api/agent/chat` streams
 * `AgentEvent`s (SSE); this hook folds them into the transcript, and drives
 * the Apply/Skip round-trip via `POST /api/agent/confirm`.
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

const uid = () => (crypto.randomUUID?.() ?? String(Math.random())).slice(0, 12);

async function* sseEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<AgentEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const chunk = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const line = chunk.split("\n").find((l) => l.startsWith("data:"));
      if (!line) continue;
      try {
        yield JSON.parse(line.slice(5).trim()) as AgentEvent;
      } catch {
        /* ignore a partial/garbled frame */
      }
    }
  }
}

export function useAgent() {
  const { can } = useAuth();
  const { agentAvailable } = useMeta();
  const { requireConfirmation } = useSettings();
  const canWrite = can("menu.write");

  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const conversationId = useRef(uid());
  const abortRef = useRef<AbortController | null>(null);

  const appendAssistantText = useCallback((text: string) => {
    setEntries((prev) => {
      const last = prev[prev.length - 1];
      if (last?.kind === "assistant") {
        return prev.map((e, i) =>
          i === prev.length - 1 ? { ...e, text: (e.text ?? "") + text } : e,
        );
      }
      return [...prev, { id: uid(), kind: "assistant", text }];
    });
  }, []);

  const confirmOnServer = useCallback((callId: string, approved: boolean) => {
    void fetch("/api/agent/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Role": currentRoleHeader() },
      body: JSON.stringify({ callId, approved }),
    });
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    void fetch("/api/agent/abort", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Role": currentRoleHeader() },
      body: JSON.stringify({ conversationId: conversationId.current }),
    });
    setPending(null);
    setBusy(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    conversationId.current = uid();
    setEntries([]);
  }, [stop]);

  const handleEvent = useCallback(
    (event: AgentEvent) => {
      switch (event.type) {
        case "text":
          appendAssistantText(event.text);
          break;
        case "tool_call":
          setEntries((prev) => [
            ...prev,
            {
              id: `act-${event.call.id}`,
              kind: "activity",
              call: event.call,
              status: "running",
            },
          ]);
          break;
        case "awaiting_confirmation":
          setPending({
            call: event.call,
            approve: () => {
              setPending(null);
              confirmOnServer(event.call.id, true);
            },
            deny: () => {
              setPending(null);
              confirmOnServer(event.call.id, false);
            },
          });
          break;
        case "tool_result": {
          const status = event.result.ok
            ? "done"
            : event.result.summary.includes("declined")
              ? "declined"
              : "error";
          setEntries((prev) =>
            prev.map((e) =>
              e.id === `act-${event.call.id}`
                ? { ...e, status, result: event.result }
                : e,
            ),
          );
          if (event.result.ok && event.call.mutates) bumpMenuRevision();
          break;
        }
        case "notice":
        case "error":
          setEntries((prev) => [
            ...prev,
            { id: uid(), kind: "notice", text: event.message },
          ]);
          break;
        case "done":
          break;
      }
    },
    [appendAssistantText, confirmOnServer],
  );

  const send = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || busy) return;

      setEntries((prev) => [...prev, { id: uid(), kind: "user", text: trimmed }]);
      setBusy(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/agent/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Role": currentRoleHeader(),
          },
          body: JSON.stringify({
            conversationId: conversationId.current,
            message: trimmed,
            autoConfirm: !requireConfirmation,
          }),
          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          throw new Error(`Agent request failed (${res.status})`);
        }
        for await (const event of sseEvents(res.body)) {
          handleEvent(event);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setEntries((prev) => [
            ...prev,
            {
              id: uid(),
              kind: "notice",
              text:
                err instanceof Error
                  ? `Agent error: ${err.message}`
                  : "The agent hit an unexpected error.",
            },
          ]);
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setPending(null);
        setBusy(false);
      }
    },
    [busy, requireConfirmation, handleEvent],
  );

  return {
    entries,
    busy,
    pending,
    send,
    stop,
    reset,
    agentKind: (agentAvailable ? "claude" : "offline") as "claude" | "offline",
    canWrite,
  };
}
