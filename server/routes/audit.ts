import type { FastifyPluginAsync } from "fastify";
import { auditLog } from "../audit/factory";

export const auditRouter: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { limit?: string } }>("/", (req) =>
    auditLog.list({ limit: req.query.limit ? Number(req.query.limit) : undefined }),
  );
};
