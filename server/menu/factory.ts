import { config } from "../config";
import type { MenuStore } from "shared/MenuStore";
import type { SalesStore } from "shared/SalesStore";
import { InMemoryMenuStore } from "./memory/InMemoryMenuStore";
import { InMemorySalesStore } from "./memory/InMemorySalesStore";
import { SquareMenuStore } from "./square/SquareMenuStore";

/**
 * The one place the in-memory vs Square adapter is chosen, from `DATA_SOURCE`.
 * Singletons for the process; per-request code wraps `menuStore` in
 * `AuditedMenuStore` so every write is logged with its actor.
 */
export const menuStore: MenuStore =
  config.dataSource === "square"
    ? new SquareMenuStore()
    : new InMemoryMenuStore();

export const salesStore: SalesStore = new InMemorySalesStore();
