import type { Money } from "./money";

/**
 * The internal menu model is a faithful, ergonomic projection of Square's
 * Catalog API. It must never express anything Square cannot: no combos/bundles,
 * no channel or time-based pricing, no nested modifiers.
 *
 * See DOMAIN.md for the mapping to Square CatalogObject types.
 */

export interface Category {
  id: string;
  name: string;
}

/** A price that applies only at a specific location, overriding the base price. */
export interface PriceOverride {
  locationId: string;
  price: Money;
}

/**
 * The priced, sellable unit. Maps to Square ITEM_VARIATION.
 * "Size" (M/L) lives here — it is a Square item option that produces variations.
 */
export interface Variation {
  id: string;
  itemId: string;
  name: string;
  price: Money;
  sku?: string;
  /** Model-level in P1; the editing UI is deferred until a second location exists. */
  priceOverrides: PriceOverride[];
}

/** Maps to Square ITEM. */
export interface Item {
  id: string;
  name: string;
  description?: string;
  categoryId?: string;
  variations: Variation[];
  /** References to reusable, business-level ModifierGroups. */
  modifierGroupIds: string[];
  archived: boolean;
  /**
   * Display image. Maps to Square's item_data.image_ids[0], resolved to its
   * CatalogImage URL. Square only supports attaching an image via its Images
   * API (real file upload); this app can read whatever's already there, but
   * setting a new one by URL only works against the in-memory store — see
   * MenuStore.setItemImage.
   */
  imageUrl?: string;
}

/** Maps to Square MODIFIER. */
export interface ModifierOption {
  id: string;
  modifierGroupId: string;
  name: string;
  /** May be zero (e.g. sugar level). */
  priceDelta: Money;
}

/**
 * Business-level, reusable across items. Maps to a Square modifier list.
 * Selection constraints mirror Square's selection_type / min-max-modifiers.
 */
export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  minSelect: number;
  /** 1 => single-select; > 1 => multi-select. */
  maxSelect: number;
  options: ModifierOption[];
}

/** Resolve the effective price of a variation at a given location. */
export function effectivePrice(variation: Variation, locationId?: string): Money {
  if (!locationId) return variation.price;
  const override = variation.priceOverrides.find((o) => o.locationId === locationId);
  return override ? override.price : variation.price;
}
