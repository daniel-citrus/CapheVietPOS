import type { FastifyPluginAsync } from "fastify";
import type { Meta } from "shared/api";
import { agentAvailable, config } from "../config";

export const metaRouter: FastifyPluginAsync = async (app) => {
  app.get("/", (): Meta => ({
    dataSource: config.dataSource,
    agentAvailable,
  }));
};
