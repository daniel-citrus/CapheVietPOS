import type { FastifyPluginAsync } from "fastify";
import type { Money } from "shared/domain";
import type {
  CreateItemInput,
  CreateVariationInput,
  UpdateItemPatch,
  UpdateVariationPatch,
} from "shared/MenuStore";
import { requireCapability } from "../auth";

interface ItemParams {
  id: string;
}
interface VariationParams {
  id: string;
  vid: string;
}

/**
 * One route per `MenuStore` method. Handlers just call `req.menu` (the audited
 * wrapper) and return the domain object; the store throws typed
 * `RepositoryError`s which the app-level error handler turns into
 * `{ error: { code, message } }` with the right status.
 */
export const menuRouter: FastifyPluginAsync = async (app) => {
  // --- locations ------------------------------------------------------
  app.get("/locations", (req) => req.menu.listLocations());

  // --- categories ---------------------------------------------------
  app.get("/categories", (req) => req.menu.listCategories());

  app.post<{ Body: { name: string } }>("/categories", (req) => {
    requireCapability(req, "menu.write");
    return req.menu.createCategory({ name: req.body.name });
  });

  app.patch<{ Params: ItemParams; Body: { name: string } }>(
    "/categories/:id",
    (req) => {
      requireCapability(req, "menu.write");
      return req.menu.renameCategory(req.params.id, req.body.name);
    },
  );

  // --- modifier groups -------------------------------------------
  app.get("/modifier-groups", (req) => req.menu.listModifierGroups());

  // --- items ---------------------------------------------------
  app.get<{ Querystring: { includeArchived?: string } }>("/items", (req) =>
    req.menu.listItems({
      includeArchived: req.query.includeArchived === "true",
    }),
  );

  app.get<{ Params: ItemParams }>("/items/:id", (req) =>
    req.menu.getItem(req.params.id),
  );

  app.post<{ Body: CreateItemInput }>("/items", (req) => {
    requireCapability(req, "menu.write");
    return req.menu.createItem(req.body);
  });

  app.patch<{ Params: ItemParams; Body: UpdateItemPatch }>(
    "/items/:id",
    (req) => {
      requireCapability(req, "menu.write");
      return req.menu.updateItem(req.params.id, req.body);
    },
  );

  app.post<{ Params: ItemParams; Body: { archived: boolean } }>(
    "/items/:id/archived",
    (req) => {
      requireCapability(req, "menu.write");
      return req.menu.setItemArchived(req.params.id, req.body.archived);
    },
  );

  app.post<{ Params: ItemParams; Body: { imageUrl: string | null } }>(
    "/items/:id/image",
    (req) => {
      requireCapability(req, "menu.write");
      return req.menu.setItemImage(req.params.id, req.body.imageUrl);
    },
  );

  // --- variations -------------------------------------------
  app.post<{ Params: ItemParams; Body: CreateVariationInput }>(
    "/items/:id/variations",
    (req) => {
      requireCapability(req, "menu.write");
      return req.menu.addVariation(req.params.id, req.body);
    },
  );

  app.patch<{ Params: VariationParams; Body: UpdateVariationPatch }>(
    "/items/:id/variations/:vid",
    (req) => {
      requireCapability(req, "menu.write");
      return req.menu.updateVariation(req.params.id, req.params.vid, req.body);
    },
  );

  app.delete<{ Params: VariationParams }>(
    "/items/:id/variations/:vid",
    (req) => {
      requireCapability(req, "menu.write");
      return req.menu.removeVariation(req.params.id, req.params.vid);
    },
  );

  app.post<{ Params: VariationParams; Body: { price: Money } }>(
    "/items/:id/variations/:vid/price",
    (req) => {
      requireCapability(req, "pricing.write");
      return req.menu.setVariationPrice(
        req.params.id,
        req.params.vid,
        req.body.price,
      );
    },
  );
};
