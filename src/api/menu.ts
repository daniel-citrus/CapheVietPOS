import type {
  Category,
  Item,
  Location,
  ModifierGroup,
  Money,
} from "shared/domain";
import type {
  CreateItemInput,
  CreateVariationInput,
  UpdateItemPatch,
  UpdateVariationPatch,
} from "shared/MenuStore";
import { apiFetch } from "./client";

const enc = encodeURIComponent;

/**
 * Typed calls to the backend's `/api/menu/*` endpoints — one function per
 * endpoint, no logic. The backend owns validation, the Square integration, and
 * the audit log; `client.ts` maps error responses to the typed `RepositoryError`
 * family so callers can `catch` them by type.
 *
 * Method shapes mirror the server's `MenuStore` interface
 * (`shared/MenuStore.ts`) — the input types are imported from there so the two
 * stay in sync.
 */
export const menuApi = {
  // --- locations ---------------------------------------------------------
  listLocations: (): Promise<Location[]> => apiFetch("/menu/locations"),

  // --- categories ------------------------------------------------------
  listCategories: (): Promise<Category[]> => apiFetch("/menu/categories"),

  createCategory: (input: { name: string }): Promise<Category> =>
    apiFetch("/menu/categories", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  renameCategory: (id: string, name: string): Promise<Category> =>
    apiFetch(`/menu/categories/${enc(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),

  // --- modifier groups ----------------------------------------------
  listModifierGroups: (): Promise<ModifierGroup[]> =>
    apiFetch("/menu/modifier-groups"),

  // --- items ------------------------------------------------------
  listItems: (opts?: { includeArchived?: boolean }): Promise<Item[]> =>
    apiFetch(
      `/menu/items${opts?.includeArchived ? "?includeArchived=true" : ""}`,
    ),

  getItem: (id: string): Promise<Item> => apiFetch(`/menu/items/${enc(id)}`),

  createItem: (input: CreateItemInput): Promise<Item> =>
    apiFetch("/menu/items", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateItem: (id: string, patch: UpdateItemPatch): Promise<Item> =>
    apiFetch(`/menu/items/${enc(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  setItemArchived: (id: string, archived: boolean): Promise<Item> =>
    apiFetch(`/menu/items/${enc(id)}/archived`, {
      method: "POST",
      body: JSON.stringify({ archived }),
    }),

  setItemImage: (id: string, imageUrl: string | null): Promise<Item> =>
    apiFetch(`/menu/items/${enc(id)}/image`, {
      method: "POST",
      body: JSON.stringify({ imageUrl }),
    }),

  // --- variations -----------------------------------------------
  addVariation: (itemId: string, input: CreateVariationInput): Promise<Item> =>
    apiFetch(`/menu/items/${enc(itemId)}/variations`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateVariation: (
    itemId: string,
    variationId: string,
    patch: UpdateVariationPatch,
  ): Promise<Item> =>
    apiFetch(
      `/menu/items/${enc(itemId)}/variations/${enc(variationId)}`,
      { method: "PATCH", body: JSON.stringify(patch) },
    ),

  removeVariation: (itemId: string, variationId: string): Promise<Item> =>
    apiFetch(
      `/menu/items/${enc(itemId)}/variations/${enc(variationId)}`,
      { method: "DELETE" },
    ),

  setVariationPrice: (
    itemId: string,
    variationId: string,
    price: Money,
  ): Promise<Item> =>
    apiFetch(
      `/menu/items/${enc(itemId)}/variations/${enc(variationId)}/price`,
      { method: "POST", body: JSON.stringify({ price }) },
    ),
};
