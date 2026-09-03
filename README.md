# Cà phê Việt — agent-first menu admin

A mobile-first admin surface for a Vietnamese-branded coffee shop whose menu
lives in Square. **Chat is the primary interface** — you tell the assistant what
to do to the menu and approve each change. A conventional "Manage menu" screen is
one tap away for browsing and hand-editing.

```
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

Open the local URL on a phone-sized viewport (or your phone on the same network
with `npm run dev -- --host`).

## The two surfaces

| | |
|---|---|
| **Chat** (default) | Natural-language menu management. "Raise all cà phê sữa đá prices by 25¢", "add a large bạc xỉu at $5.50", "archive chè ba màu". Every mutation shows an **Apply / Skip** card first. |
| **Manage menu** | Category filter, item cards, and a bottom-sheet editor for name / description / category / variations / prices / archived state. Also has **New item**. |

Toggle between them with the segmented control under the header. The choice, and
the "confirm every change" preference, persist in `localStorage`.

Changes made in either surface show up in the other immediately.

## Configuration (`.env.local`)

| Variable | Purpose |
|---|---|
| `VITE_DATA_SOURCE` | `mock` (in-memory fixtures, default) or `square` (live catalog via the dev proxy). |
| `SQUARE_ACCESS_TOKEN` | Square access token. **Read only by the Vite dev server** (`vite.config.ts`) and injected into `/api/square/*` requests — never bundled into the browser, never `VITE_`-prefixed. |
| `SQUARE_ENVIRONMENT` | `sandbox` or `production` — picks the Square host the proxy targets. |
| `SQUARE_LOCATION_ID` | Optional. Pin a single location. |
| `VITE_ANTHROPIC_API_KEY` | Optional. Enables the Claude-powered conversational agent. Without it, chat falls back to a small offline command parser. |
| `VITE_AGENT_MODEL` | Agent model id (default `claude-sonnet-5`). |

### How the Square token stays server-side

The browser calls `/api/square/v2/...`. `vite.config.ts` proxies that to
`connect.squareup(sandbox).com`, adding `Authorization: Bearer <SQUARE_ACCESS_TOKEN>`
in the dev server process. When this moves to production, replace that proxy with
a real backend function — the app code does not change.

## Architecture

```
src/
  config/env.ts             browser-visible config (no secrets)
  repositories/
    CatalogRepository.ts     the interface every surface talks to
    mock/                     in-memory fixtures implementation
    square/                   Square Catalog implementation + anti-corruption mapper
    RepositoryContext.tsx     picks mock vs square from VITE_DATA_SOURCE
  agent/
    catalogTools.ts           tool specs + dispatch → one CatalogRepository call each
    ClaudeAgent.ts            Anthropic tool-use loop, pauses for confirmation
    OfflineAgent.ts           no-key fallback: regex intents → same toolbox
    useAgent.ts               React hook wiring the loop to the chat UI
  features/
    chat/ChatView.tsx
    admin/AdminView.tsx, ItemEditor.tsx
```

The agent and the admin UI both go through `CatalogRepository` — the agent adds
no backend of its own. Swapping `MockCatalogRepository` for `SquareCatalogRepository`
is a one-line change in `RepositoryContext.tsx` (driven by env).

## Notes

- Mock writes are in-memory; a refresh reverts to fixtures.
- `DOMAIN.md` is the catalog model (a faithful projection of Square's Catalog API).
- No test framework yet — the repository/toolbox layer is thin and verified by eye.
