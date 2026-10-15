// Icon registry (migration 0017) — schema, key vocabulary, resolver and safety.
//
// WHAT THIS PINS
// ---------------
//   * 0017 is additive: it creates ONE table and drops/alters nothing, and the
//     rolling-index test in hero-media.test.mjs now expects it as the newest
//   * an entry is a POINTER, not a copy — the registry holds an
//     `icon_asset_id` FK and never a URL, never an upload path
//   * semantic identity is exact and prefix-checked, so a key cannot be filed
//     under a category it does not name
//   * the resolver never fuzzy-matches: a key either resolves to a real delivery
//     URL or is simply absent, and both built-in consumers then fall back to
//     text with no broken image
//   * deleting a registry row leaves the asset and its object alone, and a live
//     binding is a reference that blocks a physical media delete
//   * the round trip is exercised against the REAL migration chain on an
//     in-memory database; production is never touched
//
// Run with the repo's existing suite:  npm run test:server
import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";

const MIGRATIONS = new URL("../../worker/migrations/", import.meta.url);
const SRC = new URL("../src/", import.meta.url);

async function repo(relFromSrc) {
  return readFile(new URL(relFromSrc, SRC), "utf8");
}

/** Strip comments so a comment can never satisfy an assertion. */
function stripComments(sql) {
  return sql.replace(/--.*$/gm, "");
}

/** Fresh DB with every migration applied, foreign keys enforced. */
async function freshDb() {
  const names = (await readdir(MIGRATIONS)).filter((n) => n.endsWith(".sql")).sort();
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const name of names) db.exec(await readFile(new URL(name, MIGRATIONS), "utf8"));
  return { db: d1Like(db), raw: db, applied: names.length };
}

/**
 * Minimal `node:sqlite` -> D1 adapter.
 *
 * The service is written against D1 (`prepare().bind().first()/.all()/.run()`),
 * and `node:sqlite` exposes `.get()/.all()/.run()` with positional args, so the
 * four D1 verbs are mapped straight through. Only what this service actually
 * calls is implemented — this is a test seam, not a D1 reimplementation.
 */
function d1Like(db) {
  return {
    prepare(sql) {
      let args = [];
      return {
        bind(...values) {
          args = values;
          return this;
        },
        first() {
          const row = db.prepare(sql).get(...args);
          return Promise.resolve(row ?? null);
        },
        all() {
          const results = db.prepare(sql).all(...args);
          return Promise.resolve({ results });
        },
        run() {
          const info = db.prepare(sql).run(...args);
          return Promise.resolve({ success: true, changes: info.changes });
        },
      };
    },
    exec(query) {
      db.exec(query);
    },
  };
}

/** One usable asset row, which is the only thing a registry entry points at. */
function seedAsset(db, id = "m1", key = "icons/soldier.png") {
  db.exec(
    `INSERT INTO media_assets (id, provider, provider_asset_id, delivery_url,
        original_filename, mime_type, alt_text, status, created_at, updated_at)
     VALUES ('${id}', 'r2', '${key}', 'https://media.example/${key}', '${key}', 'image/png', '', 'ready', 't', 't')`,
  );
}

test("0017 creates exactly one table and is strictly additive", async () => {
  const sql = await readFile(new URL("0017_icon_registry.sql", MIGRATIONS), "utf8");
  const executed = stripComments(sql);
  assert.equal(executed.match(/CREATE TABLE IF NOT EXISTS/g)?.length, 1);
  for (const forbidden of [
    /\bDROP\s+TABLE\b/i,
    /\bDROP\s+INDEX\b/i,
    /\bDELETE\s+FROM\b/i,
    /\bTRUNCATE\b/i,
    /ALTER\s+TABLE[\s\S]*?DROP\s+COLUMN/i,
  ]) {
    assert.equal(forbidden.test(executed), false);
  }
});

test("0017 references canonical media instead of duplicating files", async () => {
  const sql = await readFile(new URL("0017_icon_registry.sql", MIGRATIONS), "utf8");
  // THE point of the design: an entry points at the Media Library's own row, so
  // no second copy of the bytes can exist and no second storage path is needed.
  assert.match(sql, /media_asset_id TEXT REFERENCES media_assets \(id\) ON DELETE SET NULL/);
  // No URL/blob column anywhere — a stored URL would drift from the asset row.
  assert.doesNotMatch(stripComments(sql), /icon_url|blob|provider_asset_id/i);
  assert.match(
    sql,
    /CREATE UNIQUE INDEX IF NOT EXISTS idx_icon_registry_key\s+ON icon_registry \(semantic_key\)/,
  );
  assert.match(
    sql,
    /CREATE INDEX IF NOT EXISTS idx_icon_registry_media\s+ON icon_registry \(media_asset_id\)\s*WHERE media_asset_id IS NOT NULL/,
  );
  assert.match(sql, /CHECK \(length\(trim\(semantic_key\)\) > 0\)/);
  assert.match(sql, /CHECK \(length\(trim\(display_name\)\) > 0\)/);
});

test("the whole migration chain applies and 0017 behaves as designed", async () => {
  const { raw, applied } = await freshDb();
  assert.ok(applied >= 17, `expected at least 17 migrations, applied ${applied}`);

  seedAsset(raw);
  raw.exec(
    `INSERT INTO icon_registry (id, semantic_key, display_name, category, media_asset_id, created_at, updated_at)
     VALUES ('i1', 'hero-class:soldier', 'Soldier', 'hero-class', 'm1', 't', 't')`,
  );

  // Resolution is an exact joined read against ready media.
  const resolved = raw
    .prepare(
      `SELECT r.semantic_key, m.delivery_url FROM icon_registry r
        LEFT JOIN media_assets m ON m.id = r.media_asset_id AND m.status = 'ready'
       WHERE r.semantic_key IN (?)`,
    )
    .all("hero-class:soldier");
  assert.deepEqual(
    resolved.map((r) => ({ ...r })),
    [
      {
        semantic_key: "hero-class:soldier",
        delivery_url: "https://media.example/icons/soldier.png",
      },
    ],
  );

  // A key nobody registered resolves to NOTHING — never a guessed sibling.
  assert.deepEqual(
    raw
      .prepare(`SELECT r.semantic_key FROM icon_registry r WHERE r.semantic_key IN (?)`)
      .all("hero-class:ninja")
      .map((r) => ({ ...r })),
    [],
  );

  // A live binding is a reference the delete guard can see.
  assert.deepEqual(
    raw
      .prepare("SELECT semantic_key FROM icon_registry WHERE media_asset_id = ?")
      .all("m1")
      .map((r) => ({ ...r })),
    [{ semantic_key: "hero-class:soldier" }],
  );

  // Deleting the ROW leaves the asset row and therefore the object alive.
  raw.exec("DELETE FROM icon_registry WHERE id = 'i1'");
  assert.ok(raw.prepare("SELECT id FROM media_assets WHERE id = 'm1'").get());

  // Destroying the ASSET clears the pointer instead of dangling it.
  raw.exec(
    `INSERT INTO icon_registry (id, semantic_key, display_name, category, media_asset_id, created_at, updated_at)
     VALUES ('i2', 'hero-class:ninja', 'Ninja', 'hero-class', 'm1', 't', 't')`,
  );
  raw.exec("DELETE FROM media_assets WHERE id = 'm1'");
  assert.deepEqual(
    raw
      .prepare("SELECT semantic_key, media_asset_id FROM icon_registry")
      .all()
      .map((r) => ({ ...r })),
    [{ semantic_key: "hero-class:ninja", media_asset_id: null }],
  );
});

test("semantic keys are exact, prefix-checked and never fuzzy-matched", async () => {
  const { ICON_CATEGORIES, parseIconSemanticKey, validateIconEntry, heroClassIconKey } =
    await import("../src/lib/icon-registry.ts");

  assert.deepEqual(parseIconSemanticKey("hero-class:soldier"), {
    category: "hero-class",
    slug: "soldier",
  });
  // Only categories that actually have a consumer are accepted: this is what
  // stops `trap:ceiling` from being quietly accepted and never resolving.
  assert.equal(ICON_CATEGORIES.includes("weapon"), false);
  assert.equal(ICON_CATEGORIES.includes("trap"), false);

  for (const bad of [
    "soldier",
    "Trap:ceiling",
    "hero-class:Soldier",
    "hero-class:-no-lead",
    "hero-class:has space",
    ":soldier",
    "hero-class:",
    "weapon:gun",
    "trap:ceiling",
  ]) {
    assert.equal(parseIconSemanticKey(bad), null, `must reject: ${bad}`);
  }

  // One class, one key — the same value feeds the card and the class filter.
  assert.equal(heroClassIconKey("soldier"), "hero-class:soldier");
});

test("the entry validator rejects prefix/category mismatches", async () => {
  const { validateIconEntry } = await import("../src/lib/icon-registry.ts");

  assert.equal(
    validateIconEntry({
      semanticKey: "hero-class:soldier",
      displayName: "Soldier",
      category: "ability",
      mediaAssetId: null,
    }).ok,
    false,
    "a key named hero-class must not be filed under ability",
  );

  const ok = validateIconEntry({
    semanticKey: "standard-perk:hang-time",
    displayName: "Hang Time",
    category: "standard-perk",
    mediaAssetId: "media_123",
  });
  assert.equal(ok.ok, true);
  if (ok.ok) {
    assert.equal(ok.value.mediaAssetId, "media_123");
    assert.equal(ok.value.displayName, "Hang Time");
  }
  assert.equal(validateIconEntry({ semanticKey: "ability:foo", displayName: "   " }).ok, false);
  assert.equal(validateIconEntry({ semanticKey: "ability:foo", displayName: "Foo" }).ok, true);
});

test("the service round trip works against the real migration chain", async () => {
  const { db, raw } = await freshDb();
  seedAsset(raw);
  const srv = await import("../src/lib/cms/icon-registry.server.ts");

  // Registering an EXISTING asset — no upload path exists in this service.
  const created = await srv.createIconRegistryEntry(db, {
    semanticKey: "hero-class:soldier",
    displayName: "Soldier",
    category: "hero-class",
    mediaAssetId: "m1",
  });
  assert.equal(created.semanticKey, "hero-class:soldier");
  assert.equal(created.usageCount, 0);
  assert.equal(created.iconUrl, "https://media.example/icons/soldier.png");

  // A duplicate key is refused rather than silently creating a second identity.
  await assert.rejects(
    () =>
      srv.createIconRegistryEntry(db, {
        semanticKey: "hero-class:soldier",
        displayName: "Dupe",
        mediaAssetId: "m1",
      }),
    /already registered/i,
  );

  // Search matches display name and semantic key, case-insensitively.
  await srv.createIconRegistryEntry(db, {
    semanticKey: "ability:ninja-slash",
    displayName: "Ninjitsu Slash",
    category: "ability",
  });
  await srv.createIconRegistryEntry(db, {
    semanticKey: "standard-perk:hang-time",
    displayName: "Hang Time",
    category: "standard-perk",
  });
  const byName = await srv.listIconRegistryEntries(db, { search: "ninjitsu" });
  assert.deepEqual(
    byName.entries.map((e) => e.semanticKey),
    ["ability:ninja-slash"],
  );
  const byKey = await srv.listIconRegistryEntries(db, { search: "HERO-CLASS:sol" });
  assert.deepEqual(
    byKey.entries.map((e) => e.semanticKey),
    ["hero-class:soldier"],
  );
  const byCategory = await srv.listIconRegistryEntries(db, { category: "ability" });
  assert.deepEqual(
    byCategory.entries.map((e) => e.semanticKey),
    ["ability:ninja-slash"],
  );
  const none = await srv.listIconRegistryEntries(db, { search: "nothing-here" });
  assert.equal(none.total, 0);

  // Alphabetical WITHIN a section. The list is grouped by category first (the
  // SQL orders by category, then name), and each group is alphabetical with the
  // semantic key as the tie-breaker — so what a reader sees per section is a
  // stable A-Z list regardless of how many categories are registered.
  const all = await srv.listIconRegistryEntries(db, {});
  assert.deepEqual(
    all.entries.map((e) => `${e.category}/${e.displayName}`),
    ["ability/Ninjitsu Slash", "hero-class/Soldier", "standard-perk/Hang Time"],
  );
  // Same-name entries are settled by key, never by row order: seed a display-name
  // collision across two categories and confirm each section's order is stable.
  await srv.createIconRegistryEntry(db, {
    semanticKey: "hero-class:guardian",
    displayName: "Ninjitsu Slash",
  });
  const collided = await srv.listIconRegistryEntries(db, {});
  assert.deepEqual(
    collided.entries.map((e) => e.semanticKey),
    ["ability:ninja-slash", "hero-class:guardian", "hero-class:soldier", "standard-perk:hang-time"],
  );

  // The semantic key is IMMUTABLE — renaming it would repoint every consumer.
  await srv.updateIconRegistryEntry(db, { id: created.id, displayName: "Soldier (icon)" });
  const renamed = await srv.getIconRegistryEntry(db, created.id);
  assert.equal(renamed.semanticKey, "hero-class:soldier");
  assert.equal(renamed.displayName, "Soldier (icon)");

  // Unbinding an asset is allowed; binding a MISSING asset is not.
  const unbound = await srv.updateIconRegistryEntry(db, { id: created.id, mediaAssetId: null });
  assert.equal(unbound.mediaAssetId, null);
  await assert.rejects(
    () => srv.updateIconRegistryEntry(db, { id: created.id, mediaAssetId: "no-such-asset" }),
    /not found/i,
  );

  // Batched public resolution: exact keys only, ready media only.
  await srv.updateIconRegistryEntry(db, { id: created.id, mediaAssetId: "m1" });
  const resolved = await srv.resolveIconUrls(db, [
    "hero-class:soldier",
    "hero-class:ninja",
    "ability:ninja-slash",
    "not-a-key",
    "ability:ninja-slash",
  ]);
  assert.equal(resolved.get("hero-class:soldier"), "https://media.example/icons/soldier.png");
  assert.equal(resolved.has("hero-class:ninja"), false, "unregistered keys resolve to nothing");
  assert.equal(resolved.has("ability:ninja-slash"), false, "unbound entries resolve to nothing");
  assert.equal(resolved.size, 1, "one real answer for the whole batch");
});

test("an unusable asset resolves to nothing rather than a broken image", async () => {
  const { db, raw } = await freshDb();
  seedAsset(raw);
  const srv = await import("../src/lib/cms/icon-registry.server.ts");

  // Bind the asset while it is READY, then tombstone it out from under the
  // entry — the state that matters: a live row pointing at dead bytes.
  const created = await srv.createIconRegistryEntry(db, {
    semanticKey: "hero-class:soldier",
    displayName: "Soldier",
    mediaAssetId: "m1",
  });
  assert.equal(created.iconUrl, "https://media.example/icons/soldier.png");

  db.exec(`UPDATE media_assets SET status = 'deleted' WHERE id = 'm1'`);
  const after = await srv.getIconRegistryEntry(db, created.id);
  assert.equal(after.mediaAssetId, "m1", "the binding survives; only its usability changed");
  assert.equal(after.iconUrl, null, "a tombstoned asset must not produce a URL");
  assert.equal(after.usageCount, 0);

  // And the public resolver agrees rather than emitting a URL that 404s.
  assert.equal([...(await srv.resolveIconUrls(db, ["hero-class:soldier"]))].length, 0);

  // Binding a tombstoned asset in the first place is refused outright.
  await assert.rejects(
    () =>
      srv.createIconRegistryEntry(db, {
        semanticKey: "ability:x",
        displayName: "X",
        mediaAssetId: "m1",
      }),
    /not usable/i,
  );
});

test("the service rounds the shared association columns for usage reporting", async () => {
  const src = await repo("lib/cms/media-references.server.ts");
  // The batched form must reuse the SAME table the delete guard reads, so a
  // source can never be counted on one side and skipped on the other.
  assert.match(src, /const REFERENCE_ASSET_COLUMNS: Record<ColumnBackedSource/);
  assert.match(src, /REFERENCE_QUERIES\.filter\(/);
  for (const [source, table, column] of [
    ["catalog_item_icon", "resources", "icon_asset_id"],
    ["ability_definition_icon", "ability_defs", "icon_asset_id"],
    ["hero_ability_icon", "hero_abilities", "icon_asset_id"],
    ["hero_perk_definition_icon", "hero_perk_defs", "icon_asset_id"],
    ["schematic_icon", "schematic_records", "icon_asset_id"],
  ]) {
    assert.match(
      src,
      new RegExp(`${source}:\\s*\\{\\s*table:\\s*"${table}",\\s*column:\\s*"${column}"\\s*\\}`),
      `${source} must be counted from ${table}.${column}`,
    );
  }
  // A registry row is not an external consumer, and an inline article image has
  // no column to count.
  assert.match(src, /query\.source !== "article_inline_image"/);
  assert.match(src, /query\.source !== "icon_registry_entry"/);
});

test("removing an entry is a pointer delete and cannot touch the object", async () => {
  const src = await repo("lib/cms/icon-registry.server.ts");
  const fn = src.slice(src.indexOf("export async function deleteIconRegistryEntry"));
  // Exactly one DELETE, against the registry only. No bucket call, no R2, no
  // `media_assets` delete — the file is not this layer's to delete.
  assert.match(fn, /DELETE FROM icon_registry WHERE id = \?/);
  assert.doesNotMatch(fn, /deleteObject|bucket|DELETE FROM media_assets/i);
});

test("the public resolver is an exact batched key lookup", async () => {
  const src = await repo("lib/cms/icon-registry.server.ts");
  assert.match(src, /WHERE r\.semantic_key IN \(\$\{placeholders\}\)/);
  // Perk and ability facets resolve through the registry in the SAME join that
  // already serves the cards, with the stored definition icon winning.
  const facets = await repo("lib/cms/hero-reference.server.ts");
  assert.match(facets, /COALESCE\(md\.delivery_url, mr\.delivery_url\) AS icon_url/);
  assert.match(facets, /LEFT JOIN icon_registry ir\s+ON ir\.semantic_key = 'standard-perk:'/);
  assert.match(facets, /LEFT JOIN icon_registry ir\s+ON ir\.semantic_key = 'ability:'/);
  // Every media join still gates on status='ready'.
  assert.match(facets, /AND md\.status = 'ready'/);
  assert.match(facets, /AND mr\.status = 'ready'/);
});

test("hero class icons are resolved once per page, not per hero", async () => {
  const src = await repo("lib/cms/public-hubs.loader.ts");
  assert.match(src, /classIcons: Record<string, string>/);
  assert.match(src, /const classIcons = Object\.create\(null\)/);
  // The call is a dynamic import, so it spans several lines.
  assert.match(src, /resolveIconUrls\(\s*db,\s*classKeys\.map\(\(entry\) => entry\.key\),\s*\)/);
  assert.match(src, /item\.class_icon_url = classIcons\[item\.hero_class\] \?\? null/);
  // The same map feeds the class filter, so card and filter cannot drift.
  const page = await repo("components/cms/HeroesPage.tsx");
  assert.match(page, /iconUrlFor: \(v: string\) => classIcons\[v\] \?\? null/);
  // The card renders the glyph only when one is registered — and it is the SAME
  // loader-resolved field, so no component hardcodes an asset URL.
  const card = await repo("components/cms/HeroCard.tsx");
  assert.match(card, /\{hero\.classIconUrl \? \(/);
  assert.doesNotMatch(card, /classIcon\s*=|CLASS_ICON|icons\/soldier/);
});

test("the icon registry is reachable from the media delete guard", async () => {
  const src = await repo("lib/cms/media-references.server.ts");
  assert.match(src, /"icon_registry_entry"/);
  assert.match(src, /FROM icon_registry WHERE media_asset_id = \?/);
  assert.match(src, /export async function assertMediaUnreferenced/);
  // And the UI-facing label names it.
  assert.match(src, /icon_registry_entry: "Icon registry entry"/);
});
