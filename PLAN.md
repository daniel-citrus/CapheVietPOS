# Cà phê Việt — Admin Console Plan

_Last updated: 2026-09-03. Product: back-office admin console for a US-based, Vietnamese-branded coffee business. Square is the system of record._

> **Status note (2026-09-06):** this plan has been overtaken by events. The app
> now has a real **Fastify backend** (`server/`) that owns the catalog
> repository, the Square integration, the agent tool-loop, permission checks,
> and a SQLite audit log; the React SPA talks only to `/api/*`. That collapses
> most of P2 and P3 below. The agent (planned as P4) was built early against the
> mock/Square repository. See **`ARCHITECTURE.md`** for what actually exists.
> Still stubbed: real auth (an `X-Role` header stands in), deployment.

## Product framing

- This is the **back-office admin console** (menu/catalog management, pricing, reporting), **not** the register/cashier screen. The register is a separate future surface.
- Long-term vision: an **agent-first (chat) admin UI** where an LLM performs admin tasks (manage items, update prices, etc.) against Square, plus a conventional UI as the permanent fallback and QA oracle.
- Build order is deliberately **conventional UI first, agent last** — the conventional UI defines and proves the operations the agent will later call.

## P1 — Conventional admin UI, backend-deferred

Local-only, production-quality React frontend against a mock data layer, designed so the real Square integration swaps in cleanly later.

### Stack

- React + TypeScript + Vite + React Router + Tailwind
- `repositories/` folder for all data access (no direct fixture imports in components)
- i18n seam from day one (`copy.ts` or `react-i18next`), **English strings only** — Vietnamese is a later file, not a refactor
- **No test framework in P1** (add Vitest at P2)
- ~5 runtime dependencies

### In scope

| Module | Depth |
|---|---|
| Catalog / item management — list, view, create, edit, archive; variations; attach/detach modifier groups; categories | Full |
| Pricing — edit variation prices | Full |
| Stubbed auth + role switcher — **admin** (full access) / **staff** (view-only) | Full |
| Reporting & analytics | Navigable scaffold, honest empty states, no fake charts |
| Order history | Navigable scaffold, honest empty states |

### Out of scope for P1

- Location switcher & per-location price-override UI (domain model still carries `locationId`; one implicit location; this UI ships with the second real location)
- Feature flags (removed from plan for now)
- Refund processing (removed entirely)
- Inventory, team/shifts/payroll, customers/loyalty
- Any real Square API calls from the app
- The agent
- Deployment / hosting (local `npm run dev` only)
- Defining brand-new modifier groups from scratch — fixture-only or a thin flow is acceptable

### Data / fixtures

- Real **catalog + locations** pulled **once** via a standalone local Node script using a Square **production token**.
  - Token lives in an **untracked `.env.local`** (gitignore before pasting).
  - Token is **never** imported into app code and **never** `VITE_`-prefixed.
  - Use read-only scope (`ITEMS_READ`, `MERCHANT_PROFILE_READ`) if possible; rotate the token after the export.
- **Orders and customers are NOT pulled** (live revenue data + PII). No synthetic order generator for now — reporting stays scaffold-only.
- Fixtures are frozen static JSON read by the mock repository.

### Behavior

- Mock repository **writes are in-memory only** — refresh reverts to fixtures. Real persistence arrives with the backend.
- Repository interface is **`async`, remote-call-shaped**: methods return plain domain objects, errors are rejected promises. This makes `MockRepository` → `HttpRepository` invisible to components.

### P1 done when

1. Full catalog lifecycle works in the UI: browse → open item → edit name/category/variations/modifier groups → change price → archive → create new item. No console errors.
2. Stubbed role switcher actually gates screens (staff cannot reach pricing or edit actions).
3. Reporting, analytics, order history exist as navigable scaffolds with honest empty states.
4. Repository interface is clean enough that the P2 `HttpRepository` swap can be described in a paragraph.
5. `DOMAIN.md` documents the model — the artifact that outlives P1 and feeds both the backend and the agent's tool spec.
6. Gut check: you sit in front of it and it's how you'd actually manage the menu — or you've learned specifically why not.

## Post-P1 sequence

1. **P2 — Backend proxy + real Square reads.** Thin serverless function holds the Square token server-side. `HttpRepository` replaces the mock for reads. App shows the live menu; still read-only. Add Vitest here.
2. **P3 — Real Square writes + auth + audit.** Proxy gains write endpoints; P1 edit flows persist to Square. Real auth (Square OAuth or Clerk). Immutable audit log (who changed what, when) — designed with the agent already in mind.
3. **P4 — Agent chat UI.** Chat interface over the *same* repository operations — each tool maps to one repository method. Human-in-the-loop confirmation on every mutation. Conventional UI stays as fallback and oracle. The agent needs no backend of its own; P3's audited writes are what unblock it.

## Risks

| Risk | Mitigation |
|---|---|
| Production Square token mishandled (broad scope, shell history, accidental commit) | Read-only scope; gitignore before paste; one-time use; rotate after; never imported into app build |
| No tests — repository/domain layer (future agent tool layer) has no safety net | Keep domain logic thin and verifiable by eye; add Vitest at P2 |
| "Domain model is the deliverable" with no written spec | `DOMAIN.md` is a P1 exit artifact |
| In-memory-only writes block a real "set up my menu" session | Accepted for P1; revisit if stakeholder testing needs persistence before P2 |
| Agent (P4) holds admin-level mutation power | Design P3 audit log + permission checks with the agent in mind |

## Open items

- **Ownership** — assumed solo build. No owner-per-component split.
- **P1 exit sign-off** — no external stakeholder review scheduled; acceptable for a use-case-fleshing build, revisit before P3.
