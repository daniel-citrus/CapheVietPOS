import type {
  Category,
  Item,
  Location,
  ModifierGroup,
  Money,
  Variation,
} from "shared/domain";

/**
 * The port for all menu data access. Server-side it is implemented by
 * `InMemoryMenuStore` (fixtures) or `SquareMenuStore` (the Square API), chosen
 * by `DATA_SOURCE` and wrapped per-request in `AuditedMenuStore`. The frontend
 * does not implement it — it calls the `/api/menu/*` endpoints via `menuApi`
 * (`src/api/menu.ts`), whose method shapes mirror this interface.
 *
 * Every method is async and remote-call-shaped: it returns plain domain objects
 * and rejects with a `RepositoryError` on failure.
 */
export interface MenuStore {
  // --- Locations -----------------------------------------------------------
  listLocations(): Promise<Location[]>;

  // --- Categories --------------------------------------------------------
  listCategories(): Promise<Category[]>;
  createCategory(input: { name: string }): Promise<Category>;
  renameCategory(id: string, name: string): Promise<Category>;

  // --- Modifier groups --------------------------------------------------
  listModifierGroups(): Promise<ModifierGroup[]>;

  // --- Items -----------------------------------------------------------
  /** @param opts.includeArchived defaults to false */
  listItems(opts?: { includeArchived?: boolean }): Promise<Item[]>;
  getItem(id: string): Promise<Item>;

  createItem(input: CreateItemInput): Promise<Item>;
  updateItem(id: string, patch: UpdateItemPatch): Promise<Item>;
  setItemArchived(id: string, archived: boolean): Promise<Item>;

  // --- Variations ------------------------------------------------------
  addVariation(itemId: string, input: CreateVariationInput): Promise<Item>;
  updateVariation(
    itemId: string,
    variationId: string,
    patch: UpdateVariationPatch,
  ): Promise<Item>;
  removeVariation(itemId: string, variationId: string): Promise<Item>;

  /** Pricing edit — kept as its own method because it is admin-gated and audited. */
  setVariationPrice(
    itemId: string,
    variationId: string,
    price: Money,
  ): Promise<Item>;

  /**
   * Set (or clear, passing null) an item's display image, by URL.
   * Kept as its own method — like setVariationPrice — because it maps to a
   * real capability, not general item fields. Square itself has no "set by
   * URL" operation (only its Images upload API), so implementations may
   * legitimately reject this; see InMemoryMenuStore vs
   * SquareMenuStore.
   */
  setItemImage(itemId: string, imageUrl: string | null): Promise<Item>;
}

export interface CreateItemInput {
  name: string;
  description?: string;
  categoryId?: string;
  modifierGroupIds?: string[];
  /** At least one variation is required, mirroring Square. */
  variations: CreateVariationInput[];
}

export interface UpdateItemPatch {
  name?: string;
  description?: string;
  categoryId?: string | null;
  modifierGroupIds?: string[];
}

export interface CreateVariationInput {
  name: string;
  price: Money;
  sku?: string;
}

export interface UpdateVariationPatch {
  name?: string;
  sku?: string | null;
}

export type { Variation };
