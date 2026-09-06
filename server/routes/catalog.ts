import type { FastifyPluginAsync } from "fastify";
import type { Money } from "shared/domain";
import type {
  CreateItemInput,
  CreateVariationInput,
  UpdateItemPatch,
  UpdateVariationPatch,
} from "../catalog/CatalogRepository";
import { requireCapability } from "../auth";

interface ItemParams {
  id: string;
}
interface VariationParams {
  id: string;
  vid: string;
}

/**
 * One route per `CatalogRepository` method. Handlers just call `req.catalog`
 * (the audited wrapper) and return the domain object; the repo throws typed
 * `RepositoryError`s which the app-level error handler turns into
 * `{ error: { code, message } }` with the right status.
 */
export const catalogRoutes: FastifyPluginAsync = async (app) => {
  // --- locations ------------------------------------------------------
  app.get("/locations", (req) => req.catalog.listLocations());

  // --- categories ---------------------------------------------------
  app.get("/categories", (req) => req.catalog.listCategories());

  app.post<{ Body: { name: string } }>("/categories", (req) => {
    requireCapability(req, "catalog.write");
    return req.catalog.createCategory({ name: req.body.name });
  });

  app.patch<{ Params: ItemParams; Body: { name: string } }>(
    "/categories/:id",
    (req) => {
      requireCapability(req, "catalog.write");
      return req.catalog.renameCategory(req.params.id, req.body.name);
    },
  );

  // --- modifier groups -------------------------------------------
  app.get("/modifier-groups", (req) => req.catalog.listModifierGroups());

  // --- items ---------------------------------------------------
  app.get<{ Querystring: { includeArchived?: string } }>("/items", (req) =>
    req.catalog.listItems({
      includeArchived: req.query.includeArchived === "true",
    }),
  );

  app.get<{ Params: ItemParams }>("/items/:id", (req) =>
    req.catalog.getItem(req.params.id),
  );

  app.post<{ Body: CreateItemInput }>("/items", (req) => {
    requireCapability(req, "catalog.write");
    return req.catalog.createItem(req.body);
  });

  app.patch<{ Params: ItemParams; Body: UpdateItemPatch }>(
    "/items/:id",
    (req) => {
      requireCapability(req, "catalog.write");
      return req.catalog.updateItem(req.params.id, req.body);
    },
  );

  app.post<{ Params: ItemParams; Body: { archived: boolean } }>(
    "/items/:id/archived",
    (req) => {
      requireCapability(req, "catalog.write");
      return req.catalog.setItemArchived(req.params.id, req.body.archived);
    },
  );

  app.post<{ Params: ItemParams; Body: { imageUrl: string | null } }>(
    "/items/:id/image",
    (req) => {
      requireCapability(req, "catalog.write");
      return req.catalog.setItemImage(req.params.id, req.body.imageUrl);
    },
  );

  // --- variations -------------------------------------------
  app.post<{ Params: ItemParams; Body: CreateVariationInput }>(
    "/items/:id/variations",
    (req) => {
      requireCapability(req, "catalog.write");
      return req.catalog.addVariation(req.params.id, req.body);
    },
  );

  app.patch<{ Params: VariationParams; Body: UpdateVariationPatch }>(
    "/items/:id/variations/:vid",
    (req) => {
      requireCapability(req, "catalog.write");
      return req.catalog.updateVariation(req.params.id, req.params.vid, req.body);
    },
  );

  app.delete<{ Params: VariationParams }>(
    "/items/:id/variations/:vid",
    (req) => {
      requireCapability(req, "catalog.write");
      return req.catalog.removeVariation(req.params.id, req.params.vid);
    },
  );

  app.post<{ Params: VariationParams; Body: { price: Money } }>(
    "/items/:id/variations/:vid/price",
    (req) => {
      requireCapability(req, "pricing.write");
      return req.catalog.setVariationPrice(
        req.params.id,
        req.params.vid,
        req.body.price,
      );
    },
  );
};
