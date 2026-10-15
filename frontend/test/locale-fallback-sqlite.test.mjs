/**
 * Final-audit SQLite proof (TEMPORARY — deleted before commit).
 * Runs REAL fallback SQL shapes against REAL node:sqlite, seeded with the
 * REAL migration-0006/0007 table shapes. No test doubles mirror the SQL.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";

const NOW = "2026-10-15T00:00:00.000Z";

function makeD1(sqlite) {
  return {
    prepare(query) {
      const stmt = sqlite.prepare(query);
      return {
        bind(...values) {
          return {
            async first() {
              return stmt.get(...values) ?? null;
            },
            async all() {
              return { results: stmt.all(...values) };
            },
          };
        },
      };
    },
  };
}

function seed() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(`
    CREATE TABLE cms_contents (
      id TEXT PRIMARY KEY NOT NULL, entity_type TEXT NOT NULL,
      default_locale TEXT NOT NULL DEFAULT 'en', status TEXT NOT NULL,
      published_at TEXT, created_by TEXT, updated_by TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE cms_content_translations (
      id TEXT PRIMARY KEY NOT NULL, content_id TEXT NOT NULL, locale TEXT NOT NULL,
      title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', slug TEXT NOT NULL,
      seo_title TEXT, seo_description TEXT, seo_canonical_override TEXT,
      seo_robots TEXT, og_title TEXT, og_description TEXT, og_image_asset_id TEXT,
      translation_status TEXT NOT NULL DEFAULT 'draft',
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      UNIQUE(content_id, locale));
    CREATE TABLE cms_slugs (
      id TEXT PRIMARY KEY NOT NULL, entity_type TEXT NOT NULL,
      content_id TEXT NOT NULL, locale TEXT NOT NULL, slug TEXT NOT NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      UNIQUE(entity_type, locale, slug));
    CREATE TABLE hero_records (
      content_id TEXT PRIMARY KEY NOT NULL, hero_class TEXT NOT NULL,
      rarity TEXT, popularity INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  `);
  return { sqlite, db: makeD1(sqlite) };
}

function put(sqlite, id, entity, defLoc, status, locales, hero = null) {
  sqlite
    .prepare(
      `INSERT INTO cms_contents (id, entity_type, default_locale, status, published_at, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, entity, defLoc, status, status === "published" ? NOW : null, null, null, NOW, NOW);
  for (const [loc, title, body] of locales) {
    sqlite
      .prepare(
        `INSERT INTO cms_content_translations (id, content_id, locale, title, body, slug, translation_status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 'complete', ?, ?)`,
      )
      .run(`t_${id}_${loc}`, id, loc, title, body ?? `${title} body`, `${title}-slug`, NOW, NOW);
    sqlite
      .prepare(
        `INSERT INTO cms_slugs (id, entity_type, content_id, locale, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(`s_${id}_${loc}`, entity, id, loc, `${title}-slug`, NOW, NOW);
  }
  if (hero)
    sqlite
      .prepare(
        `INSERT INTO hero_records (content_id, hero_class, rarity, popularity, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, "soldier", null, hero.pop ?? 0, hero.sort ?? 0, NOW, NOW);
}

function seedAll() {
  const { sqlite, db } = seed();
  put(sqlite, "h_en_only", "hero", "en", "published", [["en", "Storm King"]], { sort: 1, pop: 5 });
  put(sqlite, "h_es_only", "hero", "es", "published", [["es", "Solo Espanol"]], {
    sort: 2,
    pop: 4,
  });
  put(
    sqlite,
    "h_both",
    "hero",
    "en",
    "published",
    [
      ["en", "Frost"],
      ["es", "Escarcha"],
    ],
    { sort: 3, pop: 3 },
  );
  put(
    sqlite,
    "h_blank",
    "hero",
    "en",
    "published",
    [
      ["en", "Blank Base"],
      ["es", "   ", ""],
    ],
    { sort: 4, pop: 2 },
  );
  put(sqlite, "h_fr_home", "hero", "fr", "published", [["fr", "Accueil FR"]], { sort: 5, pop: 1 });
  put(sqlite, "h_draft_es", "hero", "en", "published", [["en", "Steady En"]], { sort: 6, pop: 0 });
  sqlite
    .prepare(
      `INSERT INTO cms_content_translations (id, content_id, locale, title, body, slug, translation_status, created_at, updated_at) VALUES ('t_h_draft_es_es','h_draft_es','es','Borrador','Borrador body','borrador-slug','draft',?,?)`,
    )
    .run(NOW, NOW);
  put(sqlite, "h_none", "hero", "en", "published", [], { sort: 7 });
  put(sqlite, "h_draft_content", "hero", "en", "draft", [["en", "Hidden Draft"]], { sort: 8 });
  return { sqlite, db };
}

// EXACT slug-lookup shape from db.server.ts getPublishedBySlug (verbatim,
// aliases normalized only: t->t_req, te->t_en for the proof SELECT wrapper).
const SLUG_SQL = `FROM cms_slugs s
  JOIN cms_contents c ON c.id = s.content_id
  LEFT JOIN cms_content_translations t_req ON t_req.content_id = c.id AND t_req.locale = ?
  LEFT JOIN cms_content_translations t_en ON t_en.content_id = c.id AND t_en.locale = 'en'
  LEFT JOIN cms_content_translations t_def ON t_def.content_id = c.id AND t_def.locale = c.default_locale
  WHERE s.entity_type = ? AND s.slug = ?
    AND c.status = 'published'
    AND (t_req.id IS NOT NULL OR t_def.id IS NOT NULL OR t_en.id IS NOT NULL)
  ORDER BY CASE WHEN s.locale = ? THEN 0 ELSE 1 END`;

const SLUG_SQL_CURRENT = `FROM cms_slugs s
  JOIN cms_contents c ON c.id = s.content_id
  LEFT JOIN cms_content_translations t_req ON t_req.content_id = c.id AND t_req.locale = ?
  LEFT JOIN cms_content_translations t_en ON t_en.content_id = c.id AND t_en.locale = 'en'
  WHERE s.entity_type = ? AND (s.locale = ? OR s.locale = 'en') AND s.slug = ?
    AND c.status = 'published'
    AND (t_req.id IS NOT NULL OR t_en.id IS NOT NULL)
  ORDER BY CASE WHEN s.locale = ? THEN 0 ELSE 1 END`;

test("AUDIT-A real SQLite: CURRENT slug SQL drops fr-default hero in es", async () => {
  const { db } = seedAll();
  // Source bind order: (reqLocale, entity, reqLocale, slug, reqLocale).
  const q = (slug) =>
    db
      .prepare(`SELECT c.id AS content_id ${SLUG_SQL_CURRENT} LIMIT 1`)
      .bind("es", "hero", "es", slug, "es")
      .first();
  assert.equal((await q("Escarcha-slug"))?.content_id, "h_both", "es slug resolves");
  assert.equal(
    (await q("Storm King-slug"))?.content_id,
    "h_en_only",
    "en-only hero reachable from es",
  );
  assert.equal(
    await q("Accueil FR-slug"),
    null,
    "BUG PROOF: fr-default hero invisible in es (current SQL)",
  );
});

test("AUDIT-B real SQLite: FIXED slug SQL (with default_locale) keeps fr-default hero", async () => {
  const { db } = seedAll();
  // Fixed shape: slug matched in ANY locale namespace, translation gated on
  // requested -> default_locale -> en. Binds: (req, entity, slug, req).
  const q = (slug) =>
    db
      .prepare(`SELECT c.id AS content_id ${SLUG_SQL} LIMIT 1`)
      .bind("es", "hero", slug, "es")
      .first();
  assert.equal((await q("Escarcha-slug"))?.content_id, "h_both");
  assert.equal((await q("Storm King-slug"))?.content_id, "h_en_only");
  assert.equal(
    (await q("Accueil FR-slug"))?.content_id,
    "h_fr_home",
    "default_locale join saves it",
  );
  assert.equal(await q("nope-slug"), null, "unknown slug still misses");
});

test("AUDIT-C real SQLite: blank requested fields fall back per-field", async () => {
  const { db } = seedAll();
  const one = await db
    .prepare(
      `SELECT COALESCE(NULLIF(t_req.title,''), t_en.title) AS title,
              COALESCE(NULLIF(t_req.body,''), t_en.body) AS body
         FROM cms_contents c
         LEFT JOIN cms_content_translations t_req ON t_req.content_id = c.id AND t_req.locale = ?
         LEFT JOIN cms_content_translations t_en ON t_en.content_id = c.id AND t_en.locale = 'en'
        WHERE c.id = 'h_blank'`,
    )
    .bind("es")
    .first();
  // NOTE: SQL NULLIF(col,'') treats '' as missing but NOT whitespace-only.
  // The h_blank es title is '   ' (spaces) so SQL keeps it; the body is ''
  // so it falls back. The JS mergeTranslationRows trims and would fall both
  // back — that helper is only used on single-row reads, not listings.
  assert.equal(one.title, "   ", "whitespace-only is NOT blank at the SQL layer");
  assert.equal(one.body, "Blank Base body", "empty-string body falls back to en");
});

test("AUDIT-D real SQLite: collection gating keeps en-only, drops empty, never drafts", async () => {
  const { db } = seedAll();
  const rows = await db
    .prepare(
      `SELECT c.id AS content_id FROM cms_contents c
       LEFT JOIN cms_content_translations t_req ON t_req.content_id = c.id AND t_req.locale = ?
       LEFT JOIN cms_content_translations t_en ON t_en.content_id = c.id AND t_en.locale = 'en'
       WHERE c.entity_type='hero' AND c.status='published' AND (t_req.id IS NOT NULL OR t_en.id IS NOT NULL)
       ORDER BY c.id ASC`,
    )
    .bind("es")
    .all();
  const ids = rows.results.map((r) => r.content_id);
  assert.ok(ids.includes("h_en_only"), "en-only kept");
  assert.ok(ids.includes("h_both"), "translated kept exactly once");
  assert.equal(ids.filter((i) => i === "h_both").length, 1);
  assert.ok(!ids.includes("h_none"), "translation-less excluded gracefully");
  assert.ok(!ids.includes("h_draft_content"), "draft content never leaks");
});
