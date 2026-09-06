import type { FastifyPluginAsync } from "fastify";
import { salesStore } from "../menu/factory";

/** Reporting scaffolds. No order/customer data is pulled — everything resolves empty. */
export const salesRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { locationId?: string; from?: string; to?: string } }>(
    "/orders",
    (req) => salesStore.listOrders(req.query),
  );

  app.get<{ Querystring: { locationId?: string; from?: string; to?: string } }>(
    "/summary",
    (req) => salesStore.getSalesSummary(req.query),
  );
};
