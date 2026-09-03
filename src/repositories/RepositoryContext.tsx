import { createContext, useContext, useMemo, type ReactNode } from "react";
import { dataSource, type DataSource } from "../config/env";
import type { CatalogRepository } from "./CatalogRepository";
import type { SalesRepository } from "./SalesRepository";
import { MockCatalogRepository } from "./mock/MockCatalogRepository";
import { MockSalesRepository } from "./mock/MockSalesRepository";
import { SquareCatalogRepository } from "./square/SquareCatalogRepository";

export interface Repositories {
  catalog: CatalogRepository;
  sales: SalesRepository;
  /** Where `catalog` reads/writes: "mock" fixtures or the live "square" proxy. */
  source: DataSource;
}

const RepositoryContext = createContext<Repositories | null>(null);

/**
 * Wires the data layer. `VITE_DATA_SOURCE=square` points the catalog at the
 * live Square proxy (see vite.config.ts); anything else uses in-memory mock
 * fixtures. Sales stays mock for now (no order data is pulled — see PLAN.md).
 * In P2 swap these constructors for the real HTTP implementations with no
 * component changes.
 */
export function RepositoryProvider({ children }: { children: ReactNode }) {
  const repositories = useMemo<Repositories>(
    () => ({
      source: dataSource,
      catalog:
        dataSource === "square"
          ? new SquareCatalogRepository()
          : new MockCatalogRepository(),
      sales: new MockSalesRepository(),
    }),
    [],
  );
  return (
    <RepositoryContext.Provider value={repositories}>
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepositories(): Repositories {
  const ctx = useContext(RepositoryContext);
  if (!ctx) {
    throw new Error("useRepositories must be used within RepositoryProvider");
  }
  return ctx;
}

export function useCatalog(): CatalogRepository {
  return useRepositories().catalog;
}
