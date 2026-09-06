import type { FastifyPluginAsync } from "fastify";
import { salesRepository } from "../catalog/factory";

/** Reporting scaffolds. No order/customer data is pulled — everything resolves empty. */
export const salesRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { locationId?: string; from?: string; to?: string } }>(
    "/orders",
    (req) => salesRepository.listOrders(req.query),
  );

  app.get<{ Querystring: { locationId?: string; from?: string; to?: string } }>(
    "/summary",
    (req) => salesRepository.getSalesSummary(req.query),
  );
};
