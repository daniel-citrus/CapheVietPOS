import { config } from "../config";
import type { CatalogRepository } from "./CatalogRepository";
import type { SalesRepository } from "./SalesRepository";
import { MockCatalogRepository } from "./mock/MockCatalogRepository";
import { MockSalesRepository } from "./mock/MockSalesRepository";
import { SquareCatalogRepository } from "./square/SquareCatalogRepository";

/**
 * The one place Mock vs Square is chosen, from `DATA_SOURCE`. Singletons for
 * the process; per-request code wraps `catalogRepository` in
 * `AuditedCatalogRepository` so every write is logged with its actor.
 */
export const catalogRepository: CatalogRepository =
  config.dataSource === "square"
    ? new SquareCatalogRepository()
    : new MockCatalogRepository();

export const salesRepository: SalesRepository = new MockSalesRepository();
