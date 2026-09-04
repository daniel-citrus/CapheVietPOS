/**
 * Browser-visible configuration. Anything read here is bundled into the client,
 * so secrets are deliberately NOT here — they live only in the Vite dev server
 * (see vite.config.ts) and are reached through server-side proxies:
 *   /api/square      — Square Catalog API, token injected server-side
 *   /api/anthropic   — Anthropic API, key injected server-side
 */

export type DataSource = "mock" | "square";

const rawSource = (import.meta.env.VITE_DATA_SOURCE ?? "mock").toLowerCase();

export const dataSource: DataSource = rawSource === "square" ? "square" : "mock";

/** Base path for proxied Square Catalog calls. */
export const squareApiBase = "/api/square/v2";

/** Base path for proxied Anthropic calls. The client never holds the key. */
export const anthropicApiBase = "/api/anthropic";

/** Dev-server-only endpoint reporting whether ANTHROPIC_API_KEY is set, without revealing it. */
export const anthropicStatusUrl = "/api/anthropic-status";

export const agentModel: string =
  import.meta.env.VITE_AGENT_MODEL?.trim() || "claude-sonnet-5";
