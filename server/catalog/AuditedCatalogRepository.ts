import { formatMoney, type CurrentUser, type Item, type Money } from "shared/domain";
import type { AuditLog } from "../audit/AuditLog";
import type {
  CatalogRepository,
  CreateItemInput,
  CreateVariationInput,
  UpdateItemPatch,
  UpdateVariationPatch,
} from "./CatalogRepository";

/**
 * Per-request decorator: passes reads straight through, and records an audit
 * entry around every mutation (who / what / when / before → after). The same
 * wrapper is used by the REST routes and the agent toolbox, so both paths log
 * identically.
 */
export class AuditedCatalogRepository implements CatalogRepository {
  private readonly inner: CatalogRepository;
  private readonly audit: AuditLog;
  private readonly actor: CurrentUser;

  constructor(inner: CatalogRepository, audit: AuditLog, actor: CurrentUser) {
    this.inner = inner;
    this.audit = audit;
    this.actor = actor;
  }

  // --- reads: pass through -------------------------------------------------
  listLocations() {
    return this.inner.listLocations();
  }
  listCategories() {
    return this.inner.listCategories();
  }
  listModifierGroups() {
    return this.inner.listModifierGroups();
  }
  listItems(opts?: { includeArchived?: boolean }) {
    return this.inner.listItems(opts);
  }
  getItem(id: string) {
    return this.inner.getItem(id);
  }

  // --- helpers ----------------------------------------------------------
  private log(
    action: string,
    entityType: "item" | "category" | "variation",
    entityId: string,
    summary: string,
    before?: unknown,
    after?: unknown,
  ): void {
    this.audit.record({
      actorRole: this.actor.role,
      actorId: this.actor.id,
      action,
      entityType,
      entityId,
      summary,
      before,
      after,
    });
  }

  private async itemBefore(id: string): Promise<Item | undefined> {
    try {
      return await this.inner.getItem(id);
    } catch {
      return undefined;
    }
  }

  // --- categories -----------------------------------------------------
  async createCategory(input: { name: string }) {
    const category = await this.inner.createCategory(input);
    this.log("createCategory", "category", category.id, `Created category "${category.name}"`, undefined, category);
    return category;
  }

  async renameCategory(id: string, name: string) {
    const category = await this.inner.renameCategory(id, name);
    this.log("renameCategory", "category", id, `Renamed category to "${category.name}"`, undefined, category);
    return category;
  }

  // --- items -------------------------------------------------------
  async createItem(input: CreateItemInput) {
    const item = await this.inner.createItem(input);
    this.log("createItem", "item", item.id, `Created item "${item.name}"`, undefined, item);
    return item;
  }

  async updateItem(id: string, patch: UpdateItemPatch) {
    const before = await this.itemBefore(id);
    const item = await this.inner.updateItem(id, patch);
    this.log("updateItem", "item", id, `Edited "${item.name}"`, before, item);
    return item;
  }

  async setItemArchived(id: string, archived: boolean) {
    const before = await this.itemBefore(id);
    const item = await this.inner.setItemArchived(id, archived);
    this.log(
      archived ? "archiveItem" : "unarchiveItem",
      "item",
      id,
      `${archived ? "Archived" : "Restored"} "${item.name}"`,
      before,
      item,
    );
    return item;
  }

  async setItemImage(id: string, imageUrl: string | null) {
    const before = await this.itemBefore(id);
    const item = await this.inner.setItemImage(id, imageUrl);
    this.log(
      "setItemImage",
      "item",
      id,
      imageUrl ? `Set image for "${item.name}"` : `Cleared image for "${item.name}"`,
      before,
      item,
    );
    return item;
  }

  // --- variations -----------------------------------------------
  async addVariation(itemId: string, input: CreateVariationInput) {
    const item = await this.inner.addVariation(itemId, input);
    this.log("addVariation", "variation", itemId, `Added "${input.name}" to "${item.name}"`, undefined, item);
    return item;
  }

  async updateVariation(
    itemId: string,
    variationId: string,
    patch: UpdateVariationPatch,
  ) {
    const before = await this.itemBefore(itemId);
    const item = await this.inner.updateVariation(itemId, variationId, patch);
    this.log("updateVariation", "variation", variationId, `Edited a variation of "${item.name}"`, before, item);
    return item;
  }

  async removeVariation(itemId: string, variationId: string) {
    const before = await this.itemBefore(itemId);
    const item = await this.inner.removeVariation(itemId, variationId);
    this.log("removeVariation", "variation", variationId, `Removed a variation from "${item.name}"`, before, item);
    return item;
  }

  async setVariationPrice(itemId: string, variationId: string, price: Money) {
    const before = await this.itemBefore(itemId);
    const oldVar = before?.variations.find((v) => v.id === variationId);
    const item = await this.inner.setVariationPrice(itemId, variationId, price);
    const newVar = item.variations.find((v) => v.id === variationId);
    const label = newVar ? `${item.name} (${newVar.name})` : item.name;
    const from = oldVar ? formatMoney(oldVar.price) : "—";
    this.log(
      "setVariationPrice",
      "variation",
      variationId,
      `${label} ${from} → ${formatMoney(price)}`,
      oldVar?.price,
      price,
    );
    return item;
  }
}
