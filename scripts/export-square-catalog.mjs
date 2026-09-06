#!/usr/bin/env node
/**
 * ONE-TIME LOCAL SCRIPT — not imported by the app, never runs in the browser.
 *
 * Pulls the real catalog + locations from Square once and freezes them as
 * fixtures for P1. Orders and customers are intentionally NOT pulled (live
 * revenue data + PII).
 *
 * Usage:
 *   1. Put your token in an untracked .env.local at the repo root:
 *        SQUARE_ACCESS_TOKEN=EAAA...
 *        # optional, defaults to production:
 *        SQUARE_API_BASE=https://connect.squareup.com
 *   2. node scripts/export-square-catalog.mjs
 *   3. Commit src/repositories/mock/fixtures.generated.json (it contains no
 *      secrets — just your menu structure). Rotate the token afterwards.
 *
 * Recommended token scopes (read-only): ITEMS_READ, MERCHANT_PROFILE_READ
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(root, "src/repositories/mock/fixtures.generated.json");

// --- tiny .env.local loader (no dependency) ---------------------------------
function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    /* no .env.local — rely on the process env */
  }
}
loadEnvLocal();

const TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const BASE =
  process.env.SQUARE_API_BASE ||
  (process.env.SQUARE_ENVIRONMENT === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com");
const VERSION = process.env.SQUARE_API_VERSION || "2025-01-23";

if (!TOKEN) {
  console.error(
    "Missing SQUARE_ACCESS_TOKEN. Add it to .env.local (see the header of this file).",
  );
  process.exit(1);
}

async function api(path, params) {
  const url = new URL(BASE + path);
  if (params) for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Square-Version": VERSION,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    throw new Error(`${path} → ${res.status} ${res.statusText}\n${await res.text()}`);
  }
  return res.json();
}

async function listCatalog() {
  const objects = [];
  let cursor;
  do {
    const page = await api("/v2/catalog/list", {
      types: "ITEM,ITEM_VARIATION,CATEGORY,MODIFIER_LIST,MODIFIER,IMAGE",
      ...(cursor ? { cursor } : {}),
    });
    objects.push(...(page.objects ?? []));
    cursor = page.cursor;
  } while (cursor);
  return objects;
}

const money = (m) =>
  m ? { amount: Number(m.amount ?? 0), currency: m.currency ?? "USD" } : { amount: 0, currency: "USD" };

function mapLocations(raw) {
  return (raw ?? []).map((l) => ({
    id: l.id,
    name: l.name ?? l.id,
    status: l.status === "ACTIVE" ? "active" : "inactive",
  }));
}

function mapCatalog(objects) {
  const byId = new Map(objects.map((o) => [o.id, o]));

  const categories = objects
    .filter((o) => o.type === "CATEGORY" && !o.is_deleted)
    .map((o) => ({ id: o.id, name: o.category_data?.name ?? o.id }));

  const modifierGroups = objects
    .filter((o) => o.type === "MODIFIER_LIST" && !o.is_deleted)
    .map((o) => {
      const d = o.modifier_list_data ?? {};
      const options = (d.modifiers ?? [])
        .map((mid) => byId.get(typeof mid === "string" ? mid : mid.id))
        .filter(Boolean)
        .map((mod) => ({
          id: mod.id,
          modifierGroupId: o.id,
          name: mod.modifier_data?.name ?? mod.id,
          priceDelta: money(mod.modifier_data?.price_money),
        }));
      // Square: selection_type SINGLE/MULTIPLE, plus optional min/max on the list
      const single = (d.selection_type ?? "SINGLE") === "SINGLE";
      return {
        id: o.id,
        name: d.name ?? o.id,
        required: Number(d.min_selected_modifiers ?? 0) > 0,
        minSelect: Number(d.min_selected_modifiers ?? 0),
        maxSelect: Number(
          d.max_selected_modifiers ?? (single ? 1 : options.length || 1),
        ),
        options,
      };
    });

  const items = objects
    .filter((o) => o.type === "ITEM" && !o.is_deleted)
    .map((o) => {
      const d = o.item_data ?? {};
      const variations = (d.variations ?? [])
        .filter((v) => !v.is_deleted)
        .map((v) => ({
          id: v.id,
          itemId: o.id,
          name: v.item_variation_data?.name ?? "Regular",
          price: money(v.item_variation_data?.price_money),
          sku: v.item_variation_data?.sku || undefined,
          priceOverrides: (v.item_variation_data?.location_overrides ?? [])
            .filter((lo) => lo.price_money)
            .map((lo) => ({
              locationId: lo.location_id,
              price: money(lo.price_money),
            })),
        }));
      const categoryId =
        d.categories?.[0]?.id ?? d.category_id ?? d.reporting_category?.id;
      const modifierGroupIds = (d.modifier_list_info ?? [])
        .filter((mli) => mli.enabled !== false)
        .map((mli) => mli.modifier_list_id);
      const imageId = d.image_ids?.[0];
      const imageUrl = imageId ? byId.get(imageId)?.image_data?.url : undefined;
      return {
        id: o.id,
        name: d.name ?? o.id,
        description: d.description || undefined,
        categoryId: categoryId || undefined,
        variations,
        modifierGroupIds,
        archived: d.is_archived === true,
        imageUrl: imageUrl || undefined,
      };
    });

  return { categories, modifierGroups, items };
}

(async () => {
  console.log(`Pulling from ${BASE} …`);
  const [locResp, catalogObjects] = await Promise.all([
    api("/v2/locations"),
    listCatalog(),
  ]);

  const fixtures = {
    _meta: {
      generatedAt: new Date().toISOString(),
      source: BASE,
      note: "Generated by scripts/export-square-catalog.mjs. Catalog + locations only.",
    },
    locations: mapLocations(locResp.locations),
    ...mapCatalog(catalogObjects),
  };

  writeFileSync(OUT, JSON.stringify(fixtures, null, 2) + "\n");
  console.log(
    `Wrote ${OUT}\n` +
      `  ${fixtures.locations.length} locations, ` +
      `${fixtures.categories.length} categories, ` +
      `${fixtures.modifierGroups.length} modifier groups, ` +
      `${fixtures.items.length} items`,
  );
  console.log("The app will pick this up automatically on next dev/build.");
})().catch((err) => {
  console.error("\nExport failed:\n" + err.message);
  process.exit(1);
});
