# Cà phê Việt — menu admin

A mobile-first admin app for a Vietnamese-branded coffee shop whose menu lives in
Square. It has **two surfaces behind one toggle** (top-right of every screen):

| Mode | What it is |
|---|---|
| **Assistant** (default) | Agent-first chat. You tell it what to do to the menu — "raise all cà phê sữa đá prices by 25¢", "add a large bạc xỉu at $5.50", "archive chè ba màu" — and approve each change on an **Apply / Skip** card. With `ANTHROPIC_API_KEY` set (server-side) it's Claude with tool use; without it, it falls back to a small offline command parser. |
| **Console** | The conventional admin console: Items (list / detail / create), Categories, Modifier groups, Pricing, and navigable Reporting / Analytics / Order-history scaffolds. Sidebar nav, role-gated edit actions. |

Both surfaces run against the same `CatalogRepository`, so a change made in one
shows up in the other.

```
npm install
cp .env.example .env.local   # then fill in values
npm run dev
```

Defaults to `VITE_DATA_SOURCE=mock` (in-memory fixtures, no token needed).

## Configuration (`.env.local`)

| Variable | Purpose |
|---|---|
| `VITE_DATA_SOURCE` | `mock` (fixtures, default) or `square` (live catalog via the dev proxy). |
| `SQUARE_ACCESS_TOKEN` | Square access token. **Read only by the Vite dev server** (`vite.config.ts`) and injected into `/api/square/*` requests — never bundled into the browser, never `VITE_`-prefixed. |
| `SQUARE_ENVIRONMENT` | `sandbox` or `production` — picks the Square host. |
| `SQUARE_LOCATION_ID` | Optional. Pin a single location. |
| `ANTHROPIC_API_KEY` | Optional. Anthropic API key. **Read only by the Vite dev server** and injected into `/api/anthropic/*` requests — never bundled into the browser, never `VITE_`-prefixed. Enables the Claude-powered assistant; without it, chat uses the offline parser. |
| `VITE_AGENT_MODEL` | Agent model id (default `claude-sonnet-5`). Not a secret — safe to bundle. |

### Keys stay server-side only

Both external calls go through the Vite dev server, never straight from the
browser:

- **Square:** the browser calls `/api/square/v2/...`; `vite.config.ts` proxies
  that to `connect.squareup(sandbox).com`, adding
  `Authorization: Bearer <SQUARE_ACCESS_TOKEN>` in the dev-server process.
- **Anthropic:** the browser calls `/api/anthropic/v1/...` with **no** auth
  header at all (`ClaudeAgent` constructs the SDK with
  `defaultHeaders: { "X-Api-Key": null }`, which tells the SDK the header is
  intentionally omitted rather than missing); the proxy adds
  `x-api-key: <ANTHROPIC_API_KEY>` before forwarding to `api.anthropic.com`.
  Streaming responses pass through untouched. A tiny `/api/anthropic-status`
  endpoint lets the client ask "is a key configured?" — it returns a boolean,
  never the key — so the UI can decide Claude vs. the offline parser without
  ever holding a secret.

Neither key is declared in `src/vite-env.d.ts`, so referencing
`import.meta.env.ANTHROPIC_API_KEY` (or the Square token) from client code is a
type error, not just a convention.

Moving to production means replacing these dev-server proxies with a real
backend (serverless function or otherwise) that does the same header
injection — the app code does not change.

### Freezing a real menu as fixtures (optional)

`npm run export:catalog` pulls the real catalog + locations from Square once
(using `SQUARE_ACCESS_TOKEN` from `.env.local`) and writes
`src/repositories/mock/fixtures.generated.json`. The mock repository picks it up
automatically. Orders and customers are never pulled.

## Architecture

```
src/
  config/env.ts                browser-visible config (no secrets)
  config/agentAvailability.ts  asks /api/anthropic-status; never sees the key itself
  settings/SettingsContext    persists the Assistant/Console mode + confirm toggle
  repositories/
    CatalogRepository.ts       the interface both surfaces talk to
    mock/                      in-memory fixtures implementation
    square/                    Square Catalog implementation + anti-corruption mapper
    RepositoryContext.tsx      picks mock vs square from VITE_DATA_SOURCE
  agent/
    catalogTools.ts            tool specs + dispatch → one CatalogRepository call each
    ClaudeAgent.ts             Anthropic tool-use loop, pauses for confirmation
    OfflineAgent.ts            no-key fallback: regex intents → same toolbox
    useAgent.ts                React hook wiring the loop to the chat UI
  features/
    assistant/AssistantView    mobile chat shell (mode toggle lives in its header)
    chat/ChatView              the transcript + composer + confirmation cards
  layout/AppShell               conventional console shell (sidebar + mode toggle)
  routes/                       console pages (catalog / pricing / reports)
  components/ModeToggle         the Assistant ⟷ Console switch, in both shells
```

The agent adds no backend of its own — its tools call the same repository the
console uses. Swapping `MockCatalogRepository` for `SquareCatalogRepository` is
env-driven in `RepositoryContext.tsx`.

See **`ARCHITECTURE.md`** for the layer / request-flow / phase diagrams.

## Notes

- Visual language is matched to the **Phin POS** kiosk: warm cream ground,
  lacquer-maroon primary, brass accent, sage for confirm actions; flat surfaces
  with inset hairline rings (no drop shadows); Lora display / Be Vietnam Pro
  interface (loaded from Google Fonts); quick tactile press feedback;
  `prefers-reduced-motion` respected. Tokens live at the top of `src/index.css`.
- Mock writes are in-memory; a refresh reverts to fixtures.
- Light theme only for now, so the two surfaces stay visually coherent.
- `DOMAIN.md` is the catalog model (a faithful projection of Square's Catalog API).
- No test framework yet — the repository/toolbox layer is thin and verified by eye.
