import { config } from "../config";
import type { MenuStore } from "shared/MenuStore";
import type { SalesStore } from "shared/SalesStore";
import { InMemoryMenuAdapter } from "./memory/InMemoryMenuAdapter";
import { InMemorySalesAdapter } from "./memory/InMemorySalesAdapter";
import { SquareMenuAdapter } from "./square/SquareMenuAdapter";

/**
 * The one place the in-memory vs Square adapter is chosen, from `DATA_SOURCE`.
 * Singletons for the process; per-request code wraps `menuStore` in
 * `AuditedMenuStore` so every write is logged with its actor.
 */
export const menuStore: MenuStore =
  config.dataSource === "square"
    ? new SquareMenuAdapter()
    : new InMemoryMenuAdapter();

export const salesStore: SalesStore = new InMemorySalesAdapter();
