// Phase 16 CMS hardening tests: shared admin input validators, inventory
// detail loader guards, migration 0010 index coverage, R2 key-only storage,
// and no-new-ImageKit-write-path source guards — mocks/fakes only, never
// production credentials or remote migrations.
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/cms-phase16-hardening.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const inputs = await import("../src/lib/cms/admin-inputs.ts");
const compat = await import("../src/lib/cms/media-compat.ts");

// --- Shared admin input validators ------------------------------------------

test("admin-inputs: requireContentId rejects blank ids", () => {
  assert.equal(inputs.requireContentId("cms_123"), "cms_123");
  assert.throws(() => inputs.requireContentId(""), /Invalid content id/);
  assert.throws(() => inputs.requireContentId("   "), /Invalid content id/);
  assert.throws(() => inputs.requireContentId(42), /Invalid content id/);
});

test("admin-inputs: requireTitle trims, rejects blank", () => {
  assert.equal(inputs.requireTitle("  Storm King  "), "Storm King");
  assert.throws(() => inputs.requireTitle(""), /Title is required/);
  assert.throws(() => inputs.requireTitle(42), /Title is required/);
});

test("admin-inputs: clampAdminPaging clamps to 1..100, offset >= 0", () => {
  assert.deepEqual(inputs.clampAdminPaging({}), { limit: 50, offset: 0 });
  assert.deepEqual(inputs.clampAdminPaging({ limit: 500, offset: -5 }), {
    limit: 100,
    offset: 0,
  });
  assert.deepEqual(inputs.clampAdminPaging({ limit: 0, offset: 3.7 }), {
    limit: 1,
    offset: 3,
  });
  assert.deepEqual(inputs.clampAdminPaging({ limit: "50" }), { limit: 50, offset: 0 });
});

test("admin-inputs: asStatusFilter accepts known states only", () => {
  assert.equal(inputs.asStatusFilter(undefined), undefined);
  assert.equal(inputs.asStatusFilter(""), undefined);
  assert.equal(inputs.asStatusFilter("published"), "published");
  assert.throws(() => inputs.asStatusFilter("deleted"), /Invalid status filter/);
  assert.throws(() => inputs.asStatusFilter("PUBLISHED"), /Invalid status filter/);
});

test("admin-inputs: asSearchFilter trims, empty becomes undefined", () => {
  assert.equal(inputs.asSearchFilter(undefined), undefined);
  assert.equal(inputs.asSearchFilter("   "), undefined);
  assert.equal(inputs.asSearchFilter("  kyle "), "kyle");
  assert.throws(() => inputs.asSearchFilter(42), /Invalid search filter/);
});

test("admin-inputs: optional string/number guards reject wrong shapes", () => {
  assert.equal(inputs.asOptionalString(undefined), undefined);
  assert.equal(inputs.asOptionalString("en"), "en");
  assert.throws(() => inputs.asOptionalString(42), /Invalid input/);
  assert.equal(inputs.asOptionalNumber(undefined), undefined);
  assert.equal(inputs.asOptionalNumber(3), 3);
  assert.throws(() => inputs.asOptionalNumber("3"), /Invalid input/);
  assert.throws(() => inputs.asOptionalNumber(Number.NaN), /Invalid input/);
  assert.equal(inputs.asOptionalStringOrNull(null), null);
  assert.equal(inputs.asOptionalStringOrNull(undefined), undefined);
  assert.throws(() => inputs.asOptionalStringOrNull(42), /Invalid input/);
});

test("admin-inputs: requireArticleLocale accepts only the 9 CMS locales", () => {
  assert.equal(inputs.requireArticleLocale("en"), "en");
  assert.equal(inputs.requireArticleLocale("fa-IR"), "fa-IR");
  assert.equal(inputs.requireArticleLocale("ar-SA"), "ar-SA");
  assert.throws(() => inputs.requireArticleLocale("xx"), /Unsupported locale/);
  assert.throws(() => inputs.requireArticleLocale(""), /Invalid locale/);
  assert.throws(() => inputs.requireArticleLocale(42), /Invalid locale/);
});

// --- Migration 0010: editorial tables (additive only) ----------------------------

test("migration 0010: editorial tables are additive with safe references", async () => {
  const sql = await readFile(
    new URL("../../worker/migrations/0010_cms_phase16_indexes.sql", import.meta.url),
    "utf8",
  );
  for (const table of [
    "article_categories",
    "article_tags",
    "article_bodies",
    "article_tag_links",
    "article_entity_refs",
    "article_media",
    "article_related",
  ]) {
    assert.match(sql, new RegExp(table), `${table} must exist`);
  }
  assert.match(sql, /CREATE TABLE IF NOT EXISTS/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS/);
  assert.match(sql, /ADDITIVE ONLY/);
  // Article media must be reference-guarded, never cascade-deleted.
  assert.match(sql, /article_media[\s\S]*ON DELETE RESTRICT/);
});

// --- Media deletion + missing-media safety -----------------------------------

test("media-compat: missing or hostile rows resolve to null, never throw", () => {
  const config = { r2BaseUrl: "https://media.hawkbucks.com" };
  assert.equal(compat.resolveCompatDeliveryUrl(null, config), null);
  assert.equal(compat.resolveCompatDeliveryUrl(undefined, config), null);
  assert.equal(
    compat.resolveCompatDeliveryUrl(
      { provider: "r2", provider_asset_id: "../escape.png", delivery_url: "" },
      config,
    ),
    null,
  );
  assert.equal(
    compat.resolveCompatDeliveryUrl(
      { provider: "nope", provider_asset_id: "", delivery_url: "" },
      config,
    ),
    null,
  );
});

test("media-compat: unknown providers fall back to stored https URL only", () => {
  const config = { r2BaseUrl: "https://media.hawkbucks.com" };
  assert.equal(
    compat.resolveCompatDeliveryUrl(
      { provider: "nope", provider_asset_id: "", delivery_url: "https://cdn.example/a.png" },
      config,
    ),
    "https://cdn.example/a.png",
  );
  assert.equal(
    compat.resolveCompatDeliveryUrl(
      { provider: "r2", provider_asset_id: "heroes/kyle.webp", delivery_url: "" },
      config,
    ),
    "https://media.hawkbucks.com/heroes/kyle.webp",
  );
});

// --- Source guards: no new ImageKit write paths, validators wired -----------

test("phase16: no new ImageKit write paths outside the legacy provider", async () => {
  const server = await readFile(new URL("../src/lib/cms/media.server.ts", import.meta.url), "utf8");
  assert.match(server, /ACTIVE_MEDIA_PROVIDER = "r2"/);
  assert.doesNotMatch(server, /createImageKitProvider|imageKitConfigFromEnv/);
  const detail = await readFile(
    new URL("../src/lib/cms/inventory-admin-detail.loader.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(detail, /IMAGEKIT|imagekit/);
});

test("phase16: admin loaders validate inputs before DB access", async () => {
  for (const file of [
    "../src/lib/cms/heroes-admin.loader.ts",
    "../src/lib/cms/loadouts-admin.loader.ts",
    "../src/lib/cms/schematics-admin.loader.ts",
    "../src/lib/cms/media-admin.loader.ts",
    "../src/lib/cms/admin.loader.ts",
    "../src/lib/cms/inventory-admin-detail.loader.ts",
  ]) {
    const source = await readFile(
      new URL(`../src/lib/cms/${file.split("/").pop()}`, import.meta.url),
      "utf8",
    );
    assert.match(source, /admin-inputs/, `${file} must use shared validators`);
    assert.doesNotMatch(
      source,
      /\.validator\(\(i[^)]*\) => i\)/,
      `${file} must not use identity validators`,
    );
  }
});

test("phase16: admin routes define loading + error states", async () => {
  for (const file of [
    "heroes.tsx",
    "loadouts.tsx",
    "inventory.tsx",
    "media.tsx",
    "heroes.$contentId.tsx",
    "loadouts.$contentId.tsx",
    "inventory.$contentId.tsx",
  ]) {
    const resolved = await readFile(
      new URL(`../src/routes/admin/${file}`, import.meta.url),
      "utf8",
    );
    assert.match(resolved, /pendingComponent/, `${file} needs a loading state`);
    assert.match(resolved, /errorComponent/, `${file} needs an error state`);
    assert.match(resolved, /noindex, nofollow/, `${file} must stay unindexed`);
  }
});
