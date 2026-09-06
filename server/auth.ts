import type { FastifyInstance, FastifyRequest } from "fastify";
import {
  can as canFor,
  roleFromHeader,
  userForRole,
  type Capability,
  type CurrentUser,
} from "shared/domain";
import { PermissionError } from "shared/errors";
import type { MenuStore } from "shared/MenuStore";
import { menuStore } from "./menu/factory";
import { AuditedMenuStore } from "./menu/AuditedMenuStore";
import { auditLog } from "./audit/factory";

declare module "fastify" {
  interface FastifyRequest {
    currentUser: CurrentUser;
    can(capability: Capability): boolean;
    /** Per-request, audited wrapper around the shared menu store. */
    menu: MenuStore;
  }
}

/**
 * Stub auth: the client sends `X-Role: admin|staff`; the server takes that as
 * the actor and enforces `can()` on every write. `req.menu` is the audited
 * wrapper so UI writes and agent writes are logged identically.
 */
export function registerAuth(app: FastifyInstance): void {
  app.decorateRequest("currentUser");
  app.decorateRequest("can");
  app.decorateRequest("menu");

  app.addHook("onRequest", async (req: FastifyRequest) => {
    const role = roleFromHeader(req.headers["x-role"]);
    req.currentUser = userForRole(role);
    req.can = (capability) => canFor(role, capability);
    req.menu = new AuditedMenuStore(menuStore, auditLog, req.currentUser);
  });
}

/** Throw a 403 unless the current request holds the capability. */
export function requireCapability(
  req: FastifyRequest,
  capability: Capability,
): void {
  if (!req.can(capability)) throw new PermissionError(capability);
}
