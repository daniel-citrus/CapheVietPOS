import Fastify, { type FastifyError } from "fastify";
import { RepositoryError } from "shared/errors";
import { registerAuth } from "./auth";
import { agentAvailable, config } from "./config";
import { agentRoutes } from "./routes/agent";
import { auditRoutes } from "./routes/audit";
import { menuRoutes } from "./routes/menu";
import { metaRoutes } from "./routes/meta";
import { salesRoutes } from "./routes/sales";

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? "info" },
});

// Accept empty JSON bodies (some POSTs carry nothing).
app.addContentTypeParser(
  "application/json",
  { parseAs: "string" },
  (_req, body, done) => {
    if (!body || (typeof body === "string" && body.trim() === "")) {
      done(null, undefined);
      return;
    }
    try {
      done(null, JSON.parse(body as string));
    } catch (err) {
      done(err as Error, undefined);
    }
  },
);

registerAuth(app);

app.setErrorHandler((err: FastifyError, req, reply) => {
  if (err instanceof RepositoryError) {
    return reply
      .status(err.status)
      .send({ error: { code: err.code, message: err.message } });
  }
  // Fastify validation / parse errors carry a statusCode.
  const status = typeof err.statusCode === "number" ? err.statusCode : 500;
  if (status >= 500) req.log.error({ err }, "unhandled error");
  return reply.status(status).send({
    error: {
      code: "repository",
      message: status >= 500 ? "Internal server error" : err.message,
    },
  });
});

app.register(metaRoutes, { prefix: "/api/meta" });
app.register(menuRoutes, { prefix: "/api/menu" });
app.register(salesRoutes, { prefix: "/api/sales" });
app.register(auditRoutes, { prefix: "/api/audit" });
app.register(agentRoutes, { prefix: "/api/agent" });

const address = await app.listen({ port: config.port, host: "127.0.0.1" });
app.log.info(
  `data source: ${config.dataSource} · agent: ${agentAvailable ? "claude" : "offline"} · audit: ${config.sqlitePath}`,
);
app.log.info(`ready on ${address}`);
