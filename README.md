# Cà phê Việt — menu admin

A **React SPA + Fastify backend** for managing the menu of a Vietnamese-branded
coffee shop whose catalog of record is Square.

The frontend has **two surfaces behind one toggle** (top-right of every screen):

| Mode | What it is |
|---|---|
| **Assistant** (default) | Agent-first chat. You tell it what to do to the menu — "raise all cà phê sữa đá prices by 25¢", "add a large bạc xỉu at $5.50", "archive chè ba màu" — and approve each change on an **Apply / Skip** card. The LLM tool-loop runs **server-side**; with `ANTHROPIC_API_KEY` set it's Claude with tool use, without it a small offline command parser (same streamed events either way). |
| **Console** | Conventional admin console: Items (list / detail / create), Categories, Modifier groups, Pricing, and navigable reporting scaffolds. Sidebar nav, role-gated edit actions. |

Both surfaces talk to nothing but `/api/*`. The backend owns the Square
integration, the agent, permission checks, and an append-only audit log — and
holds both secrets. A change made in one surface shows up in the other.

```
npm install
cp .env.example .env.local     # then fill in values (backend reads this file)
npm run dev                     # runs the Fastify backend + Vite together
```

Defaults to `DATA_SOURCE=mock` (in-memory fixtures, no token needed). Open the
local URL Vite prints.

## Configuration (`.env.local`)

Read **only by the backend** (`npm run dev:api` runs `tsx --env-file=.env.local`).
The browser bundle contains no configuration — it calls `/api/*` and reads
`GET /api/meta` for the two facts it needs (`dataSource`, `agentAvailable`).

| Variable | Purpose |
|---|---|
| `API_PORT` | Backend port; Vite proxies `/api` here (default `3001`). |
| `DATA_SOURCE` | `mock` (default) or `square`. |
| `SQUARE_ACCESS_TOKEN` | Square API auth — set on requests by `SquareCatalogRepository`. Backend-only. |
| `SQUARE_ENVIRONMENT` | `sandbox` \| `production` — picks the Square host. |
| `SQUARE_LOCATION_ID` | Optional. Pin a single location (used by `export:catalog`). |
| `ANTHROPIC_API_KEY` | Agent LLM. Empty → offline parser. Backend-only; the client only learns whether it's set. |
| `AGENT_MODEL` | Agent model id (default `claude-sonnet-5`). |
| `SQLITE_PATH` | Audit-log file (created on first run). |

### Secrets

There is no browser-facing proxy. The Fastify backend is the only trust
boundary — it reads the two secrets from `.env.local`, uses them server-side,
and never sends them anywhere near the client. `@anthropic-ai/sdk` isn't in the
browser bundle at all.

For production, replace the dev setup with a deployed Node process (`npm run
build` → static client, `npm run build:api` → bundled server) and real auth in
place of the `X-Role` stub. `menuApi` (`src/api/menu.ts`) and `useAgent` already
call `/api/*`, so the client doesn't change.

### Freezing a real menu as fixtures (optional)

`npm run export:catalog` pulls the real menu + locations from Square once
(using `SQUARE_ACCESS_TOKEN` from `.env.local`) and writes
`server/menu/memory/fixtures.generated.json`, which `InMemoryMenuStore` picks
up automatically. Orders and customers are never pulled.

## Layout

```
shared/     domain model, MenuStore/SalesStore ports, wire contract, error types
server/     Fastify backend — menu store / agent / audit; run by `tsx watch` in dev
src/        React SPA — talks only to /api/*
```

See **`ARCHITECTURE.md`** for the full picture (diagrams, the agent SSE
protocol, the audit log).

## Notes

- Visual language matches the **Phin POS** kiosk: warm cream ground,
  lacquer-maroon primary, brass accent, sage for confirm actions; flat surfaces
  with inset hairline rings; Lora / Be Vietnam Pro; `prefers-reduced-motion`
  respected. Tokens at the top of `src/index.css`.
- Mock writes are in-memory — restart the backend and it reverts to fixtures.
- The audit log (SQLite) records every mutation with before → after; not yet
  surfaced in the UI.
- Light theme only, so the two surfaces stay coherent.
- No test framework yet.
