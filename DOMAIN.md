# Domain Model

_The internal domain model is a faithful, ergonomic projection of Square's Catalog capabilities. **It must never express anything Square cannot.** No combos/bundles (Square Catalog has no such object). Money is integer minor units + currency code._

The model is consumed by:
- P1 conventional admin UI (via `MockRepository`)
- P2+ `HttpRepository` → backend proxy → Square (via an anti-corruption / mapping layer)
- P4 agent — each agent tool maps to one repository method operating on these types

## Anti-corruption layer

Square specifics are quarantined in one mapper per aggregate. The mapper handles:
- `CatalogObject` `type` discriminator and nested `*_data` payloads
- temp IDs (`#name`) vs real IDs on create
- optimistic-concurrency `version` numbers
- batch-upsert endpoint semantics
- money as `{ amount, currency }` integer cents

Components and the agent never see any of the above.

## Entities

### Money
```
Money { amount: number (minor units, e.g. cents), currency: string (e.g. "USD") }
```

### Location
```
Location {
  id
  name
  status: active | inactive
}
```
One real location today. Model carries `locationId` on location-scoped data from day one; per-location UI (switcher, price overrides) is deferred to the second real location.

### Category
```
Category {
  id
  name
}
```
Business-level. Maps to Square `CATEGORY`.

### Item
```
Item {
  id
  name
  description?
  categoryId?
  variations: Variation[]        // the priced, sellable units
  modifierGroupIds: string[]     // references to reusable business-level ModifierGroups
  archived: boolean
}
```
Maps to Square `ITEM`. "Size" is NOT here — size is an item option that produces distinct variations.

### Variation
```
Variation {
  id
  itemId
  name                 // e.g. "M", "L"  (from a Square item option such as Size)
  price: Money         // base price for this sellable unit
  sku?
  priceOverrides: { locationId: string, price: Money }[]   // model-level now; UI deferred
}
```
Maps to Square `ITEM_VARIATION`. The priced SKU. Price genuinely differs by size, so size lives here.

### ModifierGroup
```
ModifierGroup {
  id
  name                 // e.g. "Sugar level", "Ice level", "Toppings"
  required: boolean
  minSelect: number
  maxSelect: number    // 1 => single-select; >1 or unbounded => multi-select
  options: ModifierOption[]
}
```
Business-level, reusable across items. Maps to Square modifier list. Selection constraints mirror Square's `selection_type` / min-max-modifiers.

Typical café usage:
- Sugar level (0–100%): `required`, `minSelect: 1`, `maxSelect: 1`, all options `priceDelta: 0`
- Ice level: same shape as sugar
- Toppings (trân châu, thạch, kem cheese): not required, `maxSelect > 1`, each option carries a `priceDelta`

### ModifierOption
```
ModifierOption {
  id
  modifierGroupId
  name
  priceDelta: Money    // may be zero
}
```
Maps to Square `MODIFIER`.

## Roles (P1, stubbed)

```
Role = "admin" | "staff"
```
- **admin** — full access to all screens and mutations
- **staff** — view-only; cannot reach pricing, cannot perform any create/edit/archive action

Carried on the repository call context (`currentUser`) so it can feed the P3 audit trail.

## Not modeled (and why)

| Concept | Reason |
|---|---|
| Combos / bundles / set meals | Square Catalog has no bundle object |
| Feature flags | Removed from plan for now |
| Refunds | Removed from plan |
| Inventory counts / recipes / BOM | Out of scope until a later phase |
| Customers / loyalty | Out of scope |
| Orders (as writable) | P1 order history is a read-only scaffold; no order data pulled |
| Channel pricing (dine-in vs delivery), happy-hour pricing | Not in P1; add only via mechanisms Square supports |
