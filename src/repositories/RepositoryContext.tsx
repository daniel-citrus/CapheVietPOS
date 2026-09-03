import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { CatalogRepository } from "./CatalogRepository";
import type { SalesRepository } from "./SalesRepository";
import { MockCatalogRepository } from "./mock/MockCatalogRepository";
import { MockSalesRepository } from "./mock/MockSalesRepository";

export interface Repositories {
  catalog: CatalogRepository;
  sales: SalesRepository;
}

const RepositoryContext = createContext<Repositories | null>(null);

/**
 * In P1 this wires the mock implementations. In P2 swap these two lines for
 * `new HttpCatalogRepository(...)` etc. — no component changes.
 */
export function RepositoryProvider({ children }: { children: ReactNode }) {
  const repositories = useMemo<Repositories>(
    () => ({
      catalog: new MockCatalogRepository(),
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
  if (!ctx) throw new Error("useRepositories must be used within RepositoryProvider");
  return ctx;
}
