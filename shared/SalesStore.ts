/**
 * Sales / orders / reporting. In P1 this exists only so the reporting and order
 * history screens have a typed seam to render "no data yet" against. No order or
 * customer data is pulled from Square in P1 (live revenue + PII), so every method
 * currently resolves empty.
 */
export interface SalesStore {
  listOrders(opts?: {
    locationId?: string;
    from?: string;
    to?: string;
  }): Promise<Order[]>;

  getSalesSummary(opts?: {
    locationId?: string;
    from?: string;
    to?: string;
  }): Promise<SalesSummary>;
}

export interface Order {
  id: string;
  locationId: string;
  createdAt: string;
  total: { amount: number; currency: string };
  lineItemCount: number;
  state: "completed" | "refunded" | "partially_refunded";
}

export interface SalesSummary {
  grossSales: { amount: number; currency: string };
  orderCount: number;
  from?: string;
  to?: string;
}
