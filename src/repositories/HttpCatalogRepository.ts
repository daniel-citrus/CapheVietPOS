import type {
  Category,
  Item,
  Location,
  ModifierGroup,
  Money,
} from "shared/domain";
import type {
  CatalogRepository,
  CreateItemInput,
  CreateVariationInput,
  UpdateItemPatch,
  UpdateVariationPatch,
} from "shared/CatalogRepository";
import { apiFetch } from "./apiClient";

const enc = encodeURIComponent;

/**
 * The frontend's `CatalogRepository` — one `fetch` to `/api/catalog/*` per
 * method. All the real work (Square, the mapper, validation, the audit log)
 * happens server-side; `apiClient` turns error responses back into the typed
 * `RepositoryError` family so callers are unchanged.
 */
export class HttpCatalogRepository implements CatalogRepository {
  listLocations(): Promise<Location[]> {
    return apiFetch("/catalog/locations");
  }

  listCategories(): Promise<Category[]> {
    return apiFetch("/catalog/categories");
  }

  createCategory(input: { name: string }): Promise<Category> {
    return apiFetch("/catalog/categories", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  renameCategory(id: string, name: string): Promise<Category> {
    return apiFetch(`/catalog/categories/${enc(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    });
  }

  listModifierGroups(): Promise<ModifierGroup[]> {
    return apiFetch("/catalog/modifier-groups");
  }

  listItems(opts?: { includeArchived?: boolean }): Promise<Item[]> {
    const qs = opts?.includeArchived ? "?includeArchived=true" : "";
    return apiFetch(`/catalog/items${qs}`);
  }

  getItem(id: string): Promise<Item> {
    return apiFetch(`/catalog/items/${enc(id)}`);
  }

  createItem(input: CreateItemInput): Promise<Item> {
    return apiFetch("/catalog/items", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateItem(id: string, patch: UpdateItemPatch): Promise<Item> {
    return apiFetch(`/catalog/items/${enc(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }

  setItemArchived(id: string, archived: boolean): Promise<Item> {
    return apiFetch(`/catalog/items/${enc(id)}/archived`, {
      method: "POST",
      body: JSON.stringify({ archived }),
    });
  }

  setItemImage(id: string, imageUrl: string | null): Promise<Item> {
    return apiFetch(`/catalog/items/${enc(id)}/image`, {
      method: "POST",
      body: JSON.stringify({ imageUrl }),
    });
  }

  addVariation(itemId: string, input: CreateVariationInput): Promise<Item> {
    return apiFetch(`/catalog/items/${enc(itemId)}/variations`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateVariation(
    itemId: string,
    variationId: string,
    patch: UpdateVariationPatch,
  ): Promise<Item> {
    return apiFetch(
      `/catalog/items/${enc(itemId)}/variations/${enc(variationId)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    );
  }

  removeVariation(itemId: string, variationId: string): Promise<Item> {
    return apiFetch(
      `/catalog/items/${enc(itemId)}/variations/${enc(variationId)}`,
      { method: "DELETE" },
    );
  }

  setVariationPrice(
    itemId: string,
    variationId: string,
    price: Money,
  ): Promise<Item> {
    return apiFetch(
      `/catalog/items/${enc(itemId)}/variations/${enc(variationId)}/price`,
      { method: "POST", body: JSON.stringify({ price }) },
    );
  }
}
