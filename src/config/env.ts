/**
 * Browser-visible configuration. Anything read here is bundled into the client,
 * so the Square access token is deliberately NOT here — it lives only in the
 * Vite dev server (see vite.config.ts) and is reached through the `/api/square`
 * proxy.
 */

export type DataSource = "mock" | "square";

const rawSource = (import.meta.env.VITE_DATA_SOURCE ?? "mock").toLowerCase();

export const dataSource: DataSource = rawSource === "square" ? "square" : "mock";

/** Base path for proxied Square Catalog calls. */
export const squareApiBase = "/api/square/v2";

export const anthropicApiKey: string =
  import.meta.env.VITE_ANTHROPIC_API_KEY?.trim() ?? "";

export const agentModel: string =
  import.meta.env.VITE_AGENT_MODEL?.trim() || "claude-sonnet-5";

export const hasAnthropicKey = anthropicApiKey.length > 0;
