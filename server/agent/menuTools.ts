import type { ToolResult } from "shared/api";
import type { Item } from "shared/domain";
import { formatMoney, parseMoney } from "shared/domain";
import { RepositoryError } from "shared/errors";
import type { MenuStore } from "shared/MenuStore";

export type { ToolResult };

/**
 * The agent's tool surface. Each tool maps to one or a few MenuStore calls —
 * the same operations the conventional admin UI performs. Mutating tools are
 * flagged so the chat can gate them behind human confirmation.
 */

export interface ToolSpec {
  name: string;
  description: string;
  mutates: boolean;
  input_schema: Record<string, unknown>;
}

export const toolSpecs: ToolSpec[] = [
  {
    name: "list_menu",
    description:
      "List menu items with their variations and prices. Use this to answer questions about the current menu.",
    mutates: false,
    input_schema: {
      type: "object",
      properties: {
        include_archived: {
          type: "boolean",
          description: "Include archived (hidden) items. Default false.",
        },
        category: {
          type: "string",
          description: "Optional category name to filter by.",
        },
      },
    },
  },
  {
    name: "list_categories",
    description: "List all menu categories.",
    mutates: false,
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "find_item",
    description:
      "Find menu items matching a search string. Returns candidates with their ids and variations. Use before mutating when the user names an item loosely.",
    mutates: false,
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "create_item",
    description:
      "Create a new menu item. Every item needs at least one variation with a USD price.",
    mutates: true,
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        category: { type: "string", description: "Existing category name." },
        variations: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: 'e.g. "M", "L", "Regular"' },
              price_usd: { type: "number", description: "e.g. 4.5 for $4.50" },
            },
            required: ["name", "price_usd"],
          },
          minItems: 1,
        },
      },
      required: ["name", "variations"],
    },
  },
  {
    name: "rename_item",
    description: "Rename an existing menu item.",
    mutates: true,
    input_schema: {
      type: "object",
      properties: {
        item: { type: "string", description: "Item name or id." },
        new_name: { type: "string" },
      },
      required: ["item", "new_name"],
    },
  },
  {
    name: "set_item_description",
    description: "Set or clear a menu item's description.",
    mutates: true,
    input_schema: {
      type: "object",
      properties: {
        item: { type: "string" },
        description: { type: "string", description: "Empty string clears it." },
      },
      required: ["item", "description"],
    },
  },
  {
    name: "set_item_category",
    description: "Move a menu item to an existing category.",
    mutates: true,
    input_schema: {
      type: "object",
      properties: {
        item: { type: "string" },
        category: { type: "string", description: "Existing category name." },
      },
      required: ["item", "category"],
    },
  },
  {
    name: "set_price",
    description:
      "Set the price of an item's variation. If the item has one variation, `variation` may be omitted.",
    mutates: true,
    input_schema: {
      type: "object",
      properties: {
        item: { type: "string" },
        variation: { type: "string", description: 'e.g. "M", "L"' },
        price_usd: { type: "number" },
      },
      required: ["item", "price_usd"],
    },
  },
  {
    name: "add_variation",
    description: "Add a new priced variation (size) to an item.",
    mutates: true,
    input_schema: {
      type: "object",
      properties: {
        item: { type: "string" },
        name: { type: "string" },
        price_usd: { type: "number" },
      },
      required: ["item", "name", "price_usd"],
    },
  },
  {
    name: "archive_item",
    description: "Archive (hide from the menu) an item.",
    mutates: true,
    input_schema: {
      type: "object",
      properties: { item: { type: "string" } },
      required: ["item"],
    },
  },
  {
    name: "unarchive_item",
    description: "Restore a previously archived item to the menu.",
    mutates: true,
    input_schema: {
      type: "object",
      properties: { item: { type: "string" } },
      required: ["item"],
    },
  },
  {
    name: "create_category",
    description: "Create a new menu category.",
    mutates: true,
    input_schema: {
      type: "object",
      properties: { name: { type: "string" } },
      required: ["name"],
    },
  },
];

export const toolByName = new Map(toolSpecs.map((t) => [t.name, t]));

type Args = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === "string" ? v : String(v ?? ""));

function describeItem(item: Item): string {
  const prices = item.variations
    .map((v) => `${v.name} ${formatMoney(v.price)}`)
    .join(", ");
  return `${item.name}${item.archived ? " (archived)" : ""} — ${prices}`;
}

/** Executes a single tool call against the menu store. */
export class MenuToolbox {
  private readonly repo: MenuStore;

  constructor(repo: MenuStore) {
    this.repo = repo;
  }

  async run(name: string, args: Args): Promise<ToolResult> {
    try {
      return await this.dispatch(name, args ?? {});
    } catch (err) {
      const message =
        err instanceof RepositoryError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unknown error";
      return { ok: false, summary: `Failed: ${message}` };
    }
  }

  private async resolveItem(ref: string): Promise<Item> {
    const items = await this.repo.listItems({ includeArchived: true });
    const needle = ref.trim().toLowerCase();
    const byId = items.find((i) => i.id === ref);
    if (byId) return byId;
    const exact = items.filter((i) => i.name.toLowerCase() === needle);
    if (exact.length === 1) return exact[0];
    const partial = items.filter((i) => i.name.toLowerCase().includes(needle));
    if (partial.length === 1) return partial[0];
    if (partial.length > 1) {
      throw new RepositoryError(
        `"${ref}" matches ${partial.length} items: ${partial
          .map((i) => i.name)
          .join(", ")}. Be more specific.`,
      );
    }
    throw new RepositoryError(`No item matches "${ref}".`);
  }

  private async resolveCategoryId(name: string): Promise<string> {
    const categories = await this.repo.listCategories();
    const match = categories.find(
      (c) => c.name.toLowerCase() === name.trim().toLowerCase(),
    );
    if (!match) {
      throw new RepositoryError(
        `No category named "${name}". Existing: ${categories
          .map((c) => c.name)
          .join(", ")}.`,
      );
    }
    return match.id;
  }

  private money(value: unknown) {
    const money = parseMoney(String(value));
    if (!money) throw new RepositoryError(`"${value}" is not a valid price.`);
    return money;
  }

  private async dispatch(name: string, args: Args): Promise<ToolResult> {
    switch (name) {
      case "list_menu": {
        const items = await this.repo.listItems({
          includeArchived: Boolean(args.include_archived),
        });
        let filtered = items;
        if (args.category) {
          const catId = await this.resolveCategoryId(str(args.category));
          filtered = items.filter((i) => i.categoryId === catId);
        }
        return {
          ok: true,
          summary: filtered.length
            ? filtered.map(describeItem).join("\n")
            : "No items match.",
          data: filtered,
        };
      }
      case "list_categories": {
        const categories = await this.repo.listCategories();
        return {
          ok: true,
          summary: categories.map((c) => c.name).join(", ") || "No categories.",
          data: categories,
        };
      }
      case "find_item": {
        const items = await this.repo.listItems({ includeArchived: true });
        const q = str(args.query).toLowerCase();
        const hits = items.filter((i) => i.name.toLowerCase().includes(q));
        return {
          ok: true,
          summary: hits.length
            ? hits.map(describeItem).join("\n")
            : `Nothing matches "${args.query}".`,
          data: hits,
        };
      }
      case "create_item": {
        const variations = (args.variations as Args[] | undefined) ?? [];
        const item = await this.repo.createItem({
          name: str(args.name),
          description: args.description ? str(args.description) : undefined,
          categoryId: args.category
            ? await this.resolveCategoryId(str(args.category))
            : undefined,
          variations: variations.map((v) => ({
            name: str(v.name),
            price: this.money(v.price_usd),
          })),
        });
        return { ok: true, summary: `Created ${describeItem(item)}`, data: item };
      }
      case "rename_item": {
        const item = await this.resolveItem(str(args.item));
        const updated = await this.repo.updateItem(item.id, {
          name: str(args.new_name),
        });
        return {
          ok: true,
          summary: `Renamed "${item.name}" to "${updated.name}"`,
          data: updated,
        };
      }
      case "set_item_description": {
        const item = await this.resolveItem(str(args.item));
        const updated = await this.repo.updateItem(item.id, {
          description: str(args.description),
        });
        return {
          ok: true,
          summary: `Updated description for "${item.name}"`,
          data: updated,
        };
      }
      case "set_item_category": {
        const item = await this.resolveItem(str(args.item));
        const categoryId = await this.resolveCategoryId(str(args.category));
        const updated = await this.repo.updateItem(item.id, { categoryId });
        return {
          ok: true,
          summary: `Moved "${item.name}" to ${str(args.category)}`,
          data: updated,
        };
      }
      case "set_price": {
        const item = await this.resolveItem(str(args.item));
        const variation = this.pickVariation(item, args.variation);
        const price = this.money(args.price_usd);
        const updated = await this.repo.setVariationPrice(
          item.id,
          variation.id,
          price,
        );
        return {
          ok: true,
          summary: `Set ${item.name} (${variation.name}) to ${formatMoney(price)}`,
          data: updated,
        };
      }
      case "add_variation": {
        const item = await this.resolveItem(str(args.item));
        const updated = await this.repo.addVariation(item.id, {
          name: str(args.name),
          price: this.money(args.price_usd),
        });
        return {
          ok: true,
          summary: `Added ${str(args.name)} to ${item.name}`,
          data: updated,
        };
      }
      case "archive_item": {
        const item = await this.resolveItem(str(args.item));
        await this.repo.setItemArchived(item.id, true);
        return { ok: true, summary: `Archived "${item.name}"` };
      }
      case "unarchive_item": {
        const item = await this.resolveItem(str(args.item));
        await this.repo.setItemArchived(item.id, false);
        return { ok: true, summary: `Restored "${item.name}"` };
      }
      case "create_category": {
        const category = await this.repo.createCategory({ name: str(args.name) });
        return {
          ok: true,
          summary: `Created category "${category.name}"`,
          data: category,
        };
      }
      default:
        return { ok: false, summary: `Unknown tool: ${name}` };
    }
  }

  private pickVariation(item: Item, ref: unknown) {
    if (!ref) {
      if (item.variations.length === 1) return item.variations[0];
      throw new RepositoryError(
        `"${item.name}" has ${item.variations.length} variations (${item.variations
          .map((v) => v.name)
          .join(", ")}). Specify which one.`,
      );
    }
    const needle = String(ref).toLowerCase();
    const match = item.variations.find((v) => v.name.toLowerCase() === needle);
    if (!match) {
      throw new RepositoryError(
        `"${item.name}" has no variation "${ref}". Options: ${item.variations
          .map((v) => v.name)
          .join(", ")}.`,
      );
    }
    return match;
  }
}
