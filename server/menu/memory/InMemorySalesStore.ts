import type { Order, SalesStore, SalesSummary } from "shared/SalesStore";

/**
 * P1 stub. No order or customer data is pulled from Square in P1, so everything
 * resolves empty. The reporting and order-history screens render "no data yet"
 * against this. Real implementation arrives in P2 alongside the backend proxy.
 */
export class InMemorySalesStore implements SalesStore {
  async listOrders(): Promise<Order[]> {
    return [];
  }

  async getSalesSummary(opts?: { from?: string; to?: string }): Promise<SalesSummary> {
    return {
      grossSales: { amount: 0, currency: "USD" },
      orderCount: 0,
      from: opts?.from,
      to: opts?.to,
    };
  }
}
