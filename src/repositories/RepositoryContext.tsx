import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { CatalogRepository } from "shared/CatalogRepository";
import type { SalesRepository } from "shared/SalesRepository";
import { HttpCatalogRepository } from "./HttpCatalogRepository";
import { HttpSalesRepository } from "./HttpSalesRepository";

export interface Repositories {
  catalog: CatalogRepository;
  sales: SalesRepository;
}

const RepositoryContext = createContext<Repositories | null>(null);

/**
 * Both surfaces talk to the backend through these. Mock vs Square is a
 * server-side choice now (`DATA_SOURCE`); the client is identical either way.
 */
export function RepositoryProvider({ children }: { children: ReactNode }) {
  const repositories = useMemo<Repositories>(
    () => ({
      catalog: new HttpCatalogRepository(),
      sales: new HttpSalesRepository(),
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
