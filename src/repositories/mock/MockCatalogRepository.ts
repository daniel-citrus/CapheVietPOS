import type {
  Category,
  Item,
  Location,
  ModifierGroup,
  Money,
  Variation,
} from "../../domain";
import type {
  CatalogRepository,
  CreateItemInput,
  CreateVariationInput,
  UpdateItemPatch,
  UpdateVariationPatch,
} from "../CatalogRepository";
import { NotFoundError, ValidationError } from "../errors";
import * as fixtures from "./fixtures";

/** Simulated network latency so the UI exercises real loading states. */
const LATENCY_MS = 180;

const clone = <T>(value: T): T => structuredClone(value);
const delay = () => new Promise((r) => setTimeout(r, LATENCY_MS));

let idCounter = 1000;
const nextId = (prefix: string) => `${prefix}-${++idCounter}`;

/**
 * In-memory catalog repository for P1. Seeded from fixtures; mutations live only
 * for the session (a refresh reverts to fixtures — this is intentional per PLAN.md).
 * Returned objects are always deep-cloned so callers cannot mutate the store.
 */
export class MockCatalogRepository implements CatalogRepository {
  private locations: Location[];
  private categories: Category[];
  private modifierGroups: ModifierGroup[];
  private items: Item[];

  constructor() {
    this.locations = clone(fixtures.locations);
    this.categories = clone(fixtures.categories);
    this.modifierGroups = clone(fixtures.modifierGroups);
    this.items = clone(fixtures.items);
  }

  async listLocations(): Promise<Location[]> {
    await delay();
    return clone(this.locations);
  }

  async listCategories(): Promise<Category[]> {
    await delay();
    return clone(this.categories);
  }

  async createCategory(input: { name: string }): Promise<Category> {
    await delay();
    const name = input.name.trim();
    if (!name) throw new ValidationError("Category name is required");
    const category: Category = { id: nextId("CAT"), name };
    this.categories.push(category);
    return clone(category);
  }

  async renameCategory(id: string, name: string): Promise<Category> {
    await delay();
    const category = this.categories.find((c) => c.id === id);
    if (!category) throw new NotFoundError("Category", id);
    const trimmed = name.trim();
    if (!trimmed) throw new ValidationError("Category name is required");
    category.name = trimmed;
    return clone(category);
  }

  async listModifierGroups(): Promise<ModifierGroup[]> {
    await delay();
    return clone(this.modifierGroups);
  }

  async listItems(opts?: { includeArchived?: boolean }): Promise<Item[]> {
    await delay();
    const list = opts?.includeArchived
      ? this.items
      : this.items.filter((i) => !i.archived);
    return clone(list);
  }

  async getItem(id: string): Promise<Item> {
    await delay();
    const item = this.items.find((i) => i.id === id);
    if (!item) throw new NotFoundError("Item", id);
    return clone(item);
  }

  async createItem(input: CreateItemInput): Promise<Item> {
    await delay();
    const name = input.name.trim();
    if (!name) throw new ValidationError("Item name is required");
    if (!input.variations?.length) {
      throw new ValidationError("An item needs at least one variation");
    }
    this.assertModifierGroupsExist(input.modifierGroupIds ?? []);
    this.assertCategoryExists(input.categoryId);

    const itemId = nextId("ITEM");
    const item: Item = {
      id: itemId,
      name,
      description: input.description?.trim() || undefined,
      categoryId: input.categoryId,
      modifierGroupIds: [...(input.modifierGroupIds ?? [])],
      archived: false,
      variations: input.variations.map((v) => this.buildVariation(itemId, v)),
    };
    this.items.push(item);
    return clone(item);
  }

  async updateItem(id: string, patch: UpdateItemPatch): Promise<Item> {
    await delay();
    const item = this.mustGet(id);
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) throw new ValidationError("Item name is required");
      item.name = name;
    }
    if (patch.description !== undefined) {
      item.description = patch.description.trim() || undefined;
    }
    if (patch.categoryId !== undefined) {
      if (patch.categoryId === null) {
        item.categoryId = undefined;
      } else {
        this.assertCategoryExists(patch.categoryId);
        item.categoryId = patch.categoryId;
      }
    }
    if (patch.modifierGroupIds !== undefined) {
      this.assertModifierGroupsExist(patch.modifierGroupIds);
      item.modifierGroupIds = [...patch.modifierGroupIds];
    }
    return clone(item);
  }

  async setItemArchived(id: string, archived: boolean): Promise<Item> {
    await delay();
    const item = this.mustGet(id);
    item.archived = archived;
    return clone(item);
  }

  async addVariation(itemId: string, input: CreateVariationInput): Promise<Item> {
    await delay();
    const item = this.mustGet(itemId);
    item.variations.push(this.buildVariation(itemId, input));
    return clone(item);
  }

  async updateVariation(
    itemId: string,
    variationId: string,
    patch: UpdateVariationPatch,
  ): Promise<Item> {
    await delay();
    const item = this.mustGet(itemId);
    const variation = this.mustGetVariation(item, variationId);
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) throw new ValidationError("Variation name is required");
      variation.name = name;
    }
    if (patch.sku !== undefined) {
      variation.sku = patch.sku === null ? undefined : patch.sku.trim() || undefined;
    }
    return clone(item);
  }

  async removeVariation(itemId: string, variationId: string): Promise<Item> {
    await delay();
    const item = this.mustGet(itemId);
    if (item.variations.length <= 1) {
      throw new ValidationError("An item must keep at least one variation");
    }
    item.variations = item.variations.filter((v) => v.id !== variationId);
    return clone(item);
  }

  async setVariationPrice(
    itemId: string,
    variationId: string,
    price: Money,
  ): Promise<Item> {
    await delay();
    const item = this.mustGet(itemId);
    const variation = this.mustGetVariation(item, variationId);
    if (!Number.isInteger(price.amount) || price.amount < 0) {
      throw new ValidationError("Price must be a non-negative integer amount");
    }
    variation.price = { ...price };
    return clone(item);
  }

  async setItemImage(id: string, imageUrl: string | null): Promise<Item> {
    await delay();
    const item = this.mustGet(id);
    if (imageUrl === null) {
      item.imageUrl = undefined;
      return clone(item);
    }
    const trimmed = imageUrl.trim();
    if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("data:")) {
      throw new ValidationError("Image must be an http(s) URL or a data URI");
    }
    item.imageUrl = trimmed;
    return clone(item);
  }

  // --- internals ---------------------------------------------------------

  private mustGet(id: string): Item {
    const item = this.items.find((i) => i.id === id);
    if (!item) throw new NotFoundError("Item", id);
    return item;
  }

  private mustGetVariation(item: Item, variationId: string): Variation {
    const variation = item.variations.find((v) => v.id === variationId);
    if (!variation) throw new NotFoundError("Variation", variationId);
    return variation;
  }

  private buildVariation(itemId: string, input: CreateVariationInput): Variation {
    const name = input.name.trim();
    if (!name) throw new ValidationError("Variation name is required");
    return {
      id: nextId("VAR"),
      itemId,
      name,
      price: { ...input.price },
      sku: input.sku?.trim() || undefined,
      priceOverrides: [],
    };
  }

  private assertCategoryExists(categoryId?: string) {
    if (categoryId && !this.categories.some((c) => c.id === categoryId)) {
      throw new NotFoundError("Category", categoryId);
    }
  }

  private assertModifierGroupsExist(ids: string[]) {
    for (const id of ids) {
      if (!this.modifierGroups.some((g) => g.id === id)) {
        throw new NotFoundError("ModifierGroup", id);
      }
    }
  }
}
