import type {
  Category,
  Item,
  ModifierGroup,
  ModifierOption,
  Money,
  Variation,
} from "shared/domain";

/**
 * Anti-corruption layer between Square's CatalogObject shapes and the internal
 * domain model. Square specifics — the `type` discriminator, nested `*_data`
 * payloads, `version` numbers, temp `#` ids — are quarantined here. Components
 * and the agent never see any of it.
 *
 * Square API reference: https://developer.squareup.com/reference/square/objects/CatalogObject
 */

export interface SquareMoney {
  amount?: number;
  currency?: string;
}

export interface SquareCatalogObject {
  type: string;
  id: string;
  version?: number;
  is_deleted?: boolean;
  present_at_all_locations?: boolean;
  item_data?: SquareItemData;
  item_variation_data?: SquareItemVariationData;
  category_data?: { name?: string };
  modifier_list_data?: SquareModifierListData;
  modifier_data?: { name?: string; price_money?: SquareMoney };
  /** Only populated on type: "IMAGE" objects. */
  image_data?: { url?: string; name?: string };
}

interface SquareItemData {
  name?: string;
  description?: string;
  is_archived?: boolean;
  category_id?: string;
  categories?: { id: string }[];
  variations?: SquareCatalogObject[];
  modifier_list_info?: { modifier_list_id: string; enabled?: boolean }[];
  /** IDs of IMAGE catalog objects attached to this item; we use the first. */
  image_ids?: string[];
}

interface SquareItemVariationData {
  item_id?: string;
  name?: string;
  sku?: string;
  pricing_type?: string;
  price_money?: SquareMoney;
}

interface SquareModifierListData {
  name?: string;
  selection_type?: string;
  modifiers?: SquareCatalogObject[];
  min_selected_modifiers?: number;
  max_selected_modifiers?: number;
}

const DEFAULT_CURRENCY = "USD";

export function toMoney(m: SquareMoney | undefined): Money {
  return {
    amount: m?.amount ?? 0,
    currency: m?.currency ?? DEFAULT_CURRENCY,
  };
}

export function toSquareMoney(m: Money): SquareMoney {
  return { amount: m.amount, currency: m.currency };
}

export function categoryFromSquare(obj: SquareCatalogObject): Category {
  return { id: obj.id, name: obj.category_data?.name ?? "(unnamed)" };
}

export function variationFromSquare(obj: SquareCatalogObject): Variation {
  const d = obj.item_variation_data ?? {};
  return {
    id: obj.id,
    itemId: d.item_id ?? "",
    name: d.name ?? "(unnamed)",
    price: toMoney(d.price_money),
    sku: d.sku || undefined,
    priceOverrides: [],
  };
}

/**
 * @param imagesById Map of IMAGE catalog object id → hosted URL, resolved by
 * the caller (a list of IMAGE objects fetched or included alongside this
 * item — see SquareMenuAdapter). Omit if images weren't fetched.
 */
export function itemFromSquare(
  obj: SquareCatalogObject,
  imagesById?: Map<string, string>,
): Item {
  const d = obj.item_data ?? {};
  const categoryId =
    d.category_id ?? (d.categories && d.categories[0]?.id) ?? undefined;
  const imageId = d.image_ids?.[0];
  return {
    id: obj.id,
    name: d.name ?? "(unnamed)",
    description: d.description || undefined,
    categoryId,
    archived: d.is_archived ?? false,
    modifierGroupIds: (d.modifier_list_info ?? [])
      .filter((mli) => mli.enabled !== false)
      .map((mli) => mli.modifier_list_id),
    variations: (d.variations ?? []).map(variationFromSquare),
    imageUrl: imageId ? imagesById?.get(imageId) : undefined,
  };
}

export function modifierGroupFromSquare(obj: SquareCatalogObject): ModifierGroup {
  const d = obj.modifier_list_data ?? {};
  const single = d.selection_type !== "MULTIPLE";
  const options: ModifierOption[] = (d.modifiers ?? []).map((m) => ({
    id: m.id,
    modifierGroupId: obj.id,
    name: m.modifier_data?.name ?? "(unnamed)",
    priceDelta: toMoney(m.modifier_data?.price_money),
  }));
  return {
    id: obj.id,
    name: d.name ?? "(unnamed)",
    required: (d.min_selected_modifiers ?? 0) > 0,
    minSelect: d.min_selected_modifiers ?? 0,
    maxSelect: d.max_selected_modifiers ?? (single ? 1 : options.length || 1),
    options,
  };
}

/** Build the ITEM_VARIATION CatalogObject payload for an upsert. */
export function variationToSquare(
  v: Pick<Variation, "id" | "itemId" | "name" | "price" | "sku">,
  version: number | undefined,
  isNew: boolean,
): SquareCatalogObject {
  return {
    type: "ITEM_VARIATION",
    id: isNew ? `#${v.name || "variation"}-${Math.random().toString(36).slice(2, 8)}` : v.id,
    version,
    item_variation_data: {
      item_id: v.itemId || undefined,
      name: v.name,
      sku: v.sku,
      pricing_type: "FIXED_PRICING",
      price_money: toSquareMoney(v.price),
    },
  };
}
