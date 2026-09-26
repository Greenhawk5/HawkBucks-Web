// Phase 12 tests: pure hero/loadout validation, migration text guards.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
const heroes = await import("../src/lib/cms/heroes.ts");
test("hero classes: canonical four only", () => {
  assert.deepEqual([...heroes.HERO_CLASSES].sort(), [
    "constructor",
    "ninja",
    "outlander",
    "soldier",
  ]);
  assert.equal(heroes.isHeroClass("ninja"), true);
  assert.equal(heroes.isHeroClass("Mage"), false);
  assert.equal(heroes.isHeroClass(""), false);
});
test("category: stable machine values, null normalization", () => {
  assert.equal(heroes.normalizeHeroCategory(null), null);
  assert.equal(heroes.normalizeHeroCategory(""), null);
  assert.equal(heroes.normalizeHeroCategory("Support"), "support");
  assert.equal(heroes.normalizeHeroCategory("free text"), null);
});
test("popularity/sort deterministic order", () => {
  const rows = [
    { sort_order: 1, popularity: 5 },
    { sort_order: 0, popularity: 1 },
    { sort_order: 0, popularity: 9 },
  ];
  assert.deepEqual(
    [...rows].sort(heroes.compareEditorialOrder).map((r) => r.popularity),
    [9, 1, 5],
  );
  assert.equal(heroes.isValidPopularity(-1), false);
  assert.equal(heroes.isValidPopularity(10), true);
});
test("ability keys + locales validated", () => {
  assert.equal(heroes.isValidAbilityKey("phase-shift"), true);
  assert.equal(heroes.isValidAbilityKey("Bad Key!"), false);
  assert.equal(heroes.isCmsContentLocale("fa-IR"), true);
  assert.equal(heroes.isCmsContentLocale("xx"), false);
});
test("migration 0007: domain tables reuse foundation", async () => {
  const sql = await readFile(
    new URL("../../worker/migrations/0007_heroes_loadouts.sql", import.meta.url),
    "utf8",
  );
  for (const t of [
    "hero_records",
    "hero_abilities",
    "hero_ability_translations",
    "loadout_records",
    "loadout_heroes",
  ])
    assert.ok(sql.includes(`CREATE TABLE IF NOT EXISTS ${t}`), `missing ${t}`);
  assert.equal(/cms_contents/.test(sql), true);
  assert.equal(/cms_content_translations\s*\(/.test(sql), false);
  assert.equal(/cms_slugs\s*\(/.test(sql), false);
  assert.equal(/imagekit/i.test(sql), false);
  assert.equal(/schematic|weapon|trap|perk/i.test(sql), false);
  assert.ok(sql.includes("ON DELETE CASCADE"));
});
test("server module: no provider leakage, published-only reads", async () => {
  const src = await readFile(
    new URL("../src/lib/cms/heroes-loadouts.server.ts", import.meta.url),
    "utf8",
  );
  assert.equal(/imagekit/i.test(src), false);
  assert.equal(/privateKey|PRIVATE_KEY/.test(src), false);
  assert.ok(src.includes("status = 'published'") || src.includes('status !== "published"'));
  assert.ok(src.includes("getPublishedHeroBySlug") && src.includes("listPublishedHeroes"));
  assert.ok(src.includes("getPublishedLoadoutBySlug") && src.includes("listPublishedLoadouts"));
  assert.ok(src.includes("assertMediaUnreferenced"));
});
test("admin routes: noindex, session-guarded", async () => {
  for (const f of [
    "routes/admin/heroes.tsx",
    "routes/admin/loadouts.tsx",
    "routes/admin/heroes.$contentId.tsx",
    "routes/admin/loadouts.$contentId.tsx",
  ]) {
    const src = await readFile(new URL(`../src/${f}`, import.meta.url), "utf8");
    assert.ok(src.includes("noindex"), f);
    assert.ok(src.includes("getAdminSession"), f);
  }
  const loader1 = await readFile(
    new URL("../src/lib/cms/heroes-admin.loader.ts", import.meta.url),
    "utf8",
  );
  assert.ok(/CmsAuthError|requireSession|hasCapability/.test(loader1));
  assert.ok(loader1.includes("cms.publish"));
  const loader2 = await readFile(
    new URL("../src/lib/cms/loadouts-admin.loader.ts", import.meta.url),
    "utf8",
  );
  assert.ok(/CmsAuthError|hasCapability/.test(loader2));
  assert.ok(loader2.includes("setLoadoutHeroes"));
});
