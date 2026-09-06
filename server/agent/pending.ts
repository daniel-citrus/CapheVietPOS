/**
 * The confirm round-trip. When the loop hits a mutating tool it emits
 * `awaiting_confirmation` on the SSE stream and `await`s here; the separate
 * `POST /api/agent/confirm` request resolves the matching deferred and the
 * loop continues on the same stream.
 */

interface Pending {
  conversationId: string;
  settle: (approved: boolean) => void;
}

const CONFIRM_TIMEOUT_MS = 5 * 60_000;

const pending = new Map<string, Pending>();

/** Wait for the client to approve/deny `callId`. Denies on timeout or abort. */
export function waitForConfirmation(
  callId: string,
  conversationId: string,
  signal: AbortSignal,
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => finish(false), CONFIRM_TIMEOUT_MS);

    const finish = (approved: boolean) => {
      clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
      if (pending.get(callId)?.settle === finish) pending.delete(callId);
      resolve(approved);
    };
    const onAbort = () => finish(false);

    signal.addEventListener("abort", onAbort, { once: true });
    pending.set(callId, { conversationId, settle: finish });
  });
}

/** From `POST /api/agent/confirm`. Returns false if there was nothing waiting. */
export function resolveConfirmation(callId: string, approved: boolean): boolean {
  const entry = pending.get(callId);
  if (!entry) return false;
  entry.settle(approved);
  return true;
}

/** Deny every deferred for a conversation (client hit Stop or closed the stream). */
export function abortConversation(conversationId: string): void {
  for (const entry of pending.values()) {
    if (entry.conversationId === conversationId) entry.settle(false);
  }
}
