// Media inventory / reconciliation / lifecycle tests.
//
// WHY THIS FILE IS BEHAVIOURAL, NOT SOURCE-TEXT
// ----------------------------------------------
// The whole point of the inventory overhaul is that the CMS can compare what
// R2 actually stores against what D1 actually records. Every assertion below
// drives the real exported functions against a fake bucket and an in-memory
// D1 double, so a regression in classification, idempotency, reference-aware
// deletion or failure recovery fails HERE rather than in production.
//
// Covered: R2 listing (empty bucket, root objects, nested prefixes, duplicate
// basenames, cursor continuation, invalid cursor, empty folders, R2 errors),
// reconciliation (all six states, idempotency, preserved ids/alt text),
// registration (bounded, idempotent, never invents metadata), deletion
// (unreferenced, referenced, missing object, R2 failure, D1 failure after R2
// delete, retry after partial failure, invalid key, tombstone != physical
// deletion) and reference detection across every reference table.
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/cms-media-inventory.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const r2 = await import("../src/lib/cms/r2.server.ts");
const inventory = await import("../src/lib/cms/media-inventory.ts");
const inventoryServer = await import("../src/lib/cms/media-inventory.server.ts");
const references = await import("../src/lib/cms/media-references.server.ts");
const mediaServer = await import("../src/lib/cms/media.server.ts");

const BASE_URL = "https://media.hawkbucks.com";

/* ================================================================== */
/* Fake R2 bucket — real list()/head() semantics with cursors          */
/* ================================================================== */

/**
 * Object store double. `list()` implements the three behaviours the inventory
 * depends on and that are easy to get wrong:
 *   * prefix filtering (heroes/ never matches heroestest/)
 *   * delimiter roll-up (a folder is a prefix, not a stored object)
 *   * cursor continuation with a `truncated` flag
 */
function createFakeBucket(initial = []) {
  const objects = new Map();
  for (const object of initial) objects.set(object.key, { ...object });
  const calls = { list: [], head: [], put: [], delete: [] };
  const failures = { list: null, head: null, put: null, delete: null };

  function toR2Object(record) {
    return {
      key: record.key,
      size: record.size ?? 0,
      etag: record.etag ?? `etag-${record.key}`,
      uploaded: new Date(record.uploaded ?? "2026-10-09T15:26:18.000Z"),
      httpMetadata:
        record.contentType === undefined || record.contentType === null
          ? {}
          : { contentType: record.contentType },
    };
  }

  return {
    objects,
    calls,
    failures,
    fail(kind, error) {
      failures[kind] = error;
    },
    async list(options = {}) {
      calls.list.push(options);
      if (failures.list) throw failures.list;
      const prefix = options.prefix ?? "";
      const delimiter = options.delimiter;
      const limit = Math.max(1, Math.min(1000, options.limit ?? 200));
      const keys = [...objects.keys()].filter((key) => key.startsWith(prefix)).sort();

      let index = 0;
      if (typeof options.cursor === "string" && options.cursor !== "") {
        const parsed = Number.parseInt(options.cursor.replace("idx-", ""), 10);
        index = Number.isFinite(parsed) ? parsed : 0;
      }

      const page = [];
      const prefixes = [];
      let truncated = false;

      while (index < keys.length) {
        const key = keys[index];
        const rest = key.slice(prefix.length);
        const slash = rest.indexOf("/");
        if (delimiter !== undefined && slash > 0) {
          // Roll the whole subtree up into ONE prefix entry.
          const folder = `${prefix}${rest.slice(0, slash + 1)}`;
          while (index < keys.length && keys[index].startsWith(folder)) index += 1;
          if (!prefixes.includes(folder)) {
            if (page.length + prefixes.length >= limit) {
              truncated = true;
              break;
            }
            prefixes.push(folder);
          }
          continue;
        }
        if (page.length + prefixes.length >= limit) {
          truncated = true;
          break;
        }
        page.push(toR2Object(objects.get(key)));
        index += 1;
      }

      return {
        objects: page,
        delimitedPrefixes: prefixes,
        truncated,
        ...(truncated ? { cursor: `idx-${index}` } : {}),
      };
    },
    async head(key) {
      calls.head.push(key);
      if (failures.head) throw failures.head;
      const record = objects.get(key);
      return record ? toR2Object(record) : null;
    },
    async put(key, body, options) {
      calls.put.push(key);
      if (failures.put) throw failures.put;
      objects.set(key, {
        key,
        size: body.byteLength ?? body.length ?? 0,
        contentType: options?.httpMetadata?.contentType ?? null,
      });
    },
    async delete(key) {
      calls.delete.push(key);
      if (failures.delete) throw failures.delete;
      objects.delete(key);
    },
  };
}

/** Env carrying a bucket — the only binding the media stack reads. */
function envWith(bucket, overrides = {}) {
  return { MEDIA_BUCKET: bucket, R2_PUBLIC_BASE_URL: BASE_URL, ...overrides };
}

/* ================================================================== */
/* In-memory D1 double                                                  */
/* ================================================================== */

const MEDIA_COLUMNS = [
  "id",
  "provider",
  "provider_asset_id",
  "delivery_url",
  "original_filename",
  "mime_type",
  "byte_size",
  "width",
  "height",
  "alt_text",
  "title",
  "caption",
  "status",
  "created_by",
  "created_at",
  "updated_at",
];

/** Reference tables the finder consults, with the column it filters on. */
const REFERENCE_TABLES = {
  hero_records: "content_id",
  hero_abilities: "id",
  loadout_records: "content_id",
  weapon_records: "content_id",
  trap_records: "content_id",
  perk_records: "content_id",
  schematic_records: "content_id",
  article_media: "article_content_id",
  cms_content_translations: "id",
};

function createMemoryD1(seed = {}) {
  const tables = {
    media_assets: [],
    hero_records: [],
    hero_abilities: [],
    loadout_records: [],
    weapon_records: [],
    trap_records: [],
    perk_records: [],
    schematic_records: [],
    article_bodies: [],
    article_media: [],
    cms_content_translations: [],
    cms_audit_events: [],
    ...seed,
  };
  const stats = { selects: 0, writes: 0, statements: 0 };

  /** Positional INSERT VALUES mapper: `?` consumes a param, literals are data. */
  function insertValues(sql, params) {
    const clause = /VALUES\s*\(([^)]+)\)/.exec(sql);
    if (!clause) return [...params];
    const out = [];
    const remaining = [...params];
    for (const token of clause[1].split(",")) {
      const cell = token.trim();
      if (cell === "?") out.push(remaining.shift() ?? null);
      else if (/^NULL$/i.test(cell)) out.push(null);
      else if (/^'.*'$/s.test(cell)) out.push(cell.slice(1, -1));
      else if (/^-?\d+$/.test(cell)) out.push(Number(cell));
      else out.push(remaining.shift() ?? null);
    }
    return out;
  }

  function insertRow(table, columns, params, sql) {
    const row = {};
    columns.forEach((column, i) => {
      row[column.trim()] = params[i] ?? null;
    });
    if (table === "media_assets") {
      const existing = tables.media_assets.find(
        (r) => r.provider === row.provider && r.provider_asset_id === row.provider_asset_id,
      );
      if (existing) {
        // ON CONFLICT ... DO NOTHING: the conflicting insert is a NO-OP and
        // the stored row is untouched. This is what makes a concurrent
        // registration harmless.
        if (/DO NOTHING/i.test(sql)) return;
        // Mirrors the real UNIQUE (provider, provider_asset_id) upsert: the
        // EXISTING row keeps its id and created_at.
        Object.assign(existing, row, { id: existing.id, created_at: existing.created_at });
        return;
      }
    }
    tables[table].push(row);
  }

  function runSelect(sql, params) {
    if (/SELECT \* FROM media_assets WHERE provider = \? AND provider_asset_id IN/.test(sql)) {
      const keys = new Set(params.slice(1));
      return tables.media_assets.filter(
        (r) => r.provider === params[0] && keys.has(r.provider_asset_id),
      );
    }
    // Prefix reader: substr(provider_asset_id, 1, ?) = ?  — length, then value.
    if (/substr\(provider_asset_id, 1, \?\) = \?/.test(sql)) {
      const [length, prefix] = params;
      return tables.media_assets.filter(
        (r) => r.provider === "r2" && r.provider_asset_id.slice(0, length) === prefix,
      );
    }
    if (/SELECT \* FROM media_assets WHERE provider = 'r2' ORDER BY/.test(sql)) {
      return tables.media_assets.filter((r) => r.provider === "r2");
    }
    if (/SELECT \* FROM media_assets WHERE provider = \? AND provider_asset_id = \?/.test(sql)) {
      return tables.media_assets.filter(
        (r) => r.provider === params[0] && r.provider_asset_id === params[1],
      );
    }
    if (/SELECT \* FROM media_assets WHERE id = \?/.test(sql)) {
      return tables.media_assets.filter((r) => r.id === params[0]);
    }
    if (/FROM cms_audit_events/.test(sql)) {
      return [...tables.cms_audit_events];
    }
    if (/SELECT article_content_id, body_json FROM article_bodies/.test(sql)) {
      return tables.article_bodies.map((r) => ({
        article_content_id: r.article_content_id,
        body_json: r.body_json,
      }));
    }
    // Generic single-column reference query: "SELECT ... FROM <table> WHERE <col> = ? LIMIT n"
    const reference =
      /SELECT\s+(?:(\w+)\s+AS\s+entity_id|article_content_id, body_json)\s+FROM\s+(\w+)\s+WHERE\s+(\w+)\s*=\s*\?/i.exec(
        sql,
      );
    if (reference) {
      const [, , table, column] = reference;
      const rows = tables[table] ?? [];
      return rows
        .filter((row) => row[column] === params[0])
        .map((row) => ({ entity_id: row[reference[1]] }));
    }
    throw new Error(`memory D1: unhandled SELECT: ${sql}`);
  }

  function runWrite(sql, params) {
    const insert = /INSERT INTO (\w+)\s*\(([^)]+)\)/.exec(sql);
    if (insert) {
      insertRow(insert[1], insert[2].split(","), insertValues(sql, params), sql);
      return;
    }
    const update = /UPDATE media_assets SET (.+) WHERE id = \?/.exec(sql);
    if (update) {
      const id = params[params.length - 1];
      const row = tables.media_assets.find((r) => r.id === id);
      if (!row) return;
      const remaining = [...params];
      for (const assignment of update[1].split(",")) {
        const [rawColumn, rawValue] = assignment.split("=").map((part) => part.trim());
        if (!rawValue) continue;
        if (rawValue === "?") row[rawColumn] = remaining.shift() ?? null;
        else if (/^NULL$/i.test(rawValue)) row[rawColumn] = null;
        else if (/^'.*'$/s.test(rawValue)) row[rawColumn] = rawValue.slice(1, -1);
        else row[rawColumn] = rawValue;
      }
      return;
    }
    throw new Error(`memory D1: unhandled write: ${sql}`);
  }

  function prepare(sql) {
    stats.statements += 1;
    const statement = {
      sql,
      params: [],
      bind(...values) {
        statement.params = values;
        return statement;
      },
      async first() {
        stats.selects += 1;
        return runSelect(sql, statement.params)[0] ?? null;
      },
      async all() {
        stats.selects += 1;
        return { results: runSelect(sql, statement.params) };
      },
      async run() {
        stats.writes += 1;
        runWrite(sql, statement.params);
        return {};
      },
    };
    return statement;
  }

  return {
    prepare,
    batch: async (list) => {
      for (const statement of list) await statement.run();
      return [];
    },
    tables,
    stats,
  };
}

/** Convenience: a registered media_assets row. */
function mediaRow(overrides = {}) {
  const key = overrides.provider_asset_id ?? "heroes/lynx.png";
  return {
    id: "media_1",
    provider: "r2",
    provider_asset_id: key,
    delivery_url: `${BASE_URL}/${key}`,
    original_filename: key.split("/").pop(),
    mime_type: "image/png",
    byte_size: 1234,
    width: null,
    height: null,
    alt_text: "Alt",
    title: null,
    caption: null,
    status: "ready",
    created_by: null,
    created_at: "2026-10-03T22:32:31.000Z",
    updated_at: "2026-10-03T22:32:31.000Z",
    ...overrides,
  };
}

/* ================================================================== */
/* 1. R2 inventory listing                                              */
/* ================================================================== */

test("inventory: an empty bucket yields an empty page, not an error", async () => {
  const bucket = createFakeBucket();
  const page = await r2.listR2InventoryPage(bucket, { limit: 50 });
  assert.deepEqual(page.objects, []);
  assert.deepEqual(page.delimitedPrefixes, []);
  assert.equal(page.truncated, false);
  assert.equal(page.cursor, null);
});

test("inventory: root-level objects are listed with size, etag, upload time and type", async () => {
  const bucket = createFakeBucket([
    { key: "readme.txt", size: 42, contentType: "text/plain", uploaded: "2026-10-01T00:00:00Z" },
  ]);
  const page = await r2.listR2InventoryPage(bucket, { limit: 50 });
  assert.equal(page.objects.length, 1);
  const [object] = page.objects;
  assert.equal(object.key, "readme.txt");
  assert.equal(object.size, 42);
  assert.equal(object.etag, "etag-readme.txt");
  assert.equal(object.uploaded, "2026-10-01T00:00:00.000Z");
  assert.equal(object.contentType, "text/plain");
  // Dates must be plain JSON strings so the value survives the loader boundary.
  assert.equal(typeof object.uploaded, "string");
});

test("inventory: nested prefixes roll up into folders while the files stay in place", async () => {
  const bucket = createFakeBucket([
    { key: "heroes/lynx.png", contentType: "image/png" },
    { key: "heroes/abilities/AMC.png", contentType: "image/png" },
    { key: "icons/logo.png", contentType: "image/png" },
  ]);
  const root = await r2.listR2InventoryPage(bucket, { limit: 50, delimiter: "/" });
  assert.deepEqual(root.delimitedPrefixes, ["heroes/", "icons/"]);
  assert.deepEqual(
    root.objects.map((o) => o.key),
    [],
    "root-level view shows folders, not files inside them",
  );

  const inside = await r2.listR2InventoryPage(bucket, {
    limit: 50,
    prefix: "heroes/",
    delimiter: "/",
  });
  assert.deepEqual(
    inside.objects.map((o) => o.key),
    ["heroes/lynx.png"],
    "the folder shows its own files",
  );
  assert.deepEqual(inside.delimitedPrefixes, ["heroes/abilities/"]);
});

test("inventory: prefixes are exact — heroes/ never matches heroestest/", async () => {
  const bucket = createFakeBucket([{ key: "heroes/lynx.png" }, { key: "heroestest/lynx.png" }]);
  const heroes = await r2.listR2InventoryPage(bucket, { prefix: "heroes/", limit: 50 });
  assert.deepEqual(
    heroes.objects.map((o) => o.key),
    ["heroes/lynx.png"],
    "prefix matching must stay segment-exact",
  );
});

test("inventory: identical basenames in different folders are both listed", async () => {
  const bucket = createFakeBucket([
    { key: "heroes/lynx.png", contentType: "image/png" },
    { key: "heroes/abilities/lynx.png", contentType: "image/png" },
    { key: "icons/lynx.png", contentType: "image/png" },
  ]);
  const all = await r2.listR2InventoryPage(bucket, { limit: 50 });
  assert.deepEqual(all.objects.map((o) => o.key).sort(), [
    "heroes/abilities/lynx.png",
    "heroes/lynx.png",
    "icons/lynx.png",
  ]);
});

test("inventory: more objects than one page continues through the cursor", async () => {
  const keys = Array.from({ length: 25 }, (_, i) => `items/item-${String(i).padStart(2, "0")}.png`);
  const bucket = createFakeBucket(keys.map((key) => ({ key })));

  const first = await r2.listR2InventoryPage(bucket, { limit: 10 });
  assert.equal(first.objects.length, 10);
  assert.equal(first.truncated, true);
  assert.ok(first.cursor, "a truncated page must hand back a continuation token");

  const seen = [...first.objects.map((o) => o.key)];
  let cursor = first.cursor;
  let guard = 0;
  while (cursor !== null && guard < 10) {
    const next = await r2.listR2InventoryPage(bucket, { limit: 10, cursor });
    seen.push(...next.objects.map((o) => o.key));
    cursor = next.cursor;
    guard += 1;
  }
  assert.deepEqual(seen, keys, "cursor continuation walks every object exactly once");
  assert.equal(cursor, null, "the final page is not truncated");
});

test("inventory: a malformed cursor is rejected before it reaches the bucket", async () => {
  const bucket = createFakeBucket([{ key: "a.png" }]);
  await assert.rejects(
    () => r2.listR2InventoryPage(bucket, { cursor: "bad cursor with spaces" }),
    /Invalid pagination cursor/,
  );
  await assert.rejects(
    () => r2.listR2InventoryPage(bucket, { cursor: "" }),
    /Invalid pagination cursor/,
  );
  assert.equal(r2.isValidR2Cursor("idx-10"), true);
  assert.equal(r2.isValidR2Cursor(""), false);
  assert.equal(r2.isValidR2Cursor("a\u0000b"), false);
  assert.equal(r2.isValidR2Cursor("x".repeat(2000)), false);
});

test("inventory: page size is clamped to the supported window", async () => {
  const bucket = createFakeBucket([{ key: "a.png" }]);
  assert.equal(r2.clampR2ListLimit(undefined), r2.R2_LIST_DEFAULT_LIMIT);
  assert.equal(r2.clampR2ListLimit(0), r2.R2_LIST_MIN_LIMIT);
  assert.equal(r2.clampR2ListLimit(10_000), r2.R2_LIST_MAX_LIMIT);
  await r2.listR2InventoryPage(bucket, { limit: 10_000 });
  assert.ok(bucket.calls.list.at(-1).limit <= r2.R2_LIST_MAX_LIMIT);
});

test("inventory: an empty prefix returns an empty page rather than the whole bucket", async () => {
  const bucket = createFakeBucket([{ key: "heroes/a.png" }, { key: "icons/b.png" }]);
  const page = await r2.listR2InventoryPage(bucket, { prefix: "weapons/", delimiter: "/" });
  assert.deepEqual(page.objects, []);
  assert.deepEqual(page.delimitedPrefixes, []);
  assert.equal(page.truncated, false);
});

test("inventory: an R2 listing failure propagates instead of pretending the bucket is empty", async () => {
  const bucket = createFakeBucket();
  bucket.fail("list", new Error("R2 unavailable"));
  await assert.rejects(() => r2.listR2InventoryPage(bucket, {}), /R2 unavailable/);
});

test("inventory: a runtime without list() fails closed with an explicit message", async () => {
  const bucket = {
    put: async () => {},
    delete: async () => {},
    head: async () => null,
  };
  await assert.rejects(() => r2.listR2InventoryPage(bucket, {}), /no list\(\) method/);
  // And the media service refuses to show a partial inventory.
  const db = createMemoryD1();
  await assert.rejects(
    () => inventoryServer.readMediaInventoryPage(db, envWith(bucket), { prefix: "" }),
    /MEDIA_BUCKET/,
  );
});

/* ================================================================== */
/* 2. Public URL construction                                           */
/* ================================================================== */

test("urls: folder structure survives and unsafe characters are escaped", () => {
  // Slashes stay structural: the folder prefix must never be encoded away.
  assert.equal(
    r2.r2DeliveryUrl(BASE_URL, "heroes/abilities/AMC.png"),
    "https://media.hawkbucks.com/heroes/abilities/AMC.png",
  );
  // Spaces and other URL-hostile characters are percent-encoded.
  assert.equal(
    r2.r2DeliveryUrl(BASE_URL, "heroes/abilities/Goin' Commando.png"),
    "https://media.hawkbucks.com/heroes/abilities/Goin'%20Commando.png",
  );
  assert.equal(
    r2.r2DeliveryUrl(BASE_URL, "icons/Mats and Elements/Obsidian #2.png"),
    "https://media.hawkbucks.com/icons/Mats%20and%20Elements/Obsidian%20%232.png",
  );
  // Unicode filenames stay resolvable.
  assert.equal(
    r2.r2DeliveryUrl(BASE_URL, "heroes/Ünterwegs.png"),
    "https://media.hawkbucks.com/heroes/%C3%9Cnterwegs.png",
  );
  // An existing escape is never double-encoded into %2520.
  assert.equal(
    r2.r2DeliveryUrl(BASE_URL, "heroes/Raven%20One.png"),
    "https://media.hawkbucks.com/heroes/Raven%20One.png",
  );
  // A legacy absolute URL still passes straight through.
  assert.equal(
    r2.r2DeliveryUrl(BASE_URL, "https://ik.imagekit.io/demo/art.png"),
    "https://ik.imagekit.io/demo/art.png",
  );
});

/* ================================================================== */
/* 3. Classification — all six derived states                          */
/* ================================================================== */

const OBJECT = {
  key: "heroes/lynx.png",
  size: 10,
  etag: "e",
  uploaded: null,
  contentType: "image/png",
};
const ROW = {
  id: "media_1",
  status: "ready",
  alt_text: "Alt",
  byte_size: 10,
  mime_type: "image/png",
  original_filename: "lynx.png",
};

test("classification: object without a CMS row is discovered/unregistered", () => {
  assert.equal(
    inventory.classifyMediaEntry({ key: OBJECT.key, object: OBJECT, row: null }),
    "discovered_unregistered",
  );
});

test("classification: object plus a complete live row is registered/present", () => {
  assert.equal(
    inventory.classifyMediaEntry({ key: OBJECT.key, object: OBJECT, row: ROW }),
    "registered_present",
  );
});

test("classification: a live row whose object is gone is registered/missing", () => {
  assert.equal(
    inventory.classifyMediaEntry({ key: OBJECT.key, object: null, row: ROW }),
    "registered_missing",
  );
});

test("classification: a tombstoned row with the object still stored is NOT a deletion", () => {
  const state = inventory.classifyMediaEntry({
    key: OBJECT.key,
    object: OBJECT,
    row: { ...ROW, status: "deleted" },
  });
  assert.equal(state, "cms_deleted_object_present");
  assert.equal(inventory.registrationStateFor(state), "tombstoned");
});

test("classification: a tombstoned row with no object is fully cleaned up", () => {
  assert.equal(
    inventory.classifyMediaEntry({
      key: OBJECT.key,
      object: null,
      row: { ...ROW, status: "deleted" },
    }),
    "cms_deleted_object_missing",
  );
});

test("classification: missing CMS metadata is surfaced only when the object exists", () => {
  const noAlt = { ...ROW, alt_text: "   " };
  assert.equal(
    inventory.classifyMediaEntry({ key: OBJECT.key, object: OBJECT, row: noAlt }),
    "metadata_incomplete",
  );
  const noSize = { ...ROW, byte_size: null };
  assert.equal(
    inventory.classifyMediaEntry({ key: OBJECT.key, object: OBJECT, row: noSize }),
    "metadata_incomplete",
  );
  // A missing object is a different problem and must not be masked by it.
  assert.equal(
    inventory.classifyMediaEntry({ key: OBJECT.key, object: null, row: noAlt }),
    "registered_missing",
  );
});

/* ================================================================== */
/* 4. Prefix / folder helpers                                           */
/* ================================================================== */

test("prefixes: normalisation, rejection and navigation are safe", () => {
  assert.equal(inventory.normalizeMediaPrefix(undefined), "");
  assert.equal(inventory.normalizeMediaPrefix(""), "");
  assert.equal(inventory.normalizeMediaPrefix("heroes"), "heroes/");
  assert.equal(inventory.normalizeMediaPrefix("heroes/abilities/"), "heroes/abilities/");
  for (const bad of [
    "/heroes",
    "heroes/../",
    "heroes/./x",
    "a\\b",
    "https://evil/x",
    "heroes\u0000x",
  ]) {
    assert.throws(
      () => inventory.normalizeMediaPrefix(bad),
      /Invalid folder prefix/,
      `must reject ${bad}`,
    );
  }
  assert.equal(inventory.parentMediaPrefix("heroes/abilities/"), "heroes/");
  assert.equal(inventory.parentMediaPrefix("heroes/"), "");
  assert.deepEqual(inventory.mediaBreadcrumbs("heroes/abilities/"), ["heroes", "abilities"]);
  assert.deepEqual(inventory.mediaBreadcrumbs(""), []);
  assert.deepEqual(
    inventory.childFoldersInPrefix(
      ["heroes/a.png", "heroes/abilities/b.png", "icons/c.png"],
      "heroes/",
    ),
    ["heroes/abilities/"],
  );
  assert.equal(inventory.objectIsDirectChild("heroes/a.png", "heroes/"), true);
  assert.equal(inventory.objectIsDirectChild("heroes/abilities/b.png", "heroes/"), false);
  assert.equal(inventory.mediaKeyFilename("heroes/abilities/AMC.png"), "AMC.png");
  assert.equal(inventory.mediaKeyParentPath("heroes/abilities/AMC.png"), "heroes/abilities");
  assert.equal(inventory.mediaKeyParentPath("readme.txt"), "");
});

/* ================================================================== */
/* 5. Reconciliation planning                                           */
/* ================================================================== */

test("reconciliation: one pass classifies every key and is idempotent", () => {
  const objects = [
    { key: "heroes/lynx.png", size: 1, etag: "a", uploaded: null, contentType: "image/png" },
    // NOTE: "heroes/gone.png" is deliberately ABSENT from the bucket — that is
    // what makes its CMS row a broken reference.
    { key: "heroes/ghost.png", size: 1, etag: "c", uploaded: null, contentType: "image/png" },
    { key: "heroes/no-alt.png", size: 1, etag: "d", uploaded: null, contentType: "image/png" },
    { key: "heroes/untouched.png", size: 1, etag: "e", uploaded: null, contentType: "image/png" },
  ];
  const rows = [
    {
      key: "heroes/lynx.png",
      id: "media_1",
      status: "ready",
      alt_text: "Lynx",
      byte_size: 1,
      mime_type: "image/png",
      original_filename: "lynx.png",
    },
    // Live row, object absent.
    {
      key: "heroes/gone.png",
      id: "media_2",
      status: "ready",
      alt_text: "Gone",
      byte_size: 1,
      mime_type: "image/png",
      original_filename: "gone.png",
    },
    // Tombstoned row whose object is still in the bucket.
    {
      key: "heroes/ghost.png",
      id: "media_3",
      status: "deleted",
      alt_text: "",
      byte_size: 1,
      mime_type: "image/png",
      original_filename: "ghost.png",
    },
    // Registered, object present, no alt text.
    {
      key: "heroes/no-alt.png",
      id: "media_4",
      status: "ready",
      alt_text: "",
      byte_size: 1,
      mime_type: "image/png",
      original_filename: "no-alt.png",
    },
  ];

  const first = inventory.planReconciliation({ objects, rows, scope: "heroes/" });
  assert.equal(first.counts.registered_present, 1);
  assert.equal(first.counts.metadata_incomplete, 1);
  assert.equal(first.counts.registered_missing, 1);
  assert.equal(first.counts.discovered_unregistered, 1);
  assert.equal(first.counts.cms_deleted_object_present, 1);
  assert.deepEqual(first.unregisteredKeys, ["heroes/untouched.png"]);
  assert.deepEqual(first.missingObjectKeys, ["heroes/gone.png"]);
  assert.deepEqual(
    first.tombstoneKeyWithObject,
    ["heroes/ghost.png"],
    "a tombstoned row whose bytes remain must be reported, never hidden",
  );

  const second = inventory.planReconciliation({ objects, rows, scope: "heroes/" });
  assert.deepEqual(second, first, "re-running a reconciliation must produce an identical report");
});

/* ================================================================== */
/* 6. Registration planning                                             */
/* ================================================================== */

test("registration: only verified stored objects are registered, existing rows are never touched", () => {
  const objects = [
    { key: "heroes/new.png", size: 500, etag: null, uploaded: null, contentType: "image/png" },
    { key: "heroes/existing.png", size: 500, etag: null, uploaded: null, contentType: "image/png" },
    { key: "heroes/gone.png", size: 500, etag: null, uploaded: null, contentType: null },
  ];
  const rows = [
    {
      key: "heroes/existing.png",
      id: "media_9",
      status: "ready",
      alt_text: "Keep me",
      byte_size: 1,
      mime_type: "image/png",
      original_filename: "existing.png",
    },
    {
      key: "heroes/gone.png",
      id: "media_10",
      status: "deleted",
      alt_text: "",
      byte_size: 1,
      mime_type: "image/png",
      original_filename: "gone.png",
    },
  ];

  const plan = inventory.planRegistration({
    keys: ["heroes/new.png", "heroes/existing.png", "heroes/gone.png", "heroes/never-stored.png"],
    objects,
    rows,
    publicBaseUrl: BASE_URL,
  });

  const byKey = new Map(plan.items.map((item) => [item.key, item]));
  assert.equal(byKey.get("heroes/new.png").action, "register");
  assert.equal(byKey.get("heroes/new.png").insert.deliveryUrl, `${BASE_URL}/heroes/new.png`);
  assert.equal(byKey.get("heroes/new.png").insert.originalFilename, "new.png");
  assert.equal(byKey.get("heroes/new.png").insert.byteSize, 500);
  assert.equal(byKey.get("heroes/existing.png").reason, "already_registered");
  assert.equal(byKey.get("heroes/gone.png").reason, "already_tombstoned");
  assert.equal(byKey.get("heroes/never-stored.png").reason, "no_stored_object");
  assert.equal(plan.registerable, 1);
  assert.equal(plan.skipped, 3);
});

test("registration: a key with no content type falls back without inventing a MIME", () => {
  const insert = inventory.buildRegistrationValues(
    { key: "misc/data.bin", size: 7, etag: null, uploaded: null, contentType: null },
    BASE_URL,
  );
  assert.equal(insert.mimeType, "application/octet-stream");
  assert.equal(insert.provider, "r2");
  assert.equal(insert.providerAssetId, "misc/data.bin");
});

test("registration: batches are bounded and report what remains", () => {
  const keys = Array.from({ length: 60 }, (_, i) => `a/${i}.png`);
  const first = inventory.boundRegistrationBatch(keys, 0, 50);
  assert.equal(first.batch.length, 50);
  assert.equal(first.remaining, 10);
  assert.equal(first.hasMore, true);
  const second = inventory.boundRegistrationBatch(keys, 50, 50);
  assert.equal(second.batch.length, 10);
  assert.equal(second.hasMore, false);
});

/* ================================================================== */
/* Subrequest budget                                                    */
/* ================================================================== */

test("registration: the batch cap stays inside the runtime subrequest budget", () => {
  // Registration costs 3 subrequests per key (R2 head + D1 insert + D1
  // read-back) plus 4 fixed calls (session resolve, batched IN lookup, audit
  // insert, idle refresh). Cloudflare counts R2/KV/D1 binding calls as
  // subrequests; the documented Free ceiling is 1,000 to Cloudflare services
  // with a headline 50 per invocation, so the cap must satisfy the STRICTER
  // reading: 3N + 4 <= 50.
  const cap = inventory.MAX_REGISTER_KEYS;
  assert.equal(typeof cap, "number");
  assert.ok(cap >= 1 && cap <= 15, `cap ${cap} must keep 3N+4 within 50`);
  const worstCase = 3 * cap + 4;
  assert.ok(
    worstCase <= 50,
    `worst case ${worstCase} subrequests at cap ${cap} must stay within the strictest limit`,
  );
  assert.ok(worstCase <= 1000, "and trivially within the internal-services allowance");
});

test("registration: a request over the cap is bounded, never partially applied", async () => {
  // More keys than the cap: the extra keys are NOT attempted, and nothing is
  // half-written — the batch is simply the first `cap` objects.
  const keys = Array.from({ length: inventory.MAX_REGISTER_KEYS + 5 }, (_, i) => `o/${i}.png`);
  const bucket = createFakeBucket(keys.map((key) => ({ key })));
  const db = createMemoryD1();

  const outcome = await inventoryServer.registerMediaObjects(db, envWith(bucket), { keys });

  assert.equal(outcome.registered.length, inventory.MAX_REGISTER_KEYS);
  assert.equal(outcome.failed.length, 0);
  assert.equal(db.tables.media_assets.length, inventory.MAX_REGISTER_KEYS);
  // Only the batch was verified against the bucket and written.
  assert.equal(bucket.calls.head.length, inventory.MAX_REGISTER_KEYS);
  assert.deepEqual(outcome.registered, keys.slice(0, inventory.MAX_REGISTER_KEYS));
});

test("registration: one failing key does not abort the rest of the batch", async () => {
  const keys = ["a.png", "b.png", "c.png"];
  const bucket = createFakeBucket(keys.map((key) => ({ key })));
  const db = createMemoryD1();
  const originalPrepare = db.prepare;
  db.prepare = (sql) => {
    // Fail ONLY the middle key's insert.
    if (/INSERT INTO media_assets/.test(sql) && /DO NOTHING/i.test(sql) && sql.includes("VALUES")) {
      const st = originalPrepare(sql);
      const inner = st.run.bind(st);
      st.run = async () => {
        if (st.params.includes("b.png")) throw new Error("D1 write failed for b.png");
        return inner();
      };
      return st;
    }
    return originalPrepare(sql);
  };

  const outcome = await inventoryServer.registerMediaObjects(db, envWith(bucket), { keys });
  assert.deepEqual(outcome.registered.sort(), ["a.png", "c.png"]);
  assert.deepEqual(
    outcome.failed.map((f) => f.key),
    ["b.png"],
  );
  assert.match(outcome.failed[0].error, /D1 write failed/);
  // The failed key is retryable: a second call creates it, the others skip.
  db.prepare = originalPrepare;
  const retry = await inventoryServer.registerMediaObjects(db, envWith(bucket), { keys });
  assert.deepEqual(retry.registered, ["b.png"]);
  assert.deepEqual(retry.skipped.map((s) => s.key).sort(), ["a.png", "c.png"]);
  assert.equal(db.tables.media_assets.length, 3);
});

/* ================================================================== */
/* 7. Reference detection                                               */
/* ================================================================== */

async function referencesFor(tables, assetId) {
  const db = createMemoryD1(tables);
  return references.findMediaReferences(db, assetId);
}

test("references: every reference table in the schema is consulted", async () => {
  const assetId = "media_target";
  const found = await referencesFor(
    {
      hero_records: [{ content_id: "hero_1", portrait_asset_id: assetId, banner_asset_id: null }],
      hero_abilities: [{ id: "ability_1", icon_asset_id: assetId }],
      loadout_records: [{ content_id: "loadout_1", cover_asset_id: assetId }],
      weapon_records: [{ content_id: "weapon_1", icon_asset_id: assetId }],
      trap_records: [{ content_id: "trap_1", icon_asset_id: assetId }],
      perk_records: [{ content_id: "perk_1", icon_asset_id: assetId }],
      schematic_records: [{ content_id: "schematic_1", icon_asset_id: assetId }],
      article_bodies: [
        { article_content_id: "article_1", cover_asset_id: assetId, body_json: "{}" },
      ],
      article_media: [{ article_content_id: "article_2", asset_id: assetId }],
      cms_content_translations: [{ id: "translation_1", og_image_asset_id: assetId }],
    },
    assetId,
  );
  const sources = new Set(found.map((reference) => reference.source));
  for (const expected of [
    "hero_portrait",
    "hero_ability_icon",
    "loadout_cover",
    "weapon_icon",
    "trap_icon",
    "perk_icon",
    "schematic_icon",
    "article_cover",
    "article_attachment",
    "og_image",
  ]) {
    assert.ok(sources.has(expected), `reference finder must cover ${expected}`);
  }
});

test("references: an inline article image counts as a reference", async () => {
  const found = await referencesFor(
    {
      article_bodies: [
        {
          article_content_id: "article_inline",
          cover_asset_id: null,
          body_json: JSON.stringify({
            version: 1,
            blocks: [{ type: "image", assetId: "media_target" }],
          }),
        },
      ],
    },
    "media_target",
  );
  assert.deepEqual(found, [{ source: "article_inline_image", entityId: "article_inline" }]);
});

test("references: an unrelated asset is reported as unreferenced", async () => {
  const found = await referencesFor(
    { hero_records: [{ content_id: "hero_1", portrait_asset_id: "media_other" }] },
    "media_target",
  );
  assert.deepEqual(found, []);
});

/* ================================================================== */
/* 8. Inventory service layer                                           */
/* ================================================================== */

test("inventory service: a page merges every object with its registration state in ONE query", async () => {
  const bucket = createFakeBucket([
    { key: "heroes/lynx.png", size: 10, contentType: "image/png" },
    { key: "heroes/gone.png", size: 20, contentType: "image/png" },
    { key: "heroes/abilities/AMC.png", size: 30, contentType: "image/png" },
  ]);
  const db = createMemoryD1({
    media_assets: [mediaRow({ provider_asset_id: "heroes/lynx.png" })],
  });

  const page = await inventoryServer.readMediaInventoryPage(db, envWith(bucket), {
    prefix: "heroes/",
    limit: 50,
  });
  assert.deepEqual(page.prefix, "heroes/");
  assert.deepEqual(page.folders, ["heroes/abilities/"]);
  assert.deepEqual(
    page.entries.map((entry) => entry.key),
    ["heroes/gone.png", "heroes/lynx.png"],
    "an object with no CMS row is still listed",
  );
  const lynx = page.entries.find((entry) => entry.key === "heroes/lynx.png");
  assert.equal(lynx.state, "registered_present");
  assert.equal(lynx.row.id, "media_1");
  const gone = page.entries.find((entry) => entry.key === "heroes/gone.png");
  assert.equal(gone.state, "discovered_unregistered");
  assert.equal(gone.row, null);
  assert.ok(
    db.stats.selects <= 2,
    `one IN (...) statement per page plus the missing-row reader, never per object (got ${db.stats.selects})`,
  );
});

test("inventory service: a CMS row whose object is gone is shown as a broken reference", async () => {
  const bucket = createFakeBucket([{ key: "heroes/lynx.png" }]);
  const db = createMemoryD1({
    media_assets: [
      mediaRow({ provider_asset_id: "heroes/lynx.png", id: "media_ok" }),
      mediaRow({ provider_asset_id: "heroes/vanished.png", id: "media_gone" }),
    ],
  });

  const page = await inventoryServer.readMediaInventoryPage(db, envWith(bucket), {
    prefix: "heroes/",
    limit: 50,
  });
  const vanished = page.entries.find((entry) => entry.key === "heroes/vanished.png");
  assert.ok(vanished, "a live CMS row with no object must still be visible in its folder");
  assert.equal(vanished.state, "registered_missing");
  assert.equal(vanished.row.id, "media_gone");
});

test("inventory service: unregistered objects are listed, not hidden", async () => {
  const bucket = createFakeBucket([
    { key: "heroes/a.png", contentType: "image/png" },
    { key: "heroes/b.png", contentType: "image/png" },
  ]);
  const page = await inventoryServer.readMediaInventoryPage(createMemoryD1(), envWith(bucket), {
    prefix: "heroes/",
  });
  assert.equal(page.entries.length, 2);
  for (const entry of page.entries) {
    assert.equal(entry.state, "discovered_unregistered");
    assert.equal(entry.registration, "discovered");
    assert.equal(entry.row, null);
  }
});

test("inventory service: an invalid prefix fails closed instead of listing everything", async () => {
  const bucket = createFakeBucket([{ key: "heroes/a.png" }]);
  await assert.rejects(
    () =>
      inventoryServer.readMediaInventoryPage(createMemoryD1(), envWith(bucket), {
        prefix: "../secrets",
      }),
    /Invalid folder prefix/,
  );
});

test("inventory service: object detail reports a broken reference instead of a healthy asset", async () => {
  const bucket = createFakeBucket([
    { key: "heroes/lynx.png", size: 777, contentType: "image/png" },
  ]);
  const db = createMemoryD1({ media_assets: [mediaRow({ byte_size: 1234 })] });

  const healthy = await inventoryServer.readMediaObjectDetail(db, envWith(bucket), {
    key: "heroes/lynx.png",
  });
  assert.equal(healthy.brokenReference, false);
  assert.equal(healthy.entry.state, "registered_present");
  assert.equal(healthy.entry.deliveryUrl, `${BASE_URL}/heroes/lynx.png`);
  assert.equal(healthy.object.size, 777, "size comes from R2, which is authoritative");
  assert.equal(healthy.entry.etag, "etag-heroes/lynx.png");
  assert.equal(healthy.entry.uploaded, "2026-10-09T15:26:18.000Z");

  // The row survives, the object does not: the UI must be told.
  bucket.objects.delete("heroes/lynx.png");
  const broken = await inventoryServer.readMediaObjectDetail(db, envWith(bucket), {
    key: "heroes/lynx.png",
  });
  assert.equal(broken.object, null);
  assert.equal(broken.brokenReference, true);
  assert.equal(broken.entry.state, "registered_missing");

  // Neither side knows it: nothing to describe.
  assert.equal(
    await inventoryServer.readMediaObjectDetail(createMemoryD1(), envWith(bucket), {
      key: "heroes/lynx.png",
    }),
    null,
  );
});

test("inventory service: object detail includes the references that block deletion", async () => {
  const bucket = createFakeBucket([{ key: "heroes/lynx.png" }]);
  const db = createMemoryD1({
    media_assets: [mediaRow()],
    hero_records: [{ content_id: "hero_lynx", portrait_asset_id: "media_1" }],
  });
  const detail = await inventoryServer.readMediaObjectDetail(db, envWith(bucket), {
    key: "heroes/lynx.png",
  });
  assert.deepEqual(detail.references, [{ source: "hero_portrait", entityId: "hero_lynx" }]);
});

test("inventory service: search matches stored keys, including objects with no CMS row", async () => {
  const bucket = createFakeBucket([
    { key: "heroes/lynx.png" },
    { key: "heroes/lynx-2.png" },
    { key: "icons/lynx.png" },
    { key: "heroes/unrelated.png" },
  ]);
  const result = await inventoryServer.searchMediaInventory(createMemoryD1(), envWith(bucket), {
    prefix: "heroes/",
    query: "lynx",
  });
  assert.deepEqual(result.entries.map((entry) => entry.key).sort(), [
    "heroes/lynx-2.png",
    "heroes/lynx.png",
  ]);
  assert.equal(result.scanned, 3, "the scan counts what it actually looked at");
  assert.equal(result.truncated, false);
  // An empty query searches nothing rather than everything.
  const empty = await inventoryServer.searchMediaInventory(createMemoryD1(), envWith(bucket), {
    prefix: "",
    query: "   ",
  });
  assert.deepEqual(empty.entries, []);
  assert.equal(empty.scanned, 0);
});

test("inventory service: reconciliation walks nested keys and reports honestly", async () => {
  const bucket = createFakeBucket([
    { key: "heroes/lynx.png" },
    { key: "heroes/abilities/AMC.png" },
    { key: "heroes/abilities/BASE.png" },
  ]);
  const db = createMemoryD1({
    media_assets: [
      mediaRow({ provider_asset_id: "heroes/lynx.png" }),
      mediaRow({ id: "media_2", provider_asset_id: "heroes/missing.png" }),
    ],
  });

  const report = await inventoryServer.runMediaReconciliation(db, envWith(bucket), { prefix: "" });
  assert.equal(report.complete, true);
  assert.equal(report.objectsScanned, 3, "nested prefixes are walked flat");
  assert.equal(report.counts.registered_present, 1);
  assert.equal(report.counts.discovered_unregistered, 2);
  assert.deepEqual(report.missingObjectKeys, ["heroes/missing.png"]);
  assert.equal(report.nextCursor, null);
});

test("inventory service: a bounded reconciliation pass reports incompleteness honestly", async () => {
  // More objects than one 100-item page holds, so the pass really is truncated.
  const keys = Array.from({ length: 150 }, (_, i) => `items/${String(i).padStart(3, "0")}.png`);
  const bucket = createFakeBucket(keys.map((key) => ({ key })));
  const report = await inventoryServer.runMediaReconciliation(createMemoryD1(), envWith(bucket), {
    prefix: "",
    maxPages: 1,
  });
  assert.equal(report.complete, false, "a truncated pass must never claim full coverage");
  assert.ok(report.nextCursor, "and must hand back a continuation cursor");
  assert.equal(report.objectsScanned, 100);
  assert.equal(report.pages, 1);
  // A truncated pass must NOT report absent rows as broken: an object that
  // simply sorts on a later page looks identical to a missing one.
  assert.deepEqual(report.missingObjectKeys, []);
});

test("inventory service: registration creates rows, is idempotent, and never uploads", async () => {
  const bucket = createFakeBucket([
    { key: "heroes/lynx.png", size: 111, contentType: "image/png" },
    { key: "heroes/abilities/AMC.png", size: 222, contentType: "image/png" },
  ]);
  const db = createMemoryD1({
    // Pre-existing row with editor-authored alt text that MUST survive.
    media_assets: [
      mediaRow({
        provider_asset_id: "heroes/lynx.png",
        id: "media_keep",
        alt_text: "Editor alt text",
      }),
    ],
  });

  const outcome = await inventoryServer.registerMediaObjects(db, envWith(bucket), {
    keys: ["heroes/lynx.png", "heroes/abilities/AMC.png"],
  });
  assert.deepEqual(
    outcome.registered,
    ["heroes/abilities/AMC.png"],
    "already-registered keys are skipped",
  );
  assert.equal(outcome.failed.length, 0);

  const rows = db.tables.media_assets;
  assert.equal(rows.length, 2);
  const preserved = rows.find((row) => row.provider_asset_id === "heroes/lynx.png");
  assert.equal(preserved.id, "media_keep", "existing asset id preserved");
  assert.equal(preserved.alt_text, "Editor alt text", "existing alt text preserved");
  const created = rows.find((row) => row.provider_asset_id === "heroes/abilities/AMC.png");
  assert.equal(created.alt_text, "", "registration never invents alt text");
  assert.equal(created.byte_size, 222);
  assert.equal(created.status, "ready");

  // Re-running is a pure no-op: no duplicate row, no overwritten metadata.
  const again = await inventoryServer.registerMediaObjects(db, envWith(bucket), {
    keys: ["heroes/lynx.png", "heroes/abilities/AMC.png"],
  });
  assert.deepEqual(again.registered, []);
  assert.equal(db.tables.media_assets.length, 2);
  assert.equal(
    rows.find((row) => row.provider_asset_id === "heroes/lynx.png").alt_text,
    "Editor alt text",
  );
  // Registration is metadata-only: it never writes a byte to the bucket.
  assert.deepEqual(bucket.calls.put, []);
});

test("inventory service: registration refuses keys that are not stored objects", async () => {
  const bucket = createFakeBucket([]);
  const db = createMemoryD1();
  const outcome = await inventoryServer.registerMediaObjects(db, envWith(bucket), {
    keys: ["heroes/never-existed.png"],
  });
  assert.deepEqual(outcome.registered, []);
  assert.equal(outcome.plan.registerable, 0);
  assert.equal(db.tables.media_assets.length, 0);
});

test("inventory service: registration reports per-key failures instead of pretending success", async () => {
  const bucket = createFakeBucket([{ key: "a.png" }, { key: "b.png" }]);
  const db = createMemoryD1();
  const originalPrepare = db.prepare;
  db.prepare = (sql) => {
    if (/INSERT INTO media_assets/.test(sql)) throw new Error("D1 write failed");
    return originalPrepare(sql);
  };
  const outcome = await inventoryServer.registerMediaObjects(db, envWith(bucket), {
    keys: ["a.png", "b.png"],
  });
  assert.deepEqual(outcome.registered, []);
  assert.equal(outcome.failed.length, 2);
  assert.match(outcome.failed[0].error, /D1 write failed/);
});

test("registration: a row created mid-flight is never overwritten", async () => {
  // The planner's existence check and the INSERT are not atomic. Simulate the
  // race: the row appears AFTER planning but BEFORE the write. Registration
  // must leave the new row's metadata alone and report it as skipped — never
  // overwrite alt text with "" and never resurrect a tombstone.
  const key = "heroes/lynx.png";
  const bucket = createFakeBucket([{ key }]);
  const db = createMemoryD1();
  const originalPrepare = db.prepare;
  let injected = false;
  db.prepare = (sql) => {
    // Right before the registration INSERT, another editor registers it.
    if (/INSERT INTO media_assets/.test(sql) && /DO NOTHING/i.test(sql) && !injected) {
      injected = true;
      originalPrepare(
        "INSERT INTO media_assets (id, provider, provider_asset_id, delivery_url, original_filename, mime_type, alt_text, title, caption, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
        .bind(
          "media_rival",
          "r2",
          key,
          "https://media.hawkbucks.com/heroes/lynx.png",
          "lynx.png",
          "image/png",
          "Editor-authored alt",
          "Editor title",
          "Editor caption",
          "ready",
          "2026-10-01T00:00:00.000Z",
          "2026-10-01T00:00:00.000Z",
        )
        .run();
    }
    return originalPrepare(sql);
  };

  const outcome = await inventoryServer.registerMediaObjects(db, envWith(bucket), { keys: [key] });
  assert.deepEqual(outcome.registered, [], "a lost race must never report success");
  assert.deepEqual(outcome.created, []);
  assert.deepEqual(outcome.skipped, [{ key, reason: "already_registered" }]);
  assert.equal(db.tables.media_assets.length, 1, "no duplicate row");
  const row = db.tables.media_assets[0];
  assert.equal(row.id, "media_rival", "the pre-existing row id survives");
  assert.equal(row.alt_text, "Editor-authored alt", "alt text is untouched");
  assert.equal(row.title, "Editor title");
  assert.equal(row.caption, "Editor caption");
});

test("registration: a tombstone is never resurrected by a registration", async () => {
  const key = "heroes/ghost.png";
  const bucket = createFakeBucket([{ key }]);
  const db = createMemoryD1({
    media_assets: [mediaRow({ provider_asset_id: key, status: "deleted" })],
  });
  const outcome = await inventoryServer.registerMediaObjects(db, envWith(bucket), { keys: [key] });
  assert.deepEqual(outcome.registered, []);
  assert.equal(db.tables.media_assets[0].status, "deleted");
});

test("lifecycle: an audit failure after a completed delete still reports success", async () => {
  const bucket = createFakeBucket([{ key: "heroes/lynx.png" }]);
  const db = createMemoryD1({ media_assets: [mediaRow()] });
  const originalPrepare = db.prepare;
  db.prepare = (sql) => {
    if (/INSERT INTO cms_audit_events/.test(sql)) throw new Error("audit table unavailable");
    return originalPrepare(sql);
  };

  // The bytes ARE destroyed and the row IS tombstoned, so this must NOT be
  // reported as a failure — that would tell the editor the object survived.
  const result = await mediaServer.deleteMediaAsset(db, envWith(bucket), { id: "media_1" });
  assert.equal(result.objectDeleted, true);
  assert.equal(result.tombstoned, true);
  assert.equal(bucket.objects.has("heroes/lynx.png"), false);
  assert.equal(db.tables.media_assets[0].status, "deleted");
});

/* ================================================================== */
/* 9. Lifecycle: tombstone vs physical deletion                        */
/* ================================================================== */

test("lifecycle: removing an asset from the CMS never deletes the object", async () => {
  const bucket = createFakeBucket([{ key: "heroes/lynx.png" }]);
  const db = createMemoryD1({ media_assets: [mediaRow()] });

  await mediaServer.removeMediaFromCms(db, { id: "media_1", removedBy: "editor_1" });

  assert.equal(db.tables.media_assets[0].status, "deleted");
  assert.equal(bucket.objects.has("heroes/lynx.png"), true, "the object must survive");
  assert.deepEqual(bucket.calls.delete, [], "no bucket delete may be issued");
  const audit = db.tables.cms_audit_events.at(-1);
  assert.equal(audit.action, "media.remove_from_cms");
  assert.match(audit.metadata_json, /"objectDeleted":false/);
});

test("lifecycle: physical deletion removes the bytes and says so in the result", async () => {
  const bucket = createFakeBucket([{ key: "heroes/lynx.png" }]);
  const db = createMemoryD1({ media_assets: [mediaRow()] });

  const result = await mediaServer.deleteMediaAsset(db, envWith(bucket), {
    id: "media_1",
    deletedBy: "editor_1",
  });
  assert.equal(result.objectDeleted, true);
  assert.equal(result.tombstoned, true);
  assert.equal(result.key, "heroes/lynx.png");
  assert.equal(bucket.objects.has("heroes/lynx.png"), false, "the bytes must be gone");
  assert.equal(db.tables.media_assets[0].status, "deleted");
  const audit = db.tables.cms_audit_events.at(-1);
  assert.equal(audit.action, "media.delete");
  assert.match(audit.metadata_json, /"objectDeleted":true/);
});

test("lifecycle: a referenced asset cannot be physically deleted", async () => {
  const bucket = createFakeBucket([{ key: "heroes/lynx.png" }]);
  const db = createMemoryD1({
    media_assets: [mediaRow()],
    hero_records: [{ content_id: "hero_lynx", portrait_asset_id: "media_1" }],
  });

  await assert.rejects(
    () => mediaServer.deleteMediaAsset(db, envWith(bucket), { id: "media_1" }),
    /still referenced/,
  );
  assert.deepEqual(
    bucket.calls.delete,
    [],
    "the bucket must not be touched when a reference exists",
  );
  assert.equal(db.tables.media_assets[0].status, "ready", "the row must stay live");
});

test("lifecycle: a failing bucket delete leaves the CMS row alone and reports no deletion", async () => {
  const bucket = createFakeBucket([{ key: "heroes/lynx.png" }]);
  bucket.fail("delete", new Error("R2 delete failed"));
  const db = createMemoryD1({ media_assets: [mediaRow()] });

  await assert.rejects(
    () => mediaServer.deleteMediaAsset(db, envWith(bucket), { id: "media_1" }),
    /R2 delete failed/,
  );
  assert.equal(db.tables.media_assets[0].status, "ready", "no tombstone on a failed deletion");
});

test("lifecycle: when the R2 delete succeeds but D1 fails, the retry reconciles real state", async () => {
  const bucket = createFakeBucket([{ key: "heroes/lynx.png" }]);
  const db = createMemoryD1({ media_assets: [mediaRow()] });

  // First attempt: R2 delete succeeds, the tombstone write fails.
  const originalPrepare = db.prepare;
  let failTombstone = true;
  db.prepare = (sql) => {
    if (failTombstone && /UPDATE media_assets SET status = 'deleted'/.test(sql)) {
      return {
        sql,
        params: [],
        bind: function bind() {
          return this;
        },
        first: async () => null,
        all: async () => ({ results: [] }),
        run: async () => {
          throw new Error("D1 unavailable");
        },
      };
    }
    return originalPrepare(sql);
  };

  await assert.rejects(
    () => mediaServer.deleteMediaAsset(db, envWith(bucket), { id: "media_1" }),
    /D1 unavailable/,
  );
  assert.equal(bucket.objects.has("heroes/lynx.png"), false, "the bytes really are gone");

  // Retry: the object is already absent, which is the state to reconcile —
  // the retry must complete the tombstone instead of claiming it still exists.
  failTombstone = false;
  db.prepare = originalPrepare;
  const result = await mediaServer.deleteMediaAsset(db, envWith(bucket), { id: "media_1" });
  assert.equal(result.tombstoned, true);
  assert.equal(db.tables.media_assets[0].status, "deleted");
});

test("lifecycle: deleting an unregistered object checks for a row first", async () => {
  const bucket = createFakeBucket([{ key: "icons/dashboard.png" }, { key: "heroes/lynx.png" }]);
  const db = createMemoryD1();

  const result = await mediaServer.deleteMediaObjectByKey(db, envWith(bucket), {
    key: "icons/dashboard.png",
  });
  assert.equal(result.objectDeleted, true);
  assert.equal(result.tombstoned, false, "there was no CMS row to tombstone");
  assert.equal(bucket.objects.has("icons/dashboard.png"), false);
  assert.equal(bucket.objects.has("heroes/lynx.png"), true, "only the requested key is deleted");
});

test("lifecycle: a key that became registered is routed through the reference-checked path", async () => {
  const bucket = createFakeBucket([{ key: "heroes/lynx.png" }]);
  const db = createMemoryD1({
    media_assets: [mediaRow()],
    cms_content_translations: [{ id: "t1", og_image_asset_id: "media_1" }],
  });

  await assert.rejects(
    () => mediaServer.deleteMediaObjectByKey(db, envWith(bucket), { key: "heroes/lynx.png" }),
    /still referenced/,
  );
  assert.equal(bucket.objects.has("heroes/lynx.png"), true);
});

test("lifecycle: an invalid object key is refused", async () => {
  const bucket = createFakeBucket();
  const db = createMemoryD1();
  await assert.rejects(
    () =>
      mediaServer.deleteMediaObjectByKey(db, envWith(bucket), {
        key: "https://evil.example/x.png",
      }),
    /Invalid object key/,
  );
  await assert.rejects(
    () => mediaServer.deleteMediaObjectByKey(db, envWith(bucket), { key: "" }),
    /Invalid object key/,
  );
});

test("lifecycle: a tombstone can be restored while the object still exists", async () => {
  const bucket = createFakeBucket([{ key: "heroes/lynx.png" }]);
  const db = createMemoryD1({ media_assets: [mediaRow({ status: "deleted" })] });
  await mediaServer.restoreMediaFromCms(db, { id: "media_1" });
  assert.equal(db.tables.media_assets[0].status, "ready");
  assert.equal(bucket.objects.has("heroes/lynx.png"), true);
});

test("lifecycle: a deletion never invents a physical removal for a legacy provider row", async () => {
  const bucket = createFakeBucket();
  const db = createMemoryD1({
    media_assets: [
      mediaRow({
        provider: "imagekit",
        provider_asset_id: "file_abc",
        delivery_url: "https://ik.imagekit.io/demo/art.png",
      }),
    ],
  });
  const result = await mediaServer.deleteMediaAsset(db, envWith(bucket), { id: "media_1" });
  assert.equal(result.objectDeleted, false, "no bucket object was destroyed");
  assert.equal(result.tombstoned, true);
  assert.deepEqual(bucket.calls.delete, []);
});

test("lifecycle: alt text can be cleared, and editing never touches the object", async () => {
  const bucket = createFakeBucket([{ key: "heroes/lynx.png", contentType: "image/png" }]);
  const db = createMemoryD1({ media_assets: [mediaRow({ alt_text: "Lynx" })] });
  const { updateMediaAssetMetadata } = await import("../src/lib/cms/db.server.ts");

  await updateMediaAssetMetadata(db, { id: "media_1", altText: "" });
  assert.equal(db.tables.media_assets[0].alt_text, "", "clearing alt text must be allowed");
  assert.deepEqual(bucket.calls.put, [], "a metadata edit never rewrites the object");
  assert.deepEqual(bucket.calls.delete, []);
  assert.equal(bucket.objects.has("heroes/lynx.png"), true);
});

/* ================================================================== */
/* 10. Dashboard-uploaded keys (spaces, apostrophes, non-ASCII)        */
/* ================================================================== */

test("object keys: existing dashboard uploads are safe to act on, traversal is not", () => {
  // Keys the bucket already holds keep their ORIGINAL filenames.
  for (const key of [
    "heroes/abilities/Goin' Commando.png",
    "icons/Mats and Elements/Obsidian.png",
    "weapons/Base/Melee/Clubs/Masters Driver.png",
    "heroes/Ünterwegs.png",
    "heroes/abilities/Raven #1.png",
  ]) {
    assert.equal(r2.isSafeR2ObjectKey(key), true, `${key} must be actionable`);
  }
  // Safety is unchanged for the shapes that could escape the bucket.
  for (const key of [
    "",
    "/heroes/a.png",
    "heroes\\a.png",
    "https://evil.example/a.png",
    "../escape.png",
    "heroes/../../etc.png",
    "heroes//double.png",
    "heroes/./a.png",
    "heroes/a.png/",
    "heroes\u0000a.png",
    "a".repeat(2000),
  ]) {
    assert.equal(r2.isSafeR2ObjectKey(key), false, `${key} must be refused`);
  }
  // The strict validator stays strict: it still guards keys WE create.
  assert.equal(r2.isValidR2Key("heroes/Goin' Commando.png"), false);
  assert.equal(r2.isValidR2Key("heroes/kyle.webp"), true);
});

test("lifecycle: a discovered object with spaces in its key can be deleted", async () => {
  const key = "heroes/abilities/Goin' Commando.png";
  const bucket = createFakeBucket([{ key, size: 12, contentType: "image/png" }]);
  const db = createMemoryD1();

  // Register it, exactly as the Media Library does for a dashboard upload.
  const outcome = await inventoryServer.registerMediaObjects(db, envWith(bucket), { keys: [key] });
  assert.deepEqual(outcome.registered, [key]);
  const created = outcome.created[0];
  assert.equal(created.deliveryUrl, `${BASE_URL}/heroes/abilities/Goin'%20Commando.png`);
  assert.equal(created.filename, "Goin' Commando.png");

  // Physical deletion must NOT be blocked by the stricter upload-key rules.
  const result = await mediaServer.deleteMediaAsset(db, envWith(bucket), { id: created.id });
  assert.equal(result.objectDeleted, true);
  assert.equal(bucket.objects.has(key), false);
  assert.deepEqual(bucket.calls.delete, [key]);
});

test("lifecycle: an unregistered object with spaces can be deleted by key", async () => {
  const key = "items/Crafting Mats/Rough Ore.png";
  const bucket = createFakeBucket([{ key }]);
  const db = createMemoryD1();
  const result = await mediaServer.deleteMediaObjectByKey(db, envWith(bucket), { key });
  assert.equal(result.objectDeleted, true);
  assert.equal(bucket.objects.has(key), false);
});

test("registration: the stored URL encodes characters that would break the request", async () => {
  // A '#' in a filename truncates the URL into a fragment: the browser would
  // request the wrong object and the image would 404. Registration must store
  // the ENCODED URL, and it must be the same builder the provider uses.
  const bucket = createFakeBucket([{ key: "icons/Obsidian #2.png" }]);
  const db = createMemoryD1();
  const outcome = await inventoryServer.registerMediaObjects(db, envWith(bucket), {
    keys: ["icons/Obsidian #2.png"],
  });
  assert.equal(
    outcome.created[0].deliveryUrl,
    `${BASE_URL}/icons/Obsidian%20%232.png`,
    "the stored delivery URL must be fetchable",
  );
  assert.equal(
    r2.r2DeliveryUrl(BASE_URL, "icons/Obsidian #2.png"),
    outcome.created[0].deliveryUrl,
    "provider and registration must build byte-identical URLs",
  );
});

/* ================================================================== */
/* 11. Boundary contracts (source text, following repo convention)     */
/* ================================================================== */

test("boundary: the admin loader never touches the bucket binding and always authorizes", async () => {
  const source = await readFile(
    new URL("../src/lib/cms/media-admin.loader.ts", import.meta.url),
    "utf8",
  );
  assert.equal(
    source.includes("MEDIA_BUCKET"),
    false,
    "the browser boundary must not resolve the bucket",
  );
  assert.match(source, /hasCapability\(session\.user\.role, "cms\.read"\)/);
  assert.match(source, /requireCapability\(session, "cms\.write"\)/);
  assert.match(source, /assertSameOriginForMutation\(\)/, "mutations keep the CSRF origin guard");
  for (const fn of [
    "listR2MediaInventory",
    "searchR2MediaInventory",
    "getR2MediaObjectDetail",
    "getAdminMediaReferences",
    "reconcileR2MediaInventory",
    "registerR2MediaObjects",
    "updateAdminMediaMetadata",
    "removeAdminMediaFromCms",
    "restoreAdminMedia",
    "deleteAdminMedia",
    "deleteAdminMediaObject",
  ]) {
    assert.match(
      source,
      new RegExp(`export const ${fn} = createServerFn`),
      `${fn} must be a registered server function`,
    );
  }
});

test("boundary: server-only modules stay server-only and the planner stays pure", async () => {
  const root = new URL("../src/", import.meta.url);
  const read = (p) => readFile(new URL(p, root), "utf8");
  for (const file of [
    "lib/cms/media-inventory.server.ts",
    "lib/cms/media-references.server.ts",
    "lib/cms/media.server.ts",
  ]) {
    assert.match(
      await read(file),
      /@tanstack\/react-start\/server-only/,
      `${file} must be server-only`,
    );
  }
  const planner = await read("lib/cms/media-inventory.ts");
  assert.doesNotMatch(planner, /server-only/, "the planner stays pure so it can be unit tested");
  assert.doesNotMatch(planner, /MEDIA_BUCKET/);
  // The reference table list lives in exactly ONE place.
  const finder = await read("lib/cms/media-references.server.ts");
  const heroGuard = await read("lib/cms/heroes-loadouts.server.ts");
  assert.match(heroGuard, /media-references\.server/);
  assert.match(finder, /hero_records WHERE portrait_asset_id/);
});
