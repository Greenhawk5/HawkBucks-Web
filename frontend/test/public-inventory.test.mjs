// Phase 15 tests part 1: pure inventory logic (query state, ordering, paths, SEO, i18n).
import assert from "node:assert/strict";
import test from "node:test";

const pc = await import("../src/lib/cms/public-content.ts");
const pcs = await import("../src/lib/cms/public-content-slots.ts");
const ps = await import("../src/lib/cms/public-strings.ts");

test("inventory query state normalizes safely", () => {
  assert.equal(pc.parseInventoryTypeParam("weapon"), "weapon");
  assert.equal(pc.parseInventoryTypeParam("trap"), "trap");
  assert.equal(pc.parseInventoryTypeParam("all"), "all");
  assert.equal(pc.parseInventoryTypeParam("schematic"), "all");
  assert.equal(pc.parseInventoryTypeParam("WEAPON"), "all");
  assert.equal(pc.parseInventoryTypeParam(""), "all");
  assert.equal(pc.parseInventoryTypeParam(undefined), "all");
  assert.equal(pc.parseInventorySortParam("popularity"), "popularity");
  assert.equal(pc.parseInventorySortParam("name"), "name");
  assert.equal(pc.parseInventorySortParam("bogus"), "editorial");
  assert.equal(pc.parseInventorySortParam(undefined), "editorial");
  assert.equal(pc.parseSearchParam("  "), null);
  assert.equal(pc.parseSearchParam("  Siegebreaker  "), "Siegebreaker");
  assert.equal(pc.parsePageParam("2"), 2);
  assert.equal(pc.parsePageParam("0"), 1);
  assert.equal(pc.parsePageParam("xx"), 1);
});

test("inventory sorting is distinct and deterministic", () => {
  const rows = [
    { sort_order: 1, popularity: 5, title: "B" },
    { sort_order: 0, popularity: 1, title: "A" },
    { sort_order: 0, popularity: 9, title: "C" },
  ];
  assert.deepEqual(
    [...rows].sort(pc.compareInventoryItems("editorial")).map((r) => r.title),
    ["C", "A", "B"],
  );
  assert.deepEqual(
    [...rows].sort(pc.compareInventoryItems("popularity")).map((r) => r.title),
    ["C", "B", "A"],
  );
  assert.deepEqual(
    [...rows].sort(pc.compareInventoryItems("name")).map((r) => r.title),
    ["A", "B", "C"],
  );
});

test("inventory paths + schematic hreflang only complete translations", async () => {
  assert.equal(pcs.schematicDetailPath("siegebreaker"), "/inventory/siegebreaker");
  const urls = await import("../src/lib/locale-urls.ts");
  assert.ok(urls.INDEXABLE_BASE_PATHS.includes("/inventory"));
  const all = urls.hreflangAlternates("/inventory");
  assert.equal(all.length, 10);
  assert.ok(!all.some((a) => a.href.includes("/en/inventory")));
  const alt = pc.entityHreflangAlternates({
    kind: "schematic",
    currentSlug: "siegebreaker",
    completeLocales: ["en", "es"],
    slugsByLocale: { en: "siegebreaker", es: "rompemuros" },
    hreflangOf: urls.hreflangFor,
    localizePath: urls.localizePath,
    canonicalUrlFor: urls.canonicalUrlFor,
  });
  const byTag = Object.fromEntries(alt.map((a) => [a.hreflang, a.href]));
  assert.equal(byTag.en, "https://hawkbucks.com/inventory/siegebreaker");
  assert.equal(byTag.es, "https://hawkbucks.com/es/inventory/rompemuros");
  assert.equal(byTag["x-default"], "https://hawkbucks.com/inventory/siegebreaker");
  assert.ok(!("fr" in byTag));
});

test("inventory json-ld carries no fabricated stats", () => {
  const ld = pcs.buildSchematicJsonLd({
    name: "N",
    description: "D",
    url: "https://hawkbucks.com/inventory/n",
    image: null,
    kind: "weapon",
    perkNames: ["A"],
    breadcrumbBase: "https://hawkbucks.com/",
  });
  const text = JSON.stringify(ld);
  assert.ok(!/damage|rarity|reload|durability|headshot|aggregateRating|review|author/i.test(text));
  assert.ok(text.includes("/inventory/n"));
});

test("inventory strings: 9 locales", () => {
  for (const locale of ["en", "es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"]) {
    const s = ps.getPublicStrings(locale);
    assert.ok(s.inventoryTitle, locale);
    assert.ok(s.typeWeapon && s.typeTrap, locale);
    assert.ok(s.perksLabel && s.backToInventory, locale);
  }
  assert.equal(ps.getPublicStrings("es").inventoryTitle, "Inventario");
  assert.equal(ps.getPublicStrings("ar-SA").typeWeapon, "الأسلحة");
});

test("inventory taxonomy values stay stable", async () => {
  const tax = await import("../src/lib/cms/schematics.ts");
  assert.ok(tax.isWeaponSubtype("assault"));
  assert.ok(!tax.isWeaponSubtype("railgun"));
  assert.ok(tax.isTrapSubtype("damage"));
  assert.ok(tax.isSchematicKind("weapon") && tax.isSchematicKind("trap"));
  assert.ok(!tax.isSchematicKind("perk"));
});

test("unified inventory reader merges server-side with pagination", async () => {
  const src = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../src/lib/cms/public-inventory.loader.ts", import.meta.url), "utf8"),
  );
  assert.ok(src.includes("listPublicInventory"), "unified reader exists");
  assert.ok(src.includes("listPublicSchematics"), "inventory sources schematic entities");
  assert.ok(src.includes("status = 'published'") || src.includes("listPublished"));
  const invFn = src.slice(src.indexOf("export const listPublicInventory"));
  assert.equal(invFn.includes("listPublicWeapons"), false, "no weapon-entity slugs");
  assert.equal(invFn.includes("listPublicTraps"), false, "no trap-entity slugs");
  // Browser page must call the unified reader, never raw weapon/trap readers.
  const page = await import("node:fs/promises").then((fs) =>
    fs.readFile(new URL("../src/components/cms/InventoryPage.tsx", import.meta.url), "utf8"),
  );
  assert.ok(page.includes("listPublicInventory"), "page uses unified reader");
  assert.equal(page.includes("listPublicWeapons"), false);
  assert.equal(page.includes("listPublicTraps"), false);
  assert.equal(page.includes("listPublicSchematics"), false);
});
