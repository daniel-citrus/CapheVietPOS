import type {
  Category,
  Item,
  Location,
  ModifierGroup,
  Money,
  Variation,
} from "../domain";

/**
 * All data access goes through this interface. Components never import fixtures
 * directly. In P1 the implementation is MockCatalogRepository (in-memory, seeded
 * from JSON fixtures). In P2 it becomes HttpCatalogRepository calling the backend
 * proxy, which talks to Square. Every method is async and remote-call-shaped:
 * it returns plain domain objects and rejects with a RepositoryError on failure.
 */
export interface CatalogRepository {
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
