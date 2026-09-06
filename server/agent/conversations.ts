import type Anthropic from "@anthropic-ai/sdk";

/**
 * Per-conversation Claude message history, in memory only. The client owns the
 * `conversationId` (kept in sessionStorage); the server keeps its transcript
 * here for as long as the process lives. Restart = conversations reset, which
 * matches the old in-browser behaviour. Bounded so a long-running server
 * doesn't grow without limit.
 */

type History = Anthropic.MessageParam[];

const MAX_CONVERSATIONS = 100;
const store = new Map<string, { history: History; touchedAt: number }>();

export function getHistory(conversationId: string): History {
  const existing = store.get(conversationId);
  if (existing) {
    existing.touchedAt = Date.now();
    return existing.history;
  }
  const history: History = [];
  store.set(conversationId, { history, touchedAt: Date.now() });
  if (store.size > MAX_CONVERSATIONS) evictOldest();
  return history;
}

export function resetConversation(conversationId: string): void {
  store.delete(conversationId);
}

function evictOldest(): void {
  let oldestId: string | undefined;
  let oldest = Infinity;
  for (const [id, entry] of store) {
    if (entry.touchedAt < oldest) {
      oldest = entry.touchedAt;
      oldestId = id;
    }
  }
  if (oldestId) store.delete(oldestId);
}
