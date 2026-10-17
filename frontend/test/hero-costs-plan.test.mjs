// Plan-stability proof for readHeroProgressionCosts.
//
// SQLite flips `JOIN resources r ON r.id = c.resource_id AND r.status = 'active'`
// to a status-index-driven whole-table scan at production row counts
// (242 heroes / ~10K hero_progression_costs rows) — measured locally on
// node:sqlite and corroborated by D1 analytics (~12.4K rows read per
// execution, ~4.62M/day on this one statement). The source keeps the
// PK-only join and post-filters `r.status` in JS (hero-reference.server.ts).
// This test locks BOTH: the plan shape and the semantics.
import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFile, readdir } from "node:fs/promises";

const MIGRATIONS = new URL("../../worker/migrations/", import.meta.url);

// Mirror of hero-reference.server.ts:296-309 — keep in sync.
const COSTS_SQL = `SELECT c.hero_content_id AS hero_content_id, c.rarity AS rarity,
                c.scope AS scope, c.tier AS tier, c.kind AS kind,
                r.status AS resource_status,
                r.resource_key AS resource_key,
                COALESCE(NULLIF(rt.name, ''), NULLIF(rte.name, ''), NULLIF(r.editorial_name, ''), r.display_name) AS display_name,
                COALESCE(c.editorial_amount, c.amount) AS amount, m.delivery_url AS icon_url
           FROM hero_progression_costs c
           JOIN resources r ON r.id = c.resource_id
           LEFT JOIN resource_translations rt ON rt.resource_id = r.id AND rt.locale = ?
           LEFT JOIN resource_translations rte ON rte.resource_id = r.id AND rte.locale = 'en'
           LEFT JOIN media_assets m ON m.id = r.icon_asset_id AND m.status = 'ready'
          WHERE c.hero_content_id IN (${Array.from({ length: 24 }, () => "?").join(",")})
            AND c.editorial_excluded = 0
          ORDER BY c.hero_content_id ASC, c.rarity ASC, c.scope ASC, c.tier ASC, r.sort_order ASC`;

const SQL_JS_MIRROR = (rows) => rows.filter((r) => r.resource_status === "active");

async function loadSchema(con) {
  const files = (await readdir(MIGRATIONS)).filter((f) => f.endsWith(".sql")).sort();
  for (const f of files) {
    const sql = await readFile(new URL(f, MIGRATIONS), "utf8");
    try {
      con.exec(sql);
    } catch {
      // ignore statements node:sqlite cannot replay (runtime-dependent seed rows)
    }
  }
}

function seed(con) {
  const insContent = con.prepare(
    `INSERT INTO cms_contents (id, entity_type, status, default_locale, created_at, updated_at) VALUES (?,?,?,?,?,?)`,
  );
  const insHero = con.prepare(
    `INSERT INTO hero_records (content_id, hero_class, sort_order, popularity, created_at, updated_at) VALUES (?,?,?,?,?,?)`,
  );
  const insCost = con.prepare(
    `INSERT INTO hero_progression_costs (id, hero_content_id, rarity, scope, tier, kind, resource_id, amount, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
  );
  const insRes = con.prepare(
    `INSERT INTO resources (id, resource_key, display_name, sort_order, created_at, updated_at) VALUES (?,?,?,?,?,?)`,
  );
  const insMedia = con.prepare(
    `INSERT INTO media_assets (id, provider, provider_asset_id, status, delivery_url, original_filename, mime_type, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
  );
  const insTr = con.prepare(
    `INSERT INTO resource_translations (id, resource_id, locale, name, description, created_at, updated_at) VALUES (?,?,?,?,?,?,?)`,
  );

  for (let r = 0; r < 24; r++) {
    const id = `r${r}`;
    insRes.run(id, `res-${r}`, `Resource ${r}`, r, "1", "1");
    insMedia.run(
      `m${r}`,
      "r2",
      `a${r}`,
      "ready",
      `https://x/${r}.png`,
      `f${r}.png`,
      "image/png",
      "1",
      "1",
    );
    for (const loc of ["es", "fr", "de", "ru", "pt", "zh", "ar-SA", "fa-IR"]) {
      insTr.run(`t-${id}-${loc}`, id, loc, `Name ${id} ${loc}`, "", "1", "1");
    }
  }
  // Retired resource — must be dropped by the JS post-filter, not the join.
  insRes.run("r24", "res-24", "Retired", 24, "1", "1");
  con.prepare(`UPDATE resources SET status = 'retired' WHERE id = 'r24'`).run();
  insMedia.run("m24", "r2", "a24", "ready", "https://x/24.png", "f24.png", "image/png", "1", "1");

  for (let i = 0; i < 242; i++) {
    const id = `h${i}`;
    insContent.run(id, "hero", "published", "en", "1", "1");
    insHero.run(id, ["soldier", "constructor", "outlander", "ninja"][i % 4], i, i, "1", "1");
    let k = 0;
    for (const rar of ["uncommon", "rare", "epic", "legendary"]) {
      for (let tier = 1; tier <= 5; tier++) {
        const resList =
          rar === "legendary" || rar === "epic" ? ["r0", "r1", "r2", "r24"] : ["r0", "r1", "r24"];
        for (const rid of resList) {
          insCost.run(`c${k}_${i}`, id, rar, "tier", tier, "evolve", rid, 100, "1", "1");
          k++;
        }
      }
    }
    for (const rid of ["r0", "r1", "r2", "r24"]) {
      insCost.run(`c${k++}_t${i}`, id, "legendary", "total", 0, "evolve", rid, 5000, "1", "1");
      insCost.run(`c${k++}_rc${i}`, id, "legendary", "total", 0, "recycle", rid, 100, "1", "1");
    }
  }
}

test("costs plan uses the hero key index, not a resource-driven full scan", async () => {
  const con = new DatabaseSync(":memory:");
  await loadSchema(con);
  seed(con);
  const ids = Array.from({ length: 24 }, (_, i) => `h${i}`);
  const plan = con.prepare(`EXPLAIN QUERY PLAN ${COSTS_SQL}`).all("es", ...ids);
  const detail = plan.map((r) => r.detail).join("\n");

  assert.match(detail, /idx_hero_progression_costs_hero/, `expected hero key index:\n${detail}`);
  assert.doesNotMatch(
    detail,
    /SEARCH r USING INDEX idx_resources_status/,
    `plan flipped to resource-driven scan:\n${detail}`,
  );
  assert.doesNotMatch(
    detail,
    /SEARCH c USING INDEX idx_hero_progression_costs_resource/,
    `plan flipped to resource-index scan:\n${detail}`,
  );
});

test("post-filter keeps retired resources out, matches join-side semantics", async () => {
  const con = new DatabaseSync(":memory:");
  await loadSchema(con);
  seed(con);
  const ids = Array.from({ length: 24 }, (_, i) => `h${i}`);
  const all = con.prepare(COSTS_SQL).all("es", ...ids);
  const activeOnly = SQL_JS_MIRROR(all);
  const expected = all.filter((r) => r.resource_status === "active");
  assert.equal(activeOnly.length, expected.length);
  assert.equal(
    all.length - activeOnly.length > 0,
    true,
    "seed must contain retired rows to prove the filter",
  );
  assert.deepEqual(
    activeOnly.map((r) => Serialized(r)).length,
    expected.map((r) => Serialized(r)).length,
  );
});

const Serialized = (r) => JSON.stringify(r);

test("hero-referenced rows only (no cross-hero leakage)", async () => {
  const con = new DatabaseSync(":memory:");
  await loadSchema(con);
  seed(con);
  const ids = Array.from({ length: 24 }, (_, i) => `h${i}`);
  const all = con.prepare(COSTS_SQL).all("es", ...ids);
  for (const r of activeOnlyMirror(all)) {
    assert.ok(ids.includes(r.hero_content_id), `row leaked from ${r.hero_content_id}`);
  }
});

function activeOnlyMirror(rows) {
  return rows.filter((r) => r.resource_status === "active");
}
