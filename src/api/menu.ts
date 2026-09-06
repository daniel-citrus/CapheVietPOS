import type { MenuStore } from "shared/MenuStore";
import { apiFetch } from "./client";

const enc = encodeURIComponent;

/**
 * Typed calls to the backend's `/api/menu/*` endpoints — one function per
 * endpoint, no logic. The backend owns validation, the Square integration, and
 * the audit log; `client.ts` maps error responses to the typed `RepositoryError`
 * family so callers can `catch` them by type.
 *
 * `satisfies MenuStore` checks this object against the same port the server
 * adapters implement, so the client surface can't drift from it — method names,
 * arity, argument and return types are all verified, and each `apiFetch` return
 * type is inferred from the port.
 */
export const menuApi = {
  // --- locations ---------------------------------------------------------
  listLocations: () => apiFetch("/menu/locations"),

  // --- categories ------------------------------------------------------
  listCategories: () => apiFetch("/menu/categories"),

  createCategory: (input) =>
    apiFetch("/menu/categories", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  renameCategory: (id, name) =>
    apiFetch(`/menu/categories/${enc(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),

  // --- modifier groups ----------------------------------------------
  listModifierGroups: () => apiFetch("/menu/modifier-groups"),

  // --- items ------------------------------------------------------
  listItems: (opts) =>
    apiFetch(
      `/menu/items${opts?.includeArchived ? "?includeArchived=true" : ""}`,
    ),

  getItem: (id) => apiFetch(`/menu/items/${enc(id)}`),

  createItem: (input) =>
    apiFetch("/menu/items", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateItem: (id, patch) =>
    apiFetch(`/menu/items/${enc(id)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  setItemArchived: (id, archived) =>
    apiFetch(`/menu/items/${enc(id)}/archived`, {
      method: "POST",
      body: JSON.stringify({ archived }),
    }),

  setItemImage: (id, imageUrl) =>
    apiFetch(`/menu/items/${enc(id)}/image`, {
      method: "POST",
      body: JSON.stringify({ imageUrl }),
    }),

  // --- variations -----------------------------------------------
  addVariation: (itemId, input) =>
    apiFetch(`/menu/items/${enc(itemId)}/variations`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  updateVariation: (itemId, variationId, patch) =>
    apiFetch(`/menu/items/${enc(itemId)}/variations/${enc(variationId)}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  removeVariation: (itemId, variationId) =>
    apiFetch(`/menu/items/${enc(itemId)}/variations/${enc(variationId)}`, {
      method: "DELETE",
    }),

  setVariationPrice: (itemId, variationId, price) =>
    apiFetch(
      `/menu/items/${enc(itemId)}/variations/${enc(variationId)}/price`,
      { method: "POST", body: JSON.stringify({ price }) },
    ),
} satisfies MenuStore;
