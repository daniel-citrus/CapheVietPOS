import { useCallback, useMemo, useRef, useState } from "react";
import { useAnthropicAvailability } from "../config/agentAvailability";
import { useAuth } from "../auth/AuthContext";
import { useCatalog } from "../repositories/RepositoryContext";
import { bumpCatalogRevision } from "../repositories/catalogRevision";
import { useSettings } from "../settings/SettingsContext";
import { ClaudeAgent } from "./ClaudeAgent";
import { OfflineAgent } from "./OfflineAgent";
import type { AgentEvent, ToolCall } from "./types";
import type { ToolResult } from "./catalogTools";

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

const uid = () =>
  (crypto.randomUUID?.() ?? String(Math.random())).slice(0, 12);

export function useAgent() {
  const catalog = useCatalog();
  const { can } = useAuth();
  const { requireConfirmation } = useSettings();
  const canWrite = can("catalog.write");

  // "checking" behaves as offline until the server confirms a key is
  // configured — the client never has enough information to know on its own
  // (that's the point: the key isn't in the bundle).
  const availability = useAnthropicAvailability();
  const agent = useMemo(
    () =>
      availability === "available" ? new ClaudeAgent(catalog) : new OfflineAgent(catalog),
    [catalog, availability],
  );

  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const patch = useCallback((id: string, next: Partial<ChatEntry>) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...next } : e)),
    );
  }, []);

  const appendAssistantText = useCallback((text: string) => {
    setEntries((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.kind === "assistant") {
        return prev.map((e, i) =>
          i === prev.length - 1 ? { ...e, text: (e.text ?? "") + text } : e,
        );
      }
      return [...prev, { id: uid(), kind: "assistant", text }];
    });
  }, []);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setPending(null);
    setBusy(false);
  }, []);

  const reset = useCallback(() => {
    stop();
    agent.reset();
    setEntries([]);
  }, [agent, stop]);

  const send = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || busy) return;

      setEntries((prev) => [
        ...prev,
        { id: uid(), kind: "user", text: trimmed },
      ]);
      setBusy(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const handleEvent = (event: AgentEvent) => {
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
          case "tool_result":
            patch(`act-${event.call.id}`, {
              status: event.result.ok
                ? "done"
                : event.result.summary.includes("declined")
                  ? "declined"
                  : "error",
              result: event.result,
            });
            if (event.result.ok && event.call.mutates) bumpCatalogRevision();
            break;
          case "error":
            setEntries((prev) => [
              ...prev,
              { id: uid(), kind: "notice", text: event.message },
            ]);
            break;
        }
      };

      try {
        await agent.send(trimmed, {
          signal: controller.signal,
          emit: handleEvent,
          confirm: (call: ToolCall) => {
            if (!canWrite) {
              return Promise.resolve(false);
            }
            if (!requireConfirmation) {
              return Promise.resolve(true);
            }
            return new Promise<boolean>((resolve) => {
              setPending({
                call,
                approve: () => {
                  setPending(null);
                  resolve(true);
                },
                deny: () => {
                  setPending(null);
                  resolve(false);
                },
              });
            });
          },
        });
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
        setBusy(false);
        setPending(null);
      }
    },
    [agent, busy, canWrite, requireConfirmation, appendAssistantText, patch],
  );

  return {
    entries,
    busy,
    pending,
    send,
    stop,
    reset,
    agentKind: agent.kind,
    canWrite,
  };
}
