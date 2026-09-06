import type { FastifyPluginAsync } from "fastify";
import type {
  AgentAbortRequest,
  AgentChatRequest,
  AgentConfirmRequest,
  AgentEvent,
  ToolCall,
} from "shared/api";
import { ValidationError } from "shared/errors";
import { config } from "../config";
import { CatalogToolbox } from "../agent/catalogTools";
import { resetConversation } from "../agent/conversations";
import { runClaude } from "../agent/loop";
import { runOffline } from "../agent/offline";
import {
  abortConversation,
  resolveConfirmation,
  waitForConfirmation,
} from "../agent/pending";
import type { AgentRun } from "../agent/run";

export const agentRoutes: FastifyPluginAsync = async (app) => {
  /** Stream a turn. SSE: one JSON `AgentEvent` per `data:` line. */
  app.post<{ Body: AgentChatRequest }>("/chat", async (req, reply) => {
    const { conversationId, message, autoConfirm } = req.body ?? {};
    if (!conversationId || !message?.trim()) {
      throw new ValidationError("conversationId and message are required");
    }

    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    });

    const controller = new AbortController();
    // The *response* closing means the client went away (Stop, navigation,
    // network). `req.raw` 'close' fires as soon as the POST body is consumed,
    // which is far too early.
    res.on("close", () => {
      if (!controller.signal.aborted) {
        controller.abort();
        abortConversation(conversationId);
      }
    });

    const emit = (event: AgentEvent) => {
      if (!res.writableEnded) res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    const run: AgentRun = {
      emit,
      signal: controller.signal,
      toolbox: new CatalogToolbox(req.catalog),
      canWrite: req.can("catalog.write"),
      confirm: (call: ToolCall) => {
        if (autoConfirm) return Promise.resolve(true);
        emit({ type: "awaiting_confirmation", call });
        return waitForConfirmation(call.id, conversationId, controller.signal);
      },
    };

    try {
      if (config.anthropic.apiKey) {
        await runClaude(message.trim(), conversationId, run);
      } else {
        await runOffline(message.trim(), run);
      }
      emit({ type: "done" });
    } catch (err) {
      if (!controller.signal.aborted) {
        emit({
          type: "error",
          message: err instanceof Error ? err.message : "The agent hit an error.",
        });
      }
    } finally {
      if (!res.writableEnded) res.end();
    }
  });

  /** Resolve a pending Apply/Skip. */
  app.post<{ Body: AgentConfirmRequest }>("/confirm", (req) => {
    const { callId, approved } = req.body ?? {};
    if (!callId) throw new ValidationError("callId is required");
    return { resolved: resolveConfirmation(callId, Boolean(approved)) };
  });

  /** Stop button / clear conversation. */
  app.post<{ Body: AgentAbortRequest }>("/abort", (req) => {
    const { conversationId } = req.body ?? {};
    if (conversationId) {
      abortConversation(conversationId);
      resetConversation(conversationId);
    }
    return { ok: true };
  });
};
