// Phase 15 tests part 2: source-text guards for routes, SEO, leakage.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("inventory loaders published-only, no secret leakage", async () => {
  for (const f of [
    "lib/cms/public-inventory.loader.ts",
    "lib/cms/public-schematic-detail.loader.ts",
  ]) {
    const src = await readFile(new URL(`../src/${f}`, import.meta.url), "utf8");
    assert.ok(/published/.test(src), f);
    assert.equal(/imagekit/i.test(src), false, f);
    assert.equal(/privateKey|PRIVATE_KEY|IMAGEKIT_PRIVATE|password/i.test(src), false, f);
    assert.equal(/preview|audit|session/i.test(src), false, f);
  }
  const server = await readFile(
    new URL("../src/lib/cms/schematics-inventory.server.ts", import.meta.url),
    "utf8",
  );
  assert.ok(server.includes('status !== "published"'), "member status re-check");
  for (const f of ["components/cms/InventoryCard.tsx", "components/cms/InventoryPage.tsx"]) {
    const src = await readFile(new URL(`../src/${f}`, import.meta.url), "utf8");
    assert.equal(
      /from ["']@\/lib\/cms\/db\.server|heroes-loadouts\.server|schematics-inventory\.server/.test(
        src,
      ),
      false,
      f,
    );
    assert.equal(/delivery_url|provider_asset|privateKey/i.test(src), false, f);
  }
});

test("inventory routes exist with canonical hreflang and locale redirects", async () => {
  const files = [
    "routes/inventory.tsx",
    "routes/inventory.$slug.tsx",
    "routes/$locale.inventory.tsx",
    "routes/$locale.inventory.$slug.tsx",
  ];
  for (const f of files) {
    const src = await readFile(new URL(`../src/${f}`, import.meta.url), "utf8");
    assert.ok(src.includes("createFileRoute"), f);
    assert.ok(src.includes("canonical") && src.includes("hreflang"), f);
  }
  for (const f of ["routes/$locale.inventory.tsx", "routes/$locale.inventory.$slug.tsx"]) {
    const src = await readFile(new URL(`../src/${f}`, import.meta.url), "utf8");
    assert.ok(src.includes("throw redirect"), f);
  }
  const card = await readFile(
    new URL("../src/components/cms/InventoryCard.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(card.includes("inventoryDetailHref") && card.includes("<Link"));
  assert.ok(card.includes("alt={item.title}"));
  const detail = await readFile(
    new URL("../src/components/cms/SchematicDetail.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(detail.includes("perk-slot") || detail.includes("perksLabel"));
  assert.ok(detail.includes("backToInventory"));
  assert.equal(/damage|rarity|reload|durability|headshot/i.test(detail), false);
  const sitemap = await readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8");
  assert.ok(sitemap.includes("https://hawkbucks.com/inventory"));
  assert.ok(sitemap.includes("https://hawkbucks.com/fa-IR/inventory"));
  assert.equal(sitemap.includes("/en/inventory"), false);
});

test("inventory detail hreflang only complete translations advertised", async () => {
  for (const f of ["routes/inventory.$slug.tsx", "routes/$locale.inventory.$slug.tsx"]) {
    const src = await readFile(new URL(`../src/${f}`, import.meta.url), "utf8");
    assert.ok(src.includes("entityHreflangAlternates"), f);
    assert.ok(src.includes("completeLocales") && src.includes("slugsByLocale"), f);
  }
  const src = await readFile(
    new URL("../src/lib/cms/public-schematic-detail.loader.ts", import.meta.url),
    "utf8",
  );
  assert.ok(src.includes("translation_status") && src.includes("completeLocales"), src);
});
