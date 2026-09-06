import type {
  Order,
  SalesRepository,
  SalesSummary,
} from "shared/SalesRepository";
import { apiFetch } from "./apiClient";

const qs = (o?: Record<string, string | undefined>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o ?? {})) if (v) p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : "";
};

export class HttpSalesRepository implements SalesRepository {
  listOrders(opts?: {
    locationId?: string;
    from?: string;
    to?: string;
  }): Promise<Order[]> {
    return apiFetch(`/sales/orders${qs(opts)}`);
  }

  getSalesSummary(opts?: {
    locationId?: string;
    from?: string;
    to?: string;
  }): Promise<SalesSummary> {
    return apiFetch(`/sales/summary${qs(opts)}`);
  }
}
