/**
 * Server configuration, read once from the environment. The two secrets —
 * SQUARE_ACCESS_TOKEN and ANTHROPIC_API_KEY — are read *only* here and never
 * leave the server process; the client learns of them only as booleans via
 * `GET /api/meta`.
 *
 * In dev, `tsx watch --env-file=.env.local` loads these from `.env.local`.
 */

export type DataSource = "mock" | "square";

const squareEnv =
  process.env.SQUARE_ENVIRONMENT === "production" ? "production" : "sandbox";

export const config = {
  port: Number(process.env.API_PORT || process.env.PORT || 3001),

  dataSource: (process.env.DATA_SOURCE === "square"
    ? "square"
    : "mock") as DataSource,

  square: {
    token: process.env.SQUARE_ACCESS_TOKEN?.trim() ?? "",
    environment: squareEnv,
    /** Base URL including `/v2`. */
    apiBase:
      squareEnv === "production"
        ? "https://connect.squareup.com/v2"
        : "https://connect.squareupsandbox.com/v2",
    version: "2025-01-23",
    locationId: process.env.SQUARE_LOCATION_ID?.trim() || undefined,
  },

  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY?.trim() ?? "",
    model: process.env.AGENT_MODEL?.trim() || "claude-sonnet-5",
  },

  sqlitePath: process.env.SQLITE_PATH?.trim() || "server/data/audit.sqlite",
};

export const agentAvailable = config.anthropic.apiKey.length > 0;
