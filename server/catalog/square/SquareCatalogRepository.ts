import type {
  Category,
  Item,
  Location,
  ModifierGroup,
  Money,
} from "shared/domain";
import { config } from "../../config";
import type {
  CatalogRepository,
  CreateItemInput,
  CreateVariationInput,
  UpdateItemPatch,
  UpdateVariationPatch,
} from "shared/CatalogRepository";
import { NotFoundError, RepositoryError, ValidationError } from "shared/errors";
import {
  categoryFromSquare,
  itemFromSquare,
  modifierGroupFromSquare,
  toSquareMoney,
  variationToSquare,
  type SquareCatalogObject,
} from "./mapper";

/**
 * Talks to Square's Catalog API directly (server-side), setting the access
 * token from `config.square`. The browser never sees this — it calls the
 * backend's `/api/catalog/*` routes.
 *
 * Writes retrieve the current object first (for its `version`), mutate the
 * tree, and upsert the whole item — Square's optimistic-concurrency model.
 */
export class SquareCatalogRepository implements CatalogRepository {
  private async request<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${config.square.apiBase}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.square.token}`,
          "Square-Version": config.square.version,
          ...init?.headers,
        },
      });
    } catch (cause) {
      throw new RepositoryError(
        "Could not reach Square (is SQUARE_ACCESS_TOKEN set and valid?)",
        { cause },
      );
    }
    const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const errors = (body.errors as { detail?: string }[] | undefined) ?? [];
      const detail = errors.map((e) => e.detail).filter(Boolean).join("; ");
      if (res.status === 404) throw new NotFoundError("Catalog object", path);
      if (res.status === 400) {
        throw new ValidationError(detail || "Square rejected the request");
      }
      throw new RepositoryError(
        detail || `Square error ${res.status}`,
      );
    }
    return body as T;
  }

  private async listByType(type: string): Promise<SquareCatalogObject[]> {
    const out: SquareCatalogObject[] = [];
    let cursor: string | undefined;
    do {
      const qs = new URLSearchParams({ types: type });
      if (cursor) qs.set("cursor", cursor);
      const page = await this.request<{
        objects?: SquareCatalogObject[];
        cursor?: string;
      }>(`/catalog/list?${qs.toString()}`);
      out.push(...(page.objects ?? []));
      cursor = page.cursor;
    } while (cursor);
    return out.filter((o) => !o.is_deleted);
  }

  private async retrieveObject(
    id: string,
    includeRelated = false,
  ): Promise<SquareCatalogObject> {
    const data = await this.request<{ object?: SquareCatalogObject }>(
      `/catalog/object/${id}?include_related_objects=${includeRelated}`,
    );
    if (!data.object) throw new NotFoundError("Catalog object", id);
    return data.object;
  }

  private async upsert(
    object: SquareCatalogObject,
  ): Promise<SquareCatalogObject> {
    const data = await this.request<{ catalog_object?: SquareCatalogObject }>(
      `/catalog/object`,
      {
        method: "POST",
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          object,
        }),
      },
    );
    if (!data.catalog_object) {
      throw new RepositoryError("Square did not return the upserted object");
    }
    return data.catalog_object;
  }

  // --- Locations --------------------------------------------------------
  async listLocations(): Promise<Location[]> {
    const data = await this.request<{
      locations?: { id: string; name?: string; status?: string }[];
    }>(`/locations`);
    return (data.locations ?? []).map((l) => ({
      id: l.id,
      name: l.name ?? "(unnamed)",
      status: l.status === "ACTIVE" ? "active" : "inactive",
    }));
  }

  // --- Categories ------------------------------------------------------
  async listCategories(): Promise<Category[]> {
    return (await this.listByType("CATEGORY")).map(categoryFromSquare);
  }

  async createCategory(input: { name: string }): Promise<Category> {
    const name = input.name.trim();
    if (!name) throw new ValidationError("Category name is required");
    const created = await this.upsert({
      type: "CATEGORY",
      id: `#${name}`,
      category_data: { name },
    });
    return categoryFromSquare(created);
  }

  async renameCategory(id: string, name: string): Promise<Category> {
    if (!name.trim()) throw new ValidationError("Category name is required");
    const current = await this.retrieveObject(id);
    const updated = await this.upsert({
      ...current,
      category_data: { ...current.category_data, name: name.trim() },
    });
    return categoryFromSquare(updated);
  }

  // --- Modifier groups ----------------------------------------------
  async listModifierGroups(): Promise<ModifierGroup[]> {
    return (await this.listByType("MODIFIER_LIST")).map(modifierGroupFromSquare);
  }

  // --- Items -------------------------------------------------------
  async listItems(opts?: { includeArchived?: boolean }): Promise<Item[]> {
    const objects = await this.listByType("ITEM");
    const needsImages = objects.some(
      (o) => (o.item_data?.image_ids?.length ?? 0) > 0,
    );
    const images = needsImages
      ? this.imageMap(await this.listByType("IMAGE"))
      : new Map<string, string>();
    const items = objects.map((o) => itemFromSquare(o, images));
    return opts?.includeArchived ? items : items.filter((i) => !i.archived);
  }

  async getItem(id: string): Promise<Item> {
    // include_related_objects=true returns any attached IMAGE objects inline,
    // so a single-item fetch doesn't need a second round trip.
    const data = await this.request<{
      object?: SquareCatalogObject;
      related_objects?: SquareCatalogObject[];
    }>(`/catalog/object/${id}?include_related_objects=true`);
    if (!data.object) throw new NotFoundError("Catalog object", id);
    return itemFromSquare(data.object, this.imageMap(data.related_objects ?? []));
  }

  private imageMap(objects: SquareCatalogObject[]): Map<string, string> {
    const map = new Map<string, string>();
    for (const o of objects) {
      if (o.type === "IMAGE" && o.image_data?.url) map.set(o.id, o.image_data.url);
    }
    return map;
  }

  async createItem(input: CreateItemInput): Promise<Item> {
    if (!input.name.trim()) throw new ValidationError("Item name is required");
    if (!input.variations?.length) {
      throw new ValidationError("An item needs at least one variation");
    }
    const object: SquareCatalogObject = {
      type: "ITEM",
      id: `#${input.name.trim()}`,
      item_data: {
        name: input.name.trim(),
        description: input.description?.trim() || undefined,
        categories: input.categoryId ? [{ id: input.categoryId }] : undefined,
        modifier_list_info: (input.modifierGroupIds ?? []).map((mid) => ({
          modifier_list_id: mid,
          enabled: true,
        })),
        variations: input.variations.map((v) =>
          variationToSquare(
            { id: "", itemId: "", name: v.name, price: v.price, sku: v.sku },
            undefined,
            true,
          ),
        ),
      },
    };
    return itemFromSquare(await this.upsert(object));
  }

  async updateItem(id: string, patch: UpdateItemPatch): Promise<Item> {
    const current = await this.retrieveObject(id);
    const data = { ...current.item_data };
    if (patch.name !== undefined) {
      if (!patch.name.trim()) throw new ValidationError("Item name is required");
      data.name = patch.name.trim();
    }
    if (patch.description !== undefined) {
      data.description = patch.description?.trim() || undefined;
    }
    if (patch.categoryId !== undefined) {
      data.categories = patch.categoryId ? [{ id: patch.categoryId }] : [];
      data.category_id = patch.categoryId ?? undefined;
    }
    if (patch.modifierGroupIds !== undefined) {
      data.modifier_list_info = patch.modifierGroupIds.map((mid) => ({
        modifier_list_id: mid,
        enabled: true,
      }));
    }
    return itemFromSquare(await this.upsert({ ...current, item_data: data }));
  }

  async setItemArchived(id: string, archived: boolean): Promise<Item> {
    const current = await this.retrieveObject(id);
    return itemFromSquare(
      await this.upsert({
        ...current,
        item_data: { ...current.item_data, is_archived: archived },
      }),
    );
  }

  // --- Variations -------------------------------------------------
  async addVariation(
    itemId: string,
    input: CreateVariationInput,
  ): Promise<Item> {
    const current = await this.retrieveObject(itemId);
    const variations = current.item_data?.variations ?? [];
    variations.push(
      variationToSquare(
        {
          id: "",
          itemId,
          name: input.name,
          price: input.price,
          sku: input.sku,
        },
        undefined,
        true,
      ),
    );
    return itemFromSquare(
      await this.upsert({
        ...current,
        item_data: { ...current.item_data, variations },
      }),
    );
  }

  async updateVariation(
    itemId: string,
    variationId: string,
    patch: UpdateVariationPatch,
  ): Promise<Item> {
    const current = await this.retrieveObject(itemId);
    const variation = current.item_data?.variations?.find(
      (v) => v.id === variationId,
    );
    if (!variation) throw new NotFoundError("Variation", variationId);
    variation.item_variation_data = {
      ...variation.item_variation_data,
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.sku !== undefined ? { sku: patch.sku ?? undefined } : {}),
    };
    return itemFromSquare(await this.upsert(current));
  }

  async removeVariation(itemId: string, variationId: string): Promise<Item> {
    const current = await this.retrieveObject(itemId);
    const variations = current.item_data?.variations ?? [];
    if (variations.length <= 1) {
      throw new ValidationError("An item must keep at least one variation");
    }
    return itemFromSquare(
      await this.upsert({
        ...current,
        item_data: {
          ...current.item_data,
          variations: variations.filter((v) => v.id !== variationId),
        },
      }),
    );
  }

  async setVariationPrice(
    itemId: string,
    variationId: string,
    price: Money,
  ): Promise<Item> {
    if (price.amount < 0) throw new ValidationError("Price cannot be negative");
    const current = await this.retrieveObject(itemId);
    const variation = current.item_data?.variations?.find(
      (v) => v.id === variationId,
    );
    if (!variation) throw new NotFoundError("Variation", variationId);
    variation.item_variation_data = {
      ...variation.item_variation_data,
      pricing_type: "FIXED_PRICING",
      price_money: toSquareMoney(price),
    };
    return itemFromSquare(await this.upsert(current));
  }

  async setItemImage(_itemId: string, _imageUrl: string | null): Promise<Item> {
    // Square has no "attach an image by URL" operation — only its Images API,
    // which takes an uploaded file (multipart) and returns a CatalogImage id
    // to attach to the item. That upload flow isn't implemented in this dev
    // proxy. Reading an image already attached in Square works (see
    // listItems/getItem); setting one from this app doesn't, yet.
    throw new ValidationError(
      "Setting an item's image against Square isn't supported yet — Square requires uploading a file via its Images API, not a URL. Add or change the image in Square directly.",
    );
  }
}
