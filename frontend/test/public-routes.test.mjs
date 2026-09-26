// Phase 13 tests part 2: source-text guards for routes, SEO, leakage.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("public loaders published-only incl archived, no secret leakage", async () => {
  for (const f of [
    "lib/cms/public.loader.ts",
    "lib/cms/public-hero-detail.loader.ts",
    "lib/cms/public-loadout-detail.loader.ts",
  ]) {
    const src = await readFile(new URL(`../src/${f}`, import.meta.url), "utf8");
    assert.ok(/published/.test(src), f);
    assert.equal(/imagekit/i.test(src), false, f);
    assert.equal(/privateKey|PRIVATE_KEY|IMAGEKIT_PRIVATE|password/i.test(src), false, f);
  }
  const server = await readFile(
    new URL("../src/lib/cms/heroes-loadouts.server.ts", import.meta.url),
    "utf8",
  );
  assert.ok(server.includes('status !== "published"'), "member status re-check");
  const heroLoader = await readFile(
    new URL("../src/lib/cms/public-hero-detail.loader.ts", import.meta.url),
    "utf8",
  );
  assert.ok(heroLoader.includes('status !== "published"'), "hero member re-check");
  const loadoutLoader = await readFile(
    new URL("../src/lib/cms/public-loadout-detail.loader.ts", import.meta.url),
    "utf8",
  );
  assert.ok(loadoutLoader.includes('status !== "published"'), "loadout member re-check");
});

test("public routes exist with canonical hreflang and locale redirects", async () => {
  const files = [
    "routes/heroes.tsx",
    "routes/loadouts.tsx",
    "routes/heroes.$slug.tsx",
    "routes/loadouts.$slug.tsx",
    "routes/$locale.heroes.tsx",
    "routes/$locale.loadouts.tsx",
    "routes/$locale.heroes.$slug.tsx",
    "routes/$locale.loadouts.$slug.tsx",
  ];
  for (const f of files) {
    const src = await readFile(new URL(`../src/${f}`, import.meta.url), "utf8");
    assert.ok(src.includes("createFileRoute"), f);
    assert.ok(src.includes("canonical") && src.includes("hreflang"), f);
  }
  for (const f of [
    "routes/$locale.heroes.tsx",
    "routes/$locale.loadouts.tsx",
    "routes/$locale.heroes.$slug.tsx",
    "routes/$locale.loadouts.$slug.tsx",
  ]) {
    const src = await readFile(new URL(`../src/${f}`, import.meta.url), "utf8");
    assert.ok(src.includes("throw redirect"), f);
  }
  const sitemap = await readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8");
  assert.ok(sitemap.includes("https://hawkbucks.com/heroes"));
  assert.ok(sitemap.includes("https://hawkbucks.com/fa-IR/loadouts"));
  assert.equal(sitemap.includes("/en/heroes") || sitemap.includes("/en/loadouts"), false);
});

test("detail hreflang only complete translations advertised", async () => {
  for (const f of [
    "routes/heroes.$slug.tsx",
    "routes/loadouts.$slug.tsx",
    "routes/$locale.heroes.$slug.tsx",
    "routes/$locale.loadouts.$slug.tsx",
  ]) {
    const src = await readFile(new URL(`../src/${f}`, import.meta.url), "utf8");
    assert.ok(src.includes("entityHreflangAlternates"), f);
    assert.ok(src.includes("completeLocales") && src.includes("slugsByLocale"), f);
  }
  for (const f of [
    "lib/cms/public-hero-detail.loader.ts",
    "lib/cms/public-loadout-detail.loader.ts",
  ]) {
    const src = await readFile(new URL(`../src/${f}`, import.meta.url), "utf8");
    assert.ok(src.includes("translation_status") && src.includes("completeLocales"), f);
  }
  const pc = await import("../src/lib/cms/public-content.ts");
  const urls = await import("../src/lib/locale-urls.ts");
  const alt = pc.entityHreflangAlternates({
    kind: "hero",
    currentSlug: "storm-king",
    completeLocales: ["en", "es"],
    slugsByLocale: { en: "storm-king", es: "rey-tormenta" },
    hreflangOf: urls.hreflangFor,
    localizePath: urls.localizePath,
    canonicalUrlFor: urls.canonicalUrlFor,
  });
  const byTag = Object.fromEntries(alt.map((a) => [a.hreflang, a.href]));
  assert.equal(byTag.es, "https://hawkbucks.com/es/heroes/rey-tormenta");
  assert.equal(byTag.en, "https://hawkbucks.com/heroes/storm-king");
  assert.equal(byTag["x-default"], "https://hawkbucks.com/heroes/storm-king");
  assert.ok(!("fr" in byTag));
});

test("cards dialog crawlable links alt text empty-slot testids", async () => {
  const card = await readFile(
    new URL("../src/components/cms/HeroCard.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(card.includes("heroDetailHref") && card.includes("<Link"));
  assert.ok(card.includes("alt={hero.title}"));
  const lcard = await readFile(
    new URL("../src/components/cms/LoadoutCard.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(lcard.includes("loadoutDetailHref"));
  const dlg = await readFile(
    new URL("../src/components/cms/HeroPreviewDialog.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(dlg.includes("Dialog") && dlg.includes("viewDetails"));
  const detail = await readFile(
    new URL("../src/components/cms/LoadoutDetail.tsx", import.meta.url),
    "utf8",
  );
  assert.ok(detail.includes("empty-support-slot") && detail.includes("support-slot-"));
});
