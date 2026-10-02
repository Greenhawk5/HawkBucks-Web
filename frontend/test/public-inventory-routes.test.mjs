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
  for (const f of ["components/cms/SchematicCard.tsx", "components/cms/SchematicsPage.tsx"]) {
    const src = await readFile(new URL(`../src/${f}`, import.meta.url), "utf8");
    assert.equal(
      /from ["']@\/lib\/cms\/db\.server|heroes-loadouts\.server|schematics-inventory\.server/.test(
        src,
      ),
      false,
      f,
    );
    assert.equal(/provider_asset|privateKey/i.test(src), false, f);
    // The hub may only read `delivery_url` off the server row it maps into
    // `imageUrl`; it must never build a media URL from provider internals.
    const mapped = src.replace(/imageUrl:\s*r\.delivery_url,?/g, "");
    assert.equal(/delivery_url/.test(mapped), false, f);
  }
});

test("legacy inventory routes permanently redirect to canonical schematics", async () => {
  const files = [
    "routes/inventory.tsx",
    "routes/inventory.$slug.tsx",
    "routes/$locale.inventory.tsx",
    "routes/$locale.inventory.$slug.tsx",
  ];
  for (const f of files) {
    const src = await readFile(new URL(`../src/${f}`, import.meta.url), "utf8");
    assert.ok(src.includes("createFileRoute"), f);
  }
  for (const f of [
    "routes/inventory.tsx",
    "routes/inventory.$slug.tsx",
    "routes/$locale.inventory.tsx",
    "routes/$locale.inventory.$slug.tsx",
  ]) {
    const src = await readFile(new URL(`../src/${f}`, import.meta.url), "utf8");
    assert.ok(src.includes("throw redirect"), f);
    assert.ok(src.includes("/schematics"), f);
  }
  const card = await readFile(
    new URL("../src/components/cms/SchematicCard.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(card.includes("schematicDetailHref") && card.includes("<Link"));
  assert.ok(card.includes("alt={item.title}"));
  // Cards link to the canonical /schematics detail path, never /inventory.
  assert.ok(card.includes("/schematics/"));
  assert.equal(card.includes("/inventory/"), false);
  const detail = await readFile(
    new URL("../src/components/cms/SchematicDetail.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(detail.includes("perk-slot") || detail.includes("perksLabel"));
  // The reader-facing back link follows the Schematics IA, never "Inventory".
  assert.ok(detail.includes("backToSchematics"));
  // Rarity is a real CMS editorial field now; fabricated combat stats are not.
  assert.equal(/damage|reload|durability|headshot|aggregateRating/i.test(detail), false);
  const sitemap = await readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8");
  assert.ok(sitemap.includes("https://hawkbucks.com/schematics"));
  assert.ok(sitemap.includes("https://hawkbucks.com/fa-IR/schematics"));
  assert.equal(sitemap.includes("/en/schematics"), false);
  assert.equal(sitemap.includes("/inventory"), false);
});

test("inventory detail hreflang only complete translations advertised", async () => {
  for (const f of ["routes/schematics.$slug.tsx", "routes/$locale.schematics.$slug.tsx"]) {
    const src = await readFile(new URL(`../src/${f}`, import.meta.url), "utf8");
    assert.ok(src.includes("entityHreflangAlternates") || src.includes("buildDetailHead"), f);
    assert.ok(src.includes("completeLocales") && src.includes("slugsByLocale"), f);
  }
  const src = await readFile(
    new URL("../src/lib/cms/public-schematic-detail.loader.ts", import.meta.url),
    "utf8",
  );
  assert.ok(src.includes("translation_status") && src.includes("completeLocales"), src);
});
