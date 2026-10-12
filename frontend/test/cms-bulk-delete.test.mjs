// Safe bulk permanent-delete + consistent single-record Delete.
//
// ROOT CAUSES BEING PINNED
// ------------------------
// 1. No bulk delete path exists: selection supports status changes only.
// 2. Single-record Delete is SILENTLY ABSENT for ineligible rows (published,
//    reference-synced, referenced, probe-failed all collapse into "no menu
//    item"), so editors cannot tell WHY — fuelling the suspicion that
//    sync-created records are treated arbitrarily. The verified policy is:
//      * published -> blocked (unpublish/archive first)
//      * hero with data_source = 'stw-sync' -> blocked (reference data)
//      * any of 8 inbound reference types -> blocked (incl. silent cascades)
//      * else (draft/archived, editorial, unreferenced) -> eligible
// 3. List loaders probe deletability with N per-row server-function round
//    trips; the batched probe must replace them.
//
// The bulk path MUST reuse the single-record service (`deleteCmsDraft`,
// which re-assesses + audits per record) — never a second, weaker path.
// All database assertions run the REAL migration chain against in-memory
// SQLite. Production is untouched.
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/cms-bulk-delete.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";

const migrationsDir = new URL("../../worker/migrations/", import.meta.url);

const del = await import("../src/lib/cms/content-delete.server.ts");
const bulk = await import("../src/lib/cms/bulk-actions.server.ts");

/* ================================================================== */
/* D1-shaped shim over node:sqlite (same as cms-admin-lists)           */
/* ================================================================== */

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
  return makeDb(sqlite);
}

const STAMP = "2026-10-01T00:00:00.000Z";
const ACTOR = { id: "u1", username: "editor" };

async function seedHero(db, { id, status = "draft", dataSource = "editorial" }) {
  await db
    .prepare(
      "INSERT INTO cms_contents (id, entity_type, status, default_locale, created_at, updated_at) VALUES (?, 'hero', ?, 'en', ?, ?)",
    )
    .bind(id, status, STAMP, STAMP)
    .run();
  await db
    .prepare(
      "INSERT INTO hero_records (content_id, hero_class, data_source, popularity, sort_order, created_at, updated_at) VALUES (?, 'soldier', ?, 0, 0, ?, ?)",
    )
    .bind(id, dataSource, STAMP, STAMP)
    .run();
}

async function seedLoadoutReferencingHero(db, { loadoutId, heroId }) {
  await db
    .prepare(
      "INSERT INTO cms_contents (id, entity_type, status, default_locale, created_at, updated_at) VALUES (?, 'loadout', 'draft', 'en', ?, ?)",
    )
    .bind(loadoutId, STAMP, STAMP)
    .run();
  await db
    .prepare(
      "INSERT INTO loadout_records (content_id, loadout_type, popularity, sort_order, created_at, updated_at) VALUES (?, 'custom', 0, 0, ?, ?)",
    )
    .bind(loadoutId, STAMP, STAMP)
    .run();
  await db
    .prepare(
      "INSERT INTO loadout_heroes (id, loadout_content_id, hero_content_id, slot_order, created_at) VALUES (?, ?, ?, 0, ?)",
    )
    .bind(`lh_${loadoutId}`, loadoutId, heroId, STAMP)
    .run();
}

async function repo(relFromFrontend) {
  return readFile(new URL(relFromFrontend, new URL("../", import.meta.url)), "utf8");
}

/* ================================================================== */
/* 1. Batched assessment: one round trip, same verdicts as single      */
/* ================================================================== */

test("batched assessment matches the single-record verdicts", async () => {
  const db = await migratedDb();
  await seedHero(db, { id: "ok-draft", status: "draft" });
  await seedHero(db, { id: "ok-archived", status: "archived" });
  await seedHero(db, { id: "live", status: "published" });
  await seedHero(db, { id: "synced", status: "draft", dataSource: "stw-sync" });
  await seedHero(db, { id: "rostered", status: "draft" });
  await seedLoadoutReferencingHero(db, { loadoutId: "team1", heroId: "rostered" });

  const ids = ["ok-draft", "ok-archived", "live", "synced", "rostered", "ghost"];
  const batch = await del.assessManyContentDeletability(db, ids);
  assert.equal(batch["ok-draft"]?.eligible, true);
  assert.equal(batch["ok-archived"]?.eligible, true, "archived is deletable too");
  assert.equal(batch["live"]?.eligible, false);
  assert.equal(batch["synced"]?.eligible, false);
  assert.equal(batch["rostered"]?.eligible, false);
  assert.equal(batch["ghost"]?.eligible, false, "missing rows report, not crash");

  // Every verdict carries user-safe reasons drawn from the real blockers.
  assert.deepEqual(
    batch["live"]?.reasons.map((r) => r.reason),
    ["published"],
  );
  assert.deepEqual(
    batch["synced"]?.reasons.map((r) => r.reason),
    ["reference-data"],
  );
  assert.deepEqual(
    batch["rostered"]?.reasons.map((r) => r.reason),
    ["referenced"],
  );
  assert.deepEqual(
    batch["ghost"]?.reasons.map((r) => r.reason),
    ["not-found"],
  );
  for (const id of ids) {
    for (const reason of batch[id]?.reasons ?? []) {
      assert.ok(reason.message.length > 0, `${id} reason must explain itself`);
    }
  }

  // Parity: batch agrees with the single-record service on every row.
  for (const id of ids) {
    const single = await del.assessContentDeletability(db, id);
    assert.equal(batch[id]?.eligible, single.eligible, `${id} parity`);
    assert.deepEqual(
      batch[id]?.reasons.map((r) => r.reason),
      single.blockers.map((b) => b.reason),
      `${id} reason parity`,
    );
  }
});

test("list loaders use the batched probe, not N per-row round trips", async () => {
  for (const f of [
    "src/routes/admin/heroes.tsx",
    "src/routes/admin/articles.tsx",
    "src/routes/admin/loadouts.tsx",
    "src/routes/admin/inventory.tsx",
  ]) {
    const src = await repo(f);
    assert.equal(
      /result\.items\.map\(async \(row\) =>/.test(src),
      false,
      `${f} must not probe per row`,
    );
    assert.match(src, /getAdminDraftDeletabilityMany/, `${f} uses the batched probe`);
  }
  const loader = await repo("src/lib/cms/bulk-admin.loader.ts");
  assert.match(loader, /export const getAdminDraftDeletabilityMany/);
  assert.match(loader, /assessManyContentDeletability/);
});

/* ================================================================== */
/* 2. Bulk delete service: bounded, per-record, audited, repeatable    */
/* ================================================================== */

test("bulk delete: a fully eligible selection is removed with audit", async () => {
  const db = await migratedDb();
  await seedHero(db, { id: "b1" });
  await seedHero(db, { id: "b2", status: "archived" });
  const before = await db.prepare("SELECT COUNT(*) AS n FROM cms_audit_events").first();

  const report = await bulk.bulkDeleteCmsDrafts(db, ["b1", "b2"], ACTOR);
  assert.equal(report.deleted, 2);
  assert.equal(report.skipped, 0);
  assert.equal(report.failed, 0);
  assert.deepEqual(
    report.results.map((r) => r.outcome),
    ["deleted", "deleted"],
  );
  for (const id of ["b1", "b2"]) {
    assert.equal(
      await db.prepare("SELECT id FROM cms_contents WHERE id = ?").bind(id).first(),
      null,
    );
  }
  const after = await db.prepare("SELECT COUNT(*) AS n FROM cms_audit_events").first();
  assert.equal(after.n, before.n + 2, "each deletion leaves its own audit event");
  const actions = await db.prepare("SELECT DISTINCT action AS a FROM cms_audit_events").first();
  assert.ok(actions, "audit rows exist");
});

test("bulk delete: mixed selection reports per-record outcomes honestly", async () => {
  const db = await migratedDb();
  await seedHero(db, { id: "m-ok", status: "draft" });
  await seedHero(db, { id: "m-live", status: "published" });
  await seedHero(db, { id: "m-synced", status: "draft", dataSource: "stw-sync" });
  await seedHero(db, { id: "m-rostered", status: "draft" });
  await seedLoadoutReferencingHero(db, { loadoutId: "m-team", heroId: "m-rostered" });

  const report = await bulk.bulkDeleteCmsDrafts(
    db,
    ["m-ok", "m-live", "m-synced", "m-rostered", "m-ghost"],
    ACTOR,
  );
  assert.equal(report.deleted, 1);
  assert.equal(report.skipped, 4);
  assert.equal(report.failed, 0);
  const byId = Object.fromEntries(report.results.map((r) => [r.contentId, r]));
  assert.equal(byId["m-ok"].outcome, "deleted");
  assert.equal(byId["m-live"].outcome, "skipped");
  assert.equal(byId["m-live"].reason, "published");
  assert.equal(byId["m-synced"].outcome, "skipped");
  assert.equal(byId["m-synced"].reason, "reference-data");
  assert.equal(byId["m-rostered"].outcome, "skipped");
  assert.equal(byId["m-rostered"].reason, "referenced");
  assert.equal(byId["m-ghost"].outcome, "skipped");
  assert.equal(byId["m-ghost"].reason, "not-found");
  // One success never masks the skips, and blocked rows survive.
  for (const id of ["m-live", "m-synced", "m-rostered"]) {
    assert.notEqual(
      await db.prepare("SELECT id FROM cms_contents WHERE id = ?").bind(id).first(),
      null,
      `${id} must survive`,
    );
  }
});

test("bulk delete: shared definitions and media survive a bulk delete", async () => {
  const db = await migratedDb();
  await seedHero(db, { id: "keeper" });
  await db
    .prepare(
      "INSERT INTO media_assets (id, provider, provider_asset_id, delivery_url, original_filename, mime_type, alt_text, status, created_at, updated_at) VALUES ('media_keep','r2','k','https://x/k','k.png','image/png','','ready',?,?)",
    )
    .bind(STAMP, STAMP)
    .run();
  await db
    .prepare("UPDATE hero_records SET portrait_asset_id = 'media_keep' WHERE content_id = 'keeper'")
    .run();
  const report = await bulk.bulkDeleteCmsDrafts(db, ["keeper"], ACTOR);
  assert.equal(report.deleted, 1);
  assert.notEqual(
    await db.prepare("SELECT id FROM media_assets WHERE id = 'media_keep'").first(),
    null,
  );
});

test("bulk delete: over-limit batches are refused, never silently trimmed", async () => {
  const db = await migratedDb();
  const ids = Array.from({ length: 201 }, (_, i) => `x${i}`);
  await assert.rejects(() => bulk.bulkDeleteCmsDrafts(db, ids, ACTOR), /max|200|bound/i);
});

test("bulk delete: a repeated request is safe (idempotent skips)", async () => {
  const db = await migratedDb();
  await seedHero(db, { id: "twice" });
  const first = await bulk.bulkDeleteCmsDrafts(db, ["twice"], ACTOR);
  assert.equal(first.deleted, 1);
  const second = await bulk.bulkDeleteCmsDrafts(db, ["twice"], ACTOR);
  assert.equal(second.deleted, 0);
  assert.equal(second.skipped, 1);
  assert.equal(second.results[0]?.outcome, "skipped");
  assert.equal(second.results[0]?.reason, "not-found");
});

test("bulk delete: 250 records process in bounded chunks", async () => {
  const db = await migratedDb();
  const ids = [];
  for (let i = 0; i < 250; i++) {
    const id = `chunk${i}`;
    ids.push(id);
    await seedHero(db, { id });
  }
  // The chunk helper is the single funnel the UI uses: bounded slices that
  // each fit one server request.
  const chunks = bulk.chunkBulkIds(ids, 200);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0]?.length, 200);
  assert.equal(chunks[1]?.length, 50);
  let deleted = 0;
  for (const slice of chunks) {
    const report = await bulk.bulkDeleteCmsDrafts(db, slice, ACTOR);
    deleted += report.deleted;
    assert.equal(report.failed, 0);
  }
  assert.equal(deleted, 250);
  assert.equal((await db.prepare("SELECT COUNT(*) AS n FROM cms_contents").first())?.n, 0);
});

test("bulk delete server function reuses the service with guards", async () => {
  const src = await repo("src/lib/cms/bulk-admin.loader.ts");
  assert.match(src, /export const bulkDeleteDraftContent/);
  assert.match(src, /bulkDeleteCmsDrafts/);
  assert.match(src, /requireLifecycleSession\("cms\.write", true\)/);
  // Bounded at the transport edge too.
  assert.match(src, /MAX_SELECTED/);
  const inventory = await repo("src/lib/cms/cms-mutations.ts");
  assert.match(inventory, /bulkDeleteDraftContent/);
});

/* ================================================================== */
/* 3. Consistent single-record Delete with real explanations           */
/* ================================================================== */

test("row menus explain ineligibility instead of hiding Delete", async () => {
  const src = await repo("src/components/cms/cc/CmsEntityList.tsx");
  // The Delete entry is structural now: eligible rows get the action,
  // ineligible rows get a disabled entry carrying the server's reason.
  assert.equal(
    /if \(props\.deletable\[row\.contentId\] === true\) \{/.test(src),
    false,
    "Delete must not be silently absent",
  );
  assert.match(src, /Delete permanently/);
  assert.match(src, /disabledReason|blocker|reason/i);
});

test("bulk toolbar offers Delete selected with an explicit review step", async () => {
  const toolbar = await repo("src/components/cms/cc/CmsBulkToolbar.tsx");
  // The toolbar exposes a review-gated destructive slot (rendered as its own
  // danger button, never inside the status menu); the list owns the label.
  assert.match(toolbar, /destructive/);
  assert.match(toolbar, /props\.destructive\.label/);
  assert.match(toolbar, /cc-btn-danger-outline/);
  const list = await repo("src/components/cms/cc/CmsEntityList.tsx");
  assert.match(list, /Delete selected/);
  // The confirm dialog states scope before anything destructive runs:
  // selected count, eligible count, blocked count, permanence warning.
  assert.match(list, /eligible/i);
  assert.match(list, /permanent/i);
  // Execution goes through the server function in bounded chunks; the client
  // never deletes directly.
  assert.match(list, /bulkDeleteDraftContent/);
  assert.match(list, /chunkBulkIds/);
});

test("server stays the source of truth: forged deletes are refused", async () => {
  const db = await migratedDb();
  // The UI's advisory map says nothing the server does not re-check:
  // deleteCmsDraft re-assesses at execution time even for "eligible" ids.
  await seedHero(db, { id: "forged", status: "published" });
  const { deleteCmsDraft } = del;
  const result = await deleteCmsDraft(db, { contentId: "forged" }, ACTOR);
  assert.equal(result.deleted, false);
  assert.ok(result.blockers?.some((b) => b.reason === "published"));
  assert.notEqual(
    await db.prepare("SELECT id FROM cms_contents WHERE id = 'forged'").first(),
    null,
  );
});
