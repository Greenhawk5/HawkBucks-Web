// Admin lists — paging contract, honest totals, bulk lifecycle, safe deletion.
//
// WHAT THIS PINS (the W1/W2/W3 root causes)
// ----------------------------------------
//   * The paging contract: page 1 / 50 rows / no search by default; page size
//     clamped to 100; the requested page clamped to the real page count; the
//     range line ("from–to of total") derived from COUNT(*), not from the rows
//     just fetched.
//   * A dataset LARGER THAN 50 can be created, listed, searched, counted and
//     paged. 60 heroes are seeded, so every assertion exercises the range the
//     old code silently hid.
//   * Status tabs report facet counts (what each tab would yield), not the
//     composition of the current page.
//   * Bulk transitions go through the single-record rules: only legal targets
//     change; already-at-target is skipped; illegal is skipped with a reason;
//     missing is failed; duplicates collapse; the operation is bounded.
//   * Permanent deletion is gated (draft/archived + unreferenced + editorial),
//     removes the record and its owned rows, preserves shared definitions and
//     media, and keeps its audit trail.
//
// All database assertions run the REAL migration chain against in-memory
// SQLite through a small D1-shaped shim. Production is untouched.
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/cms-admin-lists.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";

const migrationsDir = new URL("../../worker/migrations/", import.meta.url);

const list = await import("../src/lib/cms/admin-list.ts");
const filters = await import("../src/lib/cms/admin-list-filters.ts");
const server = await import("../src/lib/cms/admin-list.server.ts");
const bulk = await import("../src/lib/cms/bulk-actions.server.ts");
const del = await import("../src/lib/cms/content-delete.server.ts");
const publish = await import("../src/lib/cms/publish.ts");

/* ================================================================== */
/* D1-shaped shim over node:sqlite                                     */
/* ================================================================== */

/** Minimal `D1Database` the service modules accept. */
function makeDb(sqlite) {
  return {
    prepare(query) {
      const stmt = sqlite.prepare(query);
      const self = {
        bind(...values) {
          return {
            first: async () => stmt.get(...values) ?? null,
            all: async () => ({ results: stmt.all(...values) }),
            run: async () => stmt.run(...values),
          };
        },
        first: async () => stmt.get() ?? null,
        all: async () => ({ results: stmt.all() }),
        run: async () => stmt.run(),
      };
      return self;
    },
    batch: async () => [],
  };
}

async function migratedDb() {
  const { DatabaseSync } = await import("node:sqlite");
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  const names = (await readdir(migrationsDir)).filter((n) => n.endsWith(".sql")).sort();
  for (const name of names) sqlite.exec(await readFile(new URL(name, migrationsDir), "utf8"));
  const db = makeDb(sqlite);
  return { sqlite, db, names };
}

const STAMP = "2026-10-01T00:00:00.000Z";

async function seedHero(db, { id, status = "draft", heroClass = "soldier", title = null }) {
  await db
    .prepare(
      "INSERT INTO cms_contents (id, entity_type, status, default_locale, created_at, updated_at) VALUES (?, 'hero', ?, 'en', ?, ?)",
    )
    .bind(id, status, STAMP, STAMP)
    .run();
  await db
    .prepare(
      "INSERT INTO hero_records (content_id, hero_class, popularity, sort_order, created_at, updated_at) VALUES (?, ?, 0, 0, ?, ?)",
    )
    .bind(id, heroClass, STAMP, STAMP)
    .run();
  if (title !== null) {
    await db
      .prepare(
        "INSERT INTO cms_content_translations (id, content_id, locale, title, body, slug, created_at, updated_at) VALUES (?, ?, 'en', ?, '', ?, ?, ?)",
      )
      .bind(`tr_${id}`, id, title, `slug-${id}`, STAMP, STAMP)
      .run();
  }
}

/* ================================================================== */
/* 1. The pure paging contract                                        */
/* ================================================================== */

test("paging defaults: page 1, 50 rows, no search, no status filter", () => {
  assert.deepEqual(list.parseAdminListSearch(undefined), {
    page: 1,
    pageSize: 50,
    q: "",
    status: "",
  });
  assert.deepEqual(list.parseAdminListSearch({}), { page: 1, pageSize: 50, q: "", status: "" });
});

test("paging: page and page size are clamped, never unbounded", () => {
  assert.equal(list.parseAdminListSearch({ pageSize: 100000 }).pageSize, 100);
  assert.equal(list.parseAdminListSearch({ pageSize: 0 }).pageSize, 1);
  assert.equal(list.parseAdminListSearch({ page: 0 }).page, 1);
  assert.equal(list.parseAdminListSearch({ page: 99999 }).page, 1000);
  assert.equal(list.parseAdminPageSize("50"), 50, "URL strings coerce");
  assert.equal(list.parseAdminPage("3"), 3);
});

test("filters: unknown statuses are dropped, search is trimmed and capped", () => {
  assert.equal(list.parseAdminStatusFilter("published"), "published");
  assert.equal(list.parseAdminStatusFilter("nonsense"), "");
  assert.equal(list.parseAdminStatusFilter(undefined), "");
  assert.equal(list.parseAdminSearchText("  hello  "), "hello");
  assert.equal(list.parseAdminSearchText("x".repeat(500)).length, list.ADMIN_MAX_SEARCH_LENGTH);
});

test("page meta: clamps to the last page, derives a truthful range", () => {
  // 126 records at 50/page is 3 pages; page 99 resolves to page 3.
  assert.deepEqual(list.adminPageMeta({ page: 99, pageSize: 50, total: 126 }), {
    page: 3,
    pageSize: 50,
    total: 126,
    pages: 3,
    from: 101,
    to: 126,
    hasPrev: true,
    hasNext: false,
  });
  // An empty filter result is page 1 with a zero range, not a negative offset.
  assert.deepEqual(list.adminPageMeta({ page: 1, pageSize: 50, total: 0 }), {
    page: 1,
    pageSize: 50,
    total: 0,
    pages: 1,
    from: 0,
    to: 0,
    hasPrev: false,
    hasNext: false,
  });
  assert.deepEqual(list.adminPageMeta({ page: 1, pageSize: 50, total: 50 }), {
    page: 1,
    pageSize: 50,
    total: 50,
    pages: 1,
    from: 1,
    to: 50,
    hasPrev: false,
    hasNext: false,
  });
});

test("status counts: missing buckets are zero, never undefined", () => {
  assert.deepEqual(list.adminStatusCountsFromRows([{ status: "draft", n: 3 }]), {
    all: 3,
    draft: 3,
    published: 0,
    archived: 0,
  });
  assert.deepEqual(list.adminStatusCountsFromRows([]), {
    all: 0,
    draft: 0,
    published: 0,
    archived: 0,
  });
});

test("LIKE terms are escaped, so % and ' cannot alter the query", () => {
  assert.equal(list.escapeLikeTerm("100%_x\\y"), "100\\%\\_x\\\\y");
  const { where, values } = list.buildAdminListWhere({
    equality: ["c.status = ?"],
    equalityValues: ["draft"],
    searchColumns: ["c.id"],
    search: "o'brien%_",
  });
  assert.match(where, /LIKE \? ESCAPE '\\'/);
  assert.deepEqual(values, ["draft", "%o'brien\\%\\_%"]);
});

test("correlated translation search uses an EXISTS, not a join", () => {
  const { where, values } = list.buildAdminListWhere({
    equality: ["c.entity_type = ?"],
    equalityValues: ["hero"],
    searchColumns: ["h.content_id"],
    searchCorrelated: { outerAlias: "h", columns: ["title", "slug"] },
    search: "ramirez",
  });
  assert.match(where, /FROM cms_content_translations t_h/);
  assert.match(where, /t_h\.content_id = h\.content_id/);
  // Three OR branches (id + title + slug) bind the same pattern three times.
  assert.deepEqual(values, ["hero", "%ramirez%", "%ramirez%", "…".slice(0, 0) + "%ramirez%"]);
});

/* ================================================================== */
/* 2. More than 50 records: create, list, search, count, paginate      */
/* ================================================================== */

test("126 heroes: pages are disjoint, deterministic, and honestly counted", async () => {
  const { db } = await migratedDb();
  for (let i = 0; i < 126; i += 1) {
    const id = `hero_${String(i).padStart(3, "0")}`;
    await seedHero(db, { id, title: `Hero ${i}` });
  }
  const page1 = await server.queryEntityAdminList(
    db,
    "hero",
    list.parseAdminListSearch({}),
    (r) => r,
  );
  const page3 = await server.queryEntityAdminList(
    db,
    "hero",
    list.parseAdminListSearch({ page: 3 }),
    (r) => r,
  );
  assert.equal(page1.total, 126, "total counts every row, not just the page");
  assert.equal(page1.items.length, 50);
  assert.equal(page3.items.length, 26);
  assert.deepEqual(page3.meta, {
    page: 3,
    pageSize: 50,
    total: 126,
    pages: 3,
    from: 101,
    to: 126,
    hasPrev: true,
    hasNext: false,
  });
  const ids1 = new Set(page1.items.map((r) => r.content_id));
  for (const row of page3.items) {
    assert.equal(ids1.has(row.content_id), false, "pages must not overlap");
  }
  // A second run returns the same first page: ordering is deterministic.
  const again = await server.queryEntityAdminList(
    db,
    "hero",
    list.parseAdminListSearch({}),
    (r) => r,
  );
  assert.deepEqual(
    again.items.map((r) => r.content_id),
    page1.items.map((r) => r.content_id),
  );
});

test("60 heroes: a stale page past the end clamps to the last page", async () => {
  const { db } = await migratedDb();
  for (let i = 0; i < 60; i += 1) await seedHero(db, { id: `h${i}` });
  const page = await server.queryEntityAdminList(
    db,
    "hero",
    list.parseAdminListSearch({ page: 9 }),
    (r) => r,
  );
  assert.equal(page.meta.page, 2);
  assert.equal(page.items.length, 10);
});

test("search runs in SQL: matches titles and ids across the whole set", async () => {
  const { db } = await migratedDb();
  for (let i = 0; i < 60; i += 1) {
    await seedHero(db, { id: `hero_${i}`, title: `Brigadier Ramirez ${i}` });
  }
  await seedHero(db, { id: "needle-99", title: "Dennis, the Menace" });
  const byTitle = await server.queryEntityAdminList(
    db,
    "hero",
    list.parseAdminListSearch({ q: "ramirez" }),
    (r) => r,
  );
  assert.equal(byTitle.total, 60);
  const byId = await server.queryEntityAdminList(
    db,
    "hero",
    list.parseAdminListSearch({ q: "needle-99" }),
    (r) => r,
  );
  assert.equal(byId.total, 1);
  assert.equal(byId.items[0].content_id, "needle-99");
  const none = await server.queryEntityAdminList(
    db,
    "hero",
    list.parseAdminListSearch({ q: "no such hero anywhere" }),
    (r) => r,
  );
  assert.equal(none.total, 0);
  assert.deepEqual(none.items, []);
});

test("status tabs: facets count the filter, not the current page", async () => {
  const { db } = await migratedDb();
  for (let i = 0; i < 55; i += 1) {
    await seedHero(db, { id: `d${i}`, status: i < 50 ? "draft" : "published" });
  }
  const drafts = await server.queryEntityAdminList(
    db,
    "hero",
    list.parseAdminListSearch({ status: "draft" }),
    (r) => r,
  );
  assert.equal(drafts.total, 50);
  // 5 published live on page 1 too, so the tabs must still total 55.
  assert.deepEqual(drafts.counts, { all: 55, draft: 50, published: 5, archived: 0 });
  assert.equal(drafts.items.length, 50, "status is applied BEFORE the limit, so the page is full");
});

test("class filter: server-side and validated against the closed set", async () => {
  const { db } = await migratedDb();
  await seedHero(db, { id: "a", heroClass: "ninja" });
  await seedHero(db, { id: "b", heroClass: "soldier" });
  const ninjas = await server.queryEntityAdminList(
    db,
    "hero",
    { ...list.parseAdminListSearch({}), heroClass: "ninja" },
    (r) => r,
  );
  assert.equal(ninjas.total, 1);
  await assert.rejects(
    () =>
      server.queryEntityAdminList(
        db,
        "hero",
        { ...list.parseAdminListSearch({}), heroClass: "mage" },
        (r) => r,
      ),
    /Invalid hero class/,
  );
});

test("other sections share the honest implementation", async () => {
  const { db } = await migratedDb();
  for (let i = 0; i < 3; i += 1) {
    const id = `art${i}`;
    await db
      .prepare(
        "INSERT INTO cms_contents (id, entity_type, status, default_locale, created_at, updated_at) VALUES (?, 'article', 'draft', 'en', ?, ?)",
      )
      .bind(id, STAMP, STAMP)
      .run();
  }
  const articles = await server.queryEntityAdminList(
    db,
    "article",
    list.parseAdminListSearch({}),
    (r) => r,
  );
  assert.equal(articles.total, 3);
  assert.deepEqual(articles.counts, { all: 3, draft: 3, published: 0, archived: 0 });
});

/* ================================================================== */
/* 3. Bulk lifecycle transitions                                       */
/* ================================================================== */

function fakeSetStatus(changed) {
  return async (db, input) => {
    changed.push(input.contentId);
    await db
      .prepare("UPDATE cms_contents SET status = ? WHERE id = ?")
      .bind(input.to, input.contentId)
      .run();
  };
}

test("bulk: legal targets change, everything else is reported honestly", async () => {
  const { db } = await migratedDb();
  await seedHero(db, { id: "draft1", status: "draft" });
  await seedHero(db, { id: "draft2", status: "draft" });
  await seedHero(db, { id: "already", status: "published" });
  await seedHero(db, { id: "archived1", status: "archived" });
  const changed = [];
  const report = await bulk.applyBulkStatusChange({
    db,
    contentIds: ["draft1", "draft2", "already", "archived1", "missing", "draft1"],
    to: "published",
    entityTypes: ["hero"],
    actor: { id: "u", username: "editor" },
    setContentStatus: fakeSetStatus(changed),
  });
  assert.equal(report.changed, 2, "the two drafts publish");
  assert.equal(report.skipped, 2, "already-published + archived→published is illegal");
  assert.equal(report.failed, 1, "the missing id");
  assert.deepEqual(
    report.results.find((r) => r.contentId === "already"),
    {
      contentId: "already",
      outcome: "skipped",
      reason: "already-in-target-status",
      status: "published",
    },
  );
  assert.deepEqual(
    report.results.find((r) => r.contentId === "archived1")?.reason,
    "illegal-transition",
  );
  assert.deepEqual(report.results.find((r) => r.contentId === "missing")?.reason, "not-found");
  assert.deepEqual(changed, ["draft1", "draft2"], "no duplicate write for the doubled id");
});

test("bulk: every transition in the lifecycle matrix behaves", async (t) => {
  for (const [from, to, legal] of [
    ["draft", "published", true],
    ["draft", "archived", true],
    ["published", "draft", true],
    ["published", "archived", true],
    ["archived", "draft", true],
    ["archived", "published", false],
  ]) {
    const { db } = await migratedDb();
    await seedHero(db, { id: "x", status: from });
    const changed = [];
    const report = await bulk.applyBulkStatusChange({
      db,
      contentIds: ["x"],
      to,
      entityTypes: ["hero"],
      actor: { id: "u", username: "editor" },
      setContentStatus: fakeSetStatus(changed),
    });
    const expected = legal ? "changed" : "skipped";
    assert.equal(report.results[0].outcome, expected, `${from} → ${to} must be ${expected}`);
    assert.equal(publish.canTransitionStatus(from, to), legal, "mirrors the state machine");
  }
});

test("bulk: cross-entity ids are refused, never changed", async () => {
  const { db } = await migratedDb();
  await seedHero(db, { id: "h1", status: "draft" });
  await db
    .prepare(
      "INSERT INTO cms_contents (id, entity_type, status, default_locale, created_at, updated_at) VALUES ('a1', 'article', 'draft', 'en', ?, ?)",
    )
    .bind(STAMP, STAMP)
    .run();
  const changed = [];
  const report = await bulk.applyBulkStatusChange({
    db,
    contentIds: ["h1", "a1"],
    to: "published",
    entityTypes: ["hero"],
    actor: { id: "u", username: "editor" },
    setContentStatus: fakeSetStatus(changed),
  });
  assert.equal(report.changed, 1);
  assert.equal(report.results.find((r) => r.contentId === "a1")?.reason, "wrong-entity-type");
  const status = await db.prepare("SELECT status FROM cms_contents WHERE id = 'a1'").bind().first();
  assert.equal(status.status, "draft", "the article is untouched");
});

test("bulk: bounded, and a failing write is a failed row — not a failed batch", async () => {
  const { db } = await migratedDb();
  const ids = [];
  for (let i = 0; i < 210; i += 1) {
    const id = `b${i}`;
    ids.push(id);
    await seedHero(db, { id, status: "draft" });
  }
  const changed = [];
  const report = await bulk.applyBulkStatusChange({
    db,
    contentIds: ids,
    to: "published",
    entityTypes: ["hero"],
    actor: { id: "u", username: "editor" },
    setContentStatus: async (innerDb, input) => {
      if (input.contentId === "b7") throw new Error("simulated D1 failure");
      await fakeSetStatus(changed)(innerDb, input);
    },
  });
  assert.ok(report.error?.includes("Too many records"), "overflow is surfaced");
  assert.equal(report.results.length, bulk.MAX_BULK_RECORDS);
  assert.equal(report.results.find((r) => r.contentId === "b7")?.reason, "write-failed");
});

test("bulk: cross-page resolution recomputes ids from the filter", async () => {
  const { db } = await migratedDb();
  for (let i = 0; i < 5; i += 1) await seedHero(db, { id: `m${i}`, status: "draft" });
  const pageFilter = filters.buildEntityListFilter("hero", { q: "", status: "draft" });
  const { ids, total, truncated } = await bulk.resolveBulkMatchingIds(db, {
    from: pageFilter.from,
    where: pageFilter.where,
    values: pageFilter.values,
  });
  assert.equal(total, 5);
  assert.equal(truncated, false);
  assert.deepEqual([...ids].sort(), ["m0", "m1", "m2", "m3", "m4"]);
});

/* ================================================================== */
/* 4. Safe permanent deletion                                          */
/* ================================================================== */

async function actor() {
  return { id: "u1", username: "editor" };
}

test("delete: an eligible draft is removed with its owned rows, media kept", async () => {
  const { db } = await migratedDb();
  await seedHero(db, { id: "gone", status: "draft", title: "Gone Hero" });
  await db
    .prepare(
      "INSERT INTO media_assets (id, provider, provider_asset_id, delivery_url, original_filename, mime_type, alt_text, status, created_at, updated_at) VALUES ('media_keep','r2','k','https://x/k','k.png','image/png','','ready',?,?)",
    )
    .bind(STAMP, STAMP)
    .run();
  await db
    .prepare("UPDATE hero_records SET portrait_asset_id = 'media_keep' WHERE content_id = 'gone'")
    .bind()
    .run();
  await db
    .prepare(
      "INSERT INTO hero_abilities (id, hero_content_id, ability_key, sort_order, icon_asset_id, created_at, updated_at) VALUES ('ab1','gone','smash',0,'media_keep',?,?)",
    )
    .bind(STAMP, STAMP)
    .run();
  const before = await db.prepare("SELECT COUNT(*) AS n FROM cms_audit_events").bind().first();
  const result = await del.deleteCmsDraft(db, { contentId: "gone" }, await actor());
  assert.equal(result.deleted, true);
  assert.equal(
    await db.prepare("SELECT id FROM cms_contents WHERE id = 'gone'").bind().first(),
    null,
  );
  assert.equal(
    await db
      .prepare("SELECT content_id FROM hero_records WHERE content_id = 'gone'")
      .bind()
      .first(),
    null,
  );
  assert.equal(
    await db.prepare("SELECT id FROM hero_abilities WHERE hero_content_id = 'gone'").bind().first(),
    null,
    "owned child rows go with the record",
  );
  assert.notEqual(
    await db.prepare("SELECT id FROM media_assets WHERE id = 'media_keep'").bind().first(),
    null,
    "the shared media row is never deleted",
  );
  const after = await db.prepare("SELECT COUNT(*) AS n FROM cms_audit_events").bind().first();
  assert.equal(after.n, before.n + 1, "the deletion leaves its own audit event");
});

test("delete: published content is blocked with the unpublish-first workflow", async () => {
  const { db } = await migratedDb();
  await seedHero(db, { id: "live", status: "published" });
  const result = await del.deleteCmsDraft(db, { contentId: "live" }, await actor());
  assert.equal(result.deleted, false);
  assert.ok(result.blockers?.some((b) => b.reason === "published"));
  assert.notEqual(
    await db.prepare("SELECT id FROM cms_contents WHERE id = 'live'").bind().first(),
    null,
  );
});

test("delete: a hero on a loadout roster is blocked (silent cascade refused)", async () => {
  const { db } = await migratedDb();
  await seedHero(db, { id: "rostered", status: "draft" });
  await db
    .prepare(
      "INSERT INTO cms_contents (id, entity_type, status, default_locale, created_at, updated_at) VALUES ('team1','loadout','draft','en',?,?)",
    )
    .bind(STAMP, STAMP)
    .run();
  await db
    .prepare(
      "INSERT INTO loadout_records (content_id, loadout_type, popularity, sort_order, created_at, updated_at) VALUES ('team1','custom',0,0,?,?)",
    )
    .bind(STAMP, STAMP)
    .run();
  await db
    .prepare(
      "INSERT INTO loadout_heroes (id, loadout_content_id, hero_content_id, slot_order, created_at) VALUES ('lh1','team1','rostered',0,?)",
    )
    .bind(STAMP)
    .run();
  const result = await del.deleteCmsDraft(db, { contentId: "rostered" }, await actor());
  assert.equal(result.deleted, false);
  assert.ok(result.blockers?.some((b) => b.reason === "referenced"));
  assert.ok(result.blockers?.[0].references?.some((r) => r.label === "loadout hero roster"));
});

test("delete: a referenced weapon is blocked at the RESTRICT edge", async () => {
  const { db } = await migratedDb();
  for (const [id, type] of [
    ["w1", "weapon"],
    ["s1", "schematic"],
  ]) {
    await db
      .prepare(
        "INSERT INTO cms_contents (id, entity_type, status, default_locale, created_at, updated_at) VALUES (?, ?, 'draft', 'en', ?, ?)",
      )
      .bind(id, type, STAMP, STAMP)
      .run();
  }
  await db
    .prepare(
      "INSERT INTO weapon_records (content_id, weapon_subtype, popularity, sort_order, created_at, updated_at) VALUES ('w1','assault',0,0,?,?)",
    )
    .bind(STAMP, STAMP)
    .run();
  await db
    .prepare(
      "INSERT INTO schematic_records (content_id, weapon_content_id, trap_content_id, popularity, sort_order, created_at, updated_at) VALUES ('s1','w1',NULL,0,0,?,?)",
    )
    .bind(STAMP, STAMP)
    .run();
  const assessment = await del.assessContentDeletability(db, "w1");
  assert.equal(assessment.eligible, false);
  const result = await del.deleteCmsDraft(db, { contentId: "w1" }, await actor());
  assert.equal(result.deleted, false);
  assert.notEqual(
    await db.prepare("SELECT id FROM cms_contents WHERE id = 'w1'").bind().first(),
    null,
  );
});

test("delete: reference-synced heroes are game data, not scratch space", async () => {
  const { db } = await migratedDb();
  await seedHero(db, { id: "synced", status: "draft" });
  await db
    .prepare("UPDATE hero_records SET data_source = 'stw-sync' WHERE content_id = 'synced'")
    .bind()
    .run();
  const result = await del.deleteCmsDraft(db, { contentId: "synced" }, await actor());
  assert.equal(result.deleted, false);
  assert.ok(result.blockers?.some((b) => b.reason === "reference-data"));
});

test("delete: a missing record is a refusal, not a crash", async () => {
  const { db } = await migratedDb();
  const result = await del.deleteCmsDraft(db, { contentId: "nope" }, await actor());
  assert.equal(result.deleted, false);
  assert.ok(result.blockers?.some((b) => b.reason === "not-found"));
});
