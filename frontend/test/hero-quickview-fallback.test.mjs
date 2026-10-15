import assert from "node:assert/strict";
import test from "node:test";

const NOW = "2026-10-15T00:00:00.000Z";

function makeD1(sqlite) {
  return {
    prepare(query) {
      const stmt = sqlite.prepare(query);
      return {
        bind(...values) {
          return {
            first: async () => stmt.get(...values) ?? null,
            all: async () => ({ results: stmt.all(...values) }),
          };
        },
      };
    },
  };
}

function putHero(sqlite, id, opts) {
  const status = opts.status ?? "published";
  const defLoc = opts.defLoc ?? "en";
  sqlite
    .prepare(
      "INSERT INTO cms_contents (id, entity_type, default_locale, status, published_at, created_by, updated_by, created_at, updated_at) VALUES (?, 'hero', ?, ?, ?, NULL, NULL, ?, ?)",
    )
    .run(id, defLoc, status, status === "published" ? NOW : null, NOW, NOW);
  for (const row of opts.locales) {
    sqlite
      .prepare(
        "INSERT INTO cms_content_translations (id, content_id, locale, title, body, slug, translation_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'complete', ?, ?)",
      )
      .run(`t_${id}_${row[0]}`, id, row[0], row[1], `${row[1]} body`, row[2], NOW, NOW);
    sqlite
      .prepare(
        "INSERT INTO cms_slugs (id, entity_type, content_id, locale, slug, created_at, updated_at) VALUES (?, 'hero', ?, ?, ?, ?, ?)",
      )
      .run(`s_${id}_${row[0]}`, id, row[0], row[2], NOW, NOW);
  }
  sqlite
    .prepare(
      "INSERT INTO hero_records (content_id, hero_class, rarity, popularity, sort_order, created_at, updated_at) VALUES (?, 'soldier', 'legendary', 0, 0, ?, ?)",
    )
    .run(id, NOW, NOW);
}

async function seedDb() {
  const { DatabaseSync } = await import("node:sqlite");
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(
    "CREATE TABLE cms_contents (id TEXT PRIMARY KEY NOT NULL, entity_type TEXT NOT NULL, default_locale TEXT NOT NULL DEFAULT 'en', status TEXT NOT NULL, published_at TEXT, created_by TEXT, updated_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);" +
      "CREATE TABLE cms_content_translations (id TEXT PRIMARY KEY NOT NULL, content_id TEXT NOT NULL, locale TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', slug TEXT NOT NULL, seo_title TEXT, seo_description TEXT, seo_canonical_override TEXT, seo_robots TEXT, og_title TEXT, og_description TEXT, og_image_asset_id TEXT, translation_status TEXT NOT NULL DEFAULT 'draft', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(content_id, locale));" +
      "CREATE TABLE cms_slugs (id TEXT PRIMARY KEY NOT NULL, entity_type TEXT NOT NULL, content_id TEXT NOT NULL, locale TEXT NOT NULL, slug TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(entity_type, locale, slug));" +
      "CREATE TABLE hero_records (content_id TEXT PRIMARY KEY NOT NULL, hero_class TEXT NOT NULL, rarity TEXT, popularity INTEGER NOT NULL DEFAULT 0, sort_order INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);",
  );
  putHero(sqlite, "h_en_only", { locales: [["en", "Storm King", "storm-king"]] });
  putHero(sqlite, "h_both", {
    locales: [
      ["en", "Frost", "frost"],
      ["es", "Escarcha", "escarcha"],
    ],
  });
  putHero(sqlite, "h_draft", {
    status: "draft",
    locales: [["en", "Draft", "draft-hero"]],
  });
  return makeD1(sqlite);
}

const { resolveHeroIdentity } = await import("../src/lib/cms/hero-identity.server.ts");

test("1. English-only hero resolves from es", async () => {
  const db = await seedDb();
  const ident = await resolveHeroIdentity(db, "es", "storm-king");
  assert.ok(ident, "en-only hero must not 404 from es");
  assert.equal(ident.contentId, "h_en_only");
  assert.equal(ident.title, "Storm King");
  assert.equal(ident.isLocaleFallback, true);
});

test("2. translated hero prefers es", async () => {
  const db = await seedDb();
  const ident = await resolveHeroIdentity(db, "es", "escarcha");
  assert.ok(ident);
  assert.equal(ident.contentId, "h_both");
  assert.equal(ident.title, "Escarcha");
  assert.equal(ident.slug, "escarcha");
  assert.equal(ident.isLocaleFallback, false);
});

test("3. differing es slug names the same hero", async () => {
  const db = await seedDb();
  const viaEs = await resolveHeroIdentity(db, "es", "escarcha");
  const viaEn = await resolveHeroIdentity(db, "en", "frost");
  assert.ok(viaEs && viaEn);
  assert.equal(viaEs.contentId, viaEn.contentId);
  assert.equal(viaEn.title, "Frost");
});

test("4. missing or unpublished stay null", async () => {
  const db = await seedDb();
  assert.equal(await resolveHeroIdentity(db, "es", "no-such-hero"), null);
  assert.equal(await resolveHeroIdentity(db, "es", "draft-hero"), null);
  assert.equal(await resolveHeroIdentity(db, "en", "draft-hero"), null);
});

test("5. both loaders share the resolver", async () => {
  const { readFile } = await import("node:fs/promises");
  for (const f of [
    "../src/lib/cms/public-hero-quickview.loader.ts",
    "../src/lib/cms/public-hero-detail.loader.ts",
  ]) {
    const src = await readFile(new URL(f, import.meta.url), "utf8");
    assert.match(src, /resolveHeroIdentity/, `${f} must use the shared resolver`);
  }
  const quick = await readFile(
    new URL("../src/lib/cms/public-hero-quickview.loader.ts", import.meta.url),
    "utf8",
  );
  assert.equal(
    /s\.locale = \? OR s\.locale = 'en'/.test(quick),
    false,
    "quick view must not restrict slugs to the en namespace",
  );
});
