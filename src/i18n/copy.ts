/**
 * i18n seam. Every user-facing UI string goes through `t()`. English only in P1;
 * adding Vietnamese later is a second dictionary object + a language switch, with
 * zero component changes.
 *
 * Product data (item names like "Cà phê sữa đá") is content from the catalog, NOT
 * UI chrome — it is never routed through here.
 */
const en = {
  "app.title": "Cà phê Việt Admin",
  "app.env.mock": "Mock data — changes are not saved",

  "nav.catalog": "Catalog",
  "nav.items": "Items",
  "nav.categories": "Categories",
  "nav.modifierGroups": "Modifier groups",
  "nav.pricing": "Pricing",
  "nav.reporting": "Reporting",
  "nav.analytics": "Analytics",
  "nav.orders": "Order history",

  "role.admin": "Admin",
  "role.staff": "Staff",
  "role.switcher.label": "View as",

  "common.save": "Save",
  "common.cancel": "Cancel",
  "common.create": "Create",
  "common.edit": "Edit",
  "common.delete": "Delete",
  "common.add": "Add",
  "common.archive": "Archive",
  "common.unarchive": "Unarchive",
  "common.loading": "Loading…",
  "common.none": "None",
  "common.required": "Required",
  "common.optional": "Optional",
  "common.retry": "Retry",
  "common.readOnlyNotice": "You have view-only access. Ask an admin to make changes.",

  "items.title": "Items",
  "items.new": "New item",
  "items.search": "Search items",
  "items.showArchived": "Show archived",
  "items.empty": "No items yet.",
  "items.col.name": "Name",
  "items.col.category": "Category",
  "items.col.variations": "Variations",
  "items.col.priceRange": "Price",
  "items.col.status": "Status",
  "items.status.active": "Active",
  "items.status.archived": "Archived",

  "item.section.image": "Image",
  "item.section.details": "Details",
  "item.section.variations": "Variations",
  "item.section.modifierGroups": "Modifier groups",
  "item.image.url": "Image URL",
  "item.image.hint": "Falls back to a generated placeholder when empty.",
  "item.image.squareNotice":
    "Managed in Square — this app can show an existing image but can't set a new one yet (Square requires uploading a file, not a URL).",
  "item.field.name": "Name",
  "item.field.description": "Description",
  "item.field.category": "Category",
  "item.variation.name": "Variation",
  "item.variation.price": "Price",
  "item.variation.sku": "SKU",
  "item.variation.add": "Add variation",
  "item.variation.remove": "Remove",
  "item.variation.minOne": "An item must keep at least one variation.",
  "item.modifierGroups.help":
    "Attach reusable modifier groups (sugar level, ice level, toppings).",
  "item.created": "Item created.",
  "item.saved": "Changes saved.",

  "categories.title": "Categories",
  "categories.new": "New category",
  "categories.empty": "No categories yet.",
  "categories.field.name": "Category name",

  "modifierGroups.title": "Modifier groups",
  "modifierGroups.subtitle":
    "Defined at the business level and reused across items. Editing groups is out of scope for P1.",
  "modifierGroups.col.name": "Name",
  "modifierGroups.col.rule": "Selection rule",
  "modifierGroups.col.options": "Options",
  "modifierGroups.rule.required": "Required",
  "modifierGroups.rule.single": "Choose 1",
  "modifierGroups.rule.multi": "Choose up to {max}",
  "modifierGroups.rule.optional": "Optional",

  "pricing.title": "Pricing",
  "pricing.subtitle": "Edit the base price of each sellable variation.",
  "pricing.col.item": "Item",
  "pricing.col.variation": "Variation",
  "pricing.col.price": "Base price",
  "pricing.saved": "Price updated.",
  "pricing.invalid": "Enter a valid amount, e.g. 4.50",

  "reporting.title": "Reporting",
  "analytics.title": "Analytics",
  "orders.title": "Order history",
  "scaffold.noData.title": "No data yet",
  "scaffold.noData.body":
    "Sales and order data appears here once the Square backend is connected (P2). P1 does not pull live revenue or customer data.",

  "error.generic": "Something went wrong.",
  "notFound.title": "Page not found",
} as const;

export type CopyKey = keyof typeof en;

const dictionary: Record<CopyKey, string> = en;

/** Translate a key, with optional {placeholder} interpolation. */
export function t(key: CopyKey, vars?: Record<string, string | number>): string {
  let str: string = dictionary[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}
