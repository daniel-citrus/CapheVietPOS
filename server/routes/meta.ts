import type { FastifyPluginAsync } from "fastify";
import type { Meta } from "shared/api";
import { agentAvailable, config } from "../config";

export const metaRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", (): Meta => ({
    dataSource: config.dataSource,
    agentAvailable,
  }));
};
