// Hero editor — summary persistence, perk slots, evolution inspection.
//
// WHAT THIS PINS
// --------------
// W5: the "Save identity doesn't stick" root cause is the optimistic-
//     concurrency token, not the column. The token is refreshed after every
//     successful save (server returns the new `recordUpdatedAt`, the form
//     adopts it), so back-to-back saves from one page all succeed. Summary is
//     also server-normalized now: whitespace-only clears to NULL, over-length
//     rejects, and the 240 cap is code points, not UTF-16 units.
// W6: standard + commander perks can be ASSIGNED and CREATED for a hero that
//     has no synced rows, one slot at a time, without touching shared
//     definitions or other heroes.
// W7: the editor surfaces the same `buildProgression` object the public pages
//     render, read-only, with an explicit unknown-vs-zero distinction.
//
// Database assertions run the REAL migration chain against in-memory SQLite.
// Production is untouched.
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/cms-hero-editor.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";

const migrationsDir = new URL("../../worker/migrations/", import.meta.url);

const heroes = await import("../src/lib/cms/heroes-loadouts.server.ts");

async function repo(relFromFrontend) {
  return readFile(new URL(relFromFrontend, new URL("../", import.meta.url)), "utf8");
}

function makeDb(sqlite) {
  return {
    prepare(query) {
      const stmt = sqlite.prepare(query);
      return {
        bind(...values) {
          return {
            first: async () => stmt.get(...values) ?? null,
            all: async () => ({ results: stmt.all(...values) }),
            run: async () => stmt.run(...values),
          };
        },
      };
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

async function seedHero(db, id, status = "draft") {
  await db
    .prepare(
      "INSERT INTO cms_contents (id, entity_type, status, default_locale, created_at, updated_at) VALUES (?, 'hero', ?, 'en', ?, ?)",
    )
    .bind(id, status, STAMP, STAMP)
    .run();
  await db
    .prepare(
      "INSERT INTO hero_records (content_id, hero_class, popularity, sort_order, created_at, updated_at) VALUES (?, 'soldier', 0, 0, ?, ?)",
    )
    .bind(id, STAMP, STAMP)
    .run();
}

/* ================================================================== */
/* W5 — Summary: server contract                                       */
/* ================================================================== */

test("normalizeHeroSummary: trim, empty-to-null, reject over-length", () => {
  assert.equal(heroes.normalizeHeroSummary("  hello  "), "hello");
  assert.equal(heroes.normalizeHeroSummary(""), null);
  assert.equal(heroes.normalizeHeroSummary("   "), null);
  assert.equal(heroes.normalizeHeroSummary(null), null);
  assert.equal(heroes.normalizeHeroSummary(undefined), null);
  assert.throws(() => heroes.normalizeHeroSummary("x".repeat(241)), /240/);
  // Code points, not UTF-16 units: 240 emoji count as 240.
  assert.equal(heroes.normalizeHeroSummary("🎯".repeat(240)), "🎯".repeat(240));
  assert.throws(() => heroes.normalizeHeroSummary("🎯".repeat(241)), /240/);
});

test("summary round trip: set, overwrite, clear — through updateHeroRecord", async () => {
  const db = await migratedDb();
  await seedHero(db, "h1");

  // Save #1.
  let row = await heroes.updateHeroRecord(db, "h1", { summary: "First summary" }, ACTOR);
  assert.equal(row.summary, "First summary");
  const token1 = row.updated_at;

  // Save #2 with the FRESH token (what the fixed form now sends).
  row = await heroes.updateHeroRecord(
    db,
    "h1",
    { summary: "Second summary", expectedUpdatedAt: token1 },
    ACTOR,
  );
  assert.equal(row.summary, "Second summary");
  assert.notEqual(row.updated_at, token1, "every update re-stamps");

  // Clear: empty string becomes NULL in the database, not a lingering "".
  row = await heroes.updateHeroRecord(
    db,
    "h1",
    { summary: "   ", expectedUpdatedAt: row.updated_at },
    ACTOR,
  );
  assert.equal(row.summary, null);

  // Read-back is what the loader returns: NULL stays NULL for the form.
  const stored = await heroes.getHeroRecord(db, "h1");
  assert.equal(stored.summary, null);
});

test("updateHeroRecord: a stale token is rejected, a fresh one accepted", async () => {
  const db = await migratedDb();
  await seedHero(db, "h2");
  const first = await heroes.updateHeroRecord(db, "h2", { summary: "one" }, ACTOR);
  // Same write again with the ORIGINAL render-time token must fail.
  await assert.rejects(
    () => heroes.updateHeroRecord(db, "h2", { summary: "two", expectedUpdatedAt: STAMP }, ACTOR),
    /changed by another editor/,
    "the misleading error the second save used to hit by default",
  );
  assert.equal(
    (await heroes.getHeroRecord(db, "h2")).summary,
    "one",
    "the rejected write changed nothing",
  );
  // With the token from save #1, the same payload succeeds.
  const second = await heroes.updateHeroRecord(
    db,
    "h2",
    { summary: "two", expectedUpdatedAt: first.updated_at },
    ACTOR,
  );
  assert.equal(second.summary, "two");
});

test("updateAdminHero returns the fresh token for the form to adopt", async () => {
  const src = await repo("src/lib/cms/heroes-admin.loader.ts");
  assert.match(src, /return \{ ok: true as const, recordUpdatedAt: row\.updated_at \}/);
  const form = await repo("src/routes/admin/heroes.$contentId.tsx");
  assert.match(form, /const \[concurrencyToken, setConcurrencyToken\] = useState/);
  assert.match(form, /expectedUpdatedAt: concurrencyToken/);
  assert.match(form, /setConcurrencyToken\(result\.recordUpdatedAt\)/);
});

test("identity layout: one-line helpers, aligned controls", async () => {
  const form = await repo("src/routes/admin/heroes.$contentId.tsx");
  // The old wrapping sentence is gone.
  assert.equal(
    form.includes("Leave empty to show no summary — the long description is never truncated"),
    false,
    "the multi-line helper that pushed Summary below Class is removed",
  );
  assert.match(form, /description="One short line for cards and Quick View\."/);
  // Every Identity field reserves the description band so controls line up.
  for (const label of ["Summary", "Class", "Category", "Rarity", "Popularity", "Sort order"]) {
    assert.match(
      form,
      new RegExp(`label="${label}"[\\s\\S]{0,80}alignControl`),
      `${label} must opt into control alignment`,
    );
  }
  const primitives = await repo("src/components/cms/cc/CmsPrimitives.tsx");
  assert.match(primitives, /alignControl\?: boolean/);
  assert.match(primitives, /min-h-4/);
});

/* ================================================================== */
/* W6 — Perk assignment                                                */
/* ================================================================== */

test("assignHeroPerk: standard + commander on a hero with no rows", async () => {
  const db = await migratedDb();
  await seedHero(db, "bare");
  const defStd = await heroes.createHeroPerkDef(db, "standard", {
    displayName: "Monster Smash",
    description: "Smash monsters.",
  });
  const defCmd = await heroes.createHeroPerkDef(db, "commander", {
    displayName: "Monster Smash+",
    description: "Smash harder.",
  });
  const std = await heroes.assignHeroPerk(
    db,
    { heroContentId: "bare", slot: "standard", perkDefId: defStd },
    ACTOR,
  );
  const cmd = await heroes.assignHeroPerk(
    db,
    { heroContentId: "bare", slot: "commander", perkDefId: defCmd },
    ACTOR,
  );
  assert.equal(std.createdDef, false);
  assert.notEqual(std.heroPerkId, cmd.heroPerkId);
  const rows = await heroes.listHeroPerkJoinRows(db, "bare");
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((r) => r.slot).sort(), ["commander", "standard"]);
});

test("assignHeroPerk: slot mismatch is rejected, not written", async () => {
  const db = await migratedDb();
  await seedHero(db, "mismatch");
  const defStd = await heroes.createHeroPerkDef(db, "standard", { displayName: "Shield Wall" });
  await assert.rejects(
    () =>
      heroes.assignHeroPerk(
        db,
        { heroContentId: "mismatch", slot: "commander", perkDefId: defStd },
        ACTOR,
      ),
    /commander/,
  );
  assert.deepEqual(await heroes.listHeroPerkJoinRows(db, "mismatch"), []);
});

test("assignHeroPerk: create + assign in one call, slot-scoped key", async () => {
  const db = await migratedDb();
  await seedHero(db, "fresh");
  const result = await heroes.assignHeroPerk(
    db,
    {
      heroContentId: "fresh",
      slot: "standard",
      create: { displayName: "Afterburner", description: "Speed up.", descriptionLocale: "en" },
    },
    ACTOR,
  );
  assert.equal(result.createdDef, true);
  const def = await db
    .prepare("SELECT perk_key, slot, display_name FROM hero_perk_defs WHERE id = ?")
    .bind(result.perkDefId)
    .first();
  assert.equal(
    def.perk_key,
    "standard/afterburner",
    "slot prefix prevents the naive-slug collision",
  );
  assert.equal(def.slot, "standard");
  const tr = await db
    .prepare(
      "SELECT locale, name, description FROM hero_perk_def_translations WHERE hero_perk_def_id = ?",
    )
    .bind(result.perkDefId)
    .first();
  assert.deepEqual([tr.locale, tr.name, tr.description], ["en", "Afterburner", "Speed up."]);
});

test("assignHeroPerk: replace needs the flag; clear keeps the shared def", async () => {
  const db = await migratedDb();
  await seedHero(db, "swap");
  const first = await heroes.createHeroPerkDef(db, "standard", { displayName: "First" });
  const second = await heroes.createHeroPerkDef(db, "standard", { displayName: "Second" });
  await heroes.assignHeroPerk(
    db,
    { heroContentId: "swap", slot: "standard", perkDefId: first },
    ACTOR,
  );
  await assert.rejects(
    () =>
      heroes.assignHeroPerk(
        db,
        { heroContentId: "swap", slot: "standard", perkDefId: second },
        ACTOR,
      ),
    /already has a standard perk/,
  );
  await heroes.assignHeroPerk(
    db,
    { heroContentId: "swap", slot: "standard", perkDefId: second, replace: true },
    ACTOR,
  );
  let rows = await heroes.listHeroPerkJoinRows(db, "swap");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].defId, second);

  const cleared = await heroes.assignHeroPerk(
    db,
    { heroContentId: "swap", slot: "standard", clear: true },
    ACTOR,
  );
  assert.equal(cleared.perkDefId, null);
  assert.deepEqual(await heroes.listHeroPerkJoinRows(db, "swap"), []);
  // Both shared definitions survive: clearing a slot never deletes a def.
  assert.notEqual(
    await db.prepare("SELECT id FROM hero_perk_defs WHERE id = ?").bind(first).first(),
    null,
  );
  assert.notEqual(
    await db.prepare("SELECT id FROM hero_perk_defs WHERE id = ?").bind(second).first(),
    null,
  );
});

test("assignHeroPerk: one hero's edit cannot touch another hero's perk", async () => {
  const db = await migratedDb();
  await seedHero(db, "alpha");
  await seedHero(db, "beta");
  const shared = await heroes.createHeroPerkDef(db, "standard", { displayName: "Shared Blow" });
  await heroes.assignHeroPerk(
    db,
    { heroContentId: "alpha", slot: "standard", perkDefId: shared },
    ACTOR,
  );
  await heroes.assignHeroPerk(
    db,
    { heroContentId: "beta", slot: "standard", perkDefId: shared },
    ACTOR,
  );

  // A forged content id on the icon path must fail, and assigning beta's own
  // new perk must leave alpha exactly as it was.
  const betaRows = await heroes.listHeroPerkJoinRows(db, "beta");
  const alphaBefore = await heroes.listHeroPerkJoinRows(db, "alpha");
  const other = await heroes.createHeroPerkDef(db, "commander", { displayName: "Other+" });
  await heroes.assignHeroPerk(
    db,
    { heroContentId: "beta", slot: "commander", perkDefId: other, replace: true },
    ACTOR,
  );
  assert.deepEqual(await heroes.listHeroPerkJoinRows(db, "alpha"), alphaBefore);
  assert.equal(betaRows.length, 1, "beta gained nothing extra in standard");
  const def = await db
    .prepare("SELECT display_name FROM hero_perk_defs WHERE id = ?")
    .bind(shared)
    .first();
  assert.equal(def.display_name, "Shared Blow", "the shared text is untouched");
});

test("perk mutations are registered in the same-origin inventory", async () => {
  const { CMS_MUTATION_INVENTORY } = await import("../src/lib/cms/cms-mutations.ts");
  const heroesEntry = CMS_MUTATION_INVENTORY.find((e) => e.file.endsWith("heroes-admin.loader.ts"));
  assert.ok(heroesEntry?.mutations.includes("assignAdminHeroPerk"));
  const loader = await repo("src/lib/cms/heroes-admin.loader.ts");
  assert.match(loader, /export const assignAdminHeroPerk = createServerFn\(\{ method: "POST" \}\)/);
  // Saving a perk never publishes: the handler asks for cms.write, not cms.publish.
  const segment = loader.slice(loader.indexOf("export const assignAdminHeroPerk"));
  assert.match(segment, /requireHeroSession\("cms\.write", true\)/);
});

test("perk definitions are listed per slot, never as a full dump", async () => {
  const db = await migratedDb();
  await heroes.createHeroPerkDef(db, "standard", { displayName: "Bulwark" });
  await heroes.createHeroPerkDef(db, "commander", { displayName: "Bulwark+" });
  const std = await heroes.listHeroPerkDefinitions(db, "standard", {});
  const cmd = await heroes.listHeroPerkDefinitions(db, "commander", {});
  assert.ok(std.every((d) => d.slot === "standard"));
  assert.ok(cmd.every((d) => d.slot === "commander"));
  const searched = await heroes.listHeroPerkDefinitions(db, "standard", { search: "bulw" });
  assert.equal(searched.length, 1);
});

/* ================================================================== */
/* W7 — Evolution inspection (read-only, public-identical)             */
/* ================================================================== */

test("editor evolution section: read-only and public-identical", async () => {
  const loader = await repo("src/lib/cms/heroes-admin.loader.ts");
  // Same fold function the public pages use — not a second implementation.
  assert.match(loader, /readHeroProgressionRows, readHeroProgressionCosts, buildProgression/);
  assert.match(loader, /buildProgression\(\s*progRows\.get\(data\.contentId\)/);
  const form = await repo("src/routes/admin/heroes.$contentId.tsx");
  // Read-only: the section renders tables, never a mutation. Bound the slice
  // to the section's own body so later components cannot leak into it.
  const sectionStart = form.indexOf("function HeroEditorEvolutionSection");
  const sectionEnd = form.indexOf("\n}\n", sectionStart);
  const section = form.slice(sectionStart, sectionEnd);
  assert.match(form, /function HeroEditorEvolutionSection/);
  assert.match(form, /data-testid=\{`hero-evolution-\$\{rarity\.rarity\}`\}/);
  assert.equal(/updateAdminHero|assignAdminHeroPerk|upsertAdminHeroPerkIcon/.test(section), false);
  // Unknown-vs-zero: an explicit final-tier label and an explicit empty state.
  assert.match(form, /Final tier — no further evolution\./);
  assert.match(form, /No evolution data synced for this hero/);
  // The sync-source contract is stated where the editor sees it.
  assert.match(form, /Saving this hero never modifies these costs\./);
});

test("buildProgression: tiers order, totals pass through, final tier empty", async () => {
  const ref = await import("../src/lib/cms/hero-reference.server.ts");
  const prog = ref.buildProgression(
    [
      {
        hero_content_id: "h",
        rarity: "legendary",
        tier: 2,
        power_min: 35,
        power_max: 51,
        level_min: 10,
        level_max: 20,
      },
      {
        hero_content_id: "h",
        rarity: "legendary",
        tier: 1,
        power_min: 12,
        power_max: 26,
        level_min: 1,
        level_max: 10,
      },
    ],
    [
      {
        hero_content_id: "h",
        rarity: "legendary",
        scope: "tier",
        tier: 1,
        kind: "evolve",
        resource_key: "training-manual",
        display_name: "Training Manual",
        amount: 75,
        icon_url: null,
      },
      {
        hero_content_id: "h",
        rarity: "legendary",
        scope: "tier",
        tier: 2,
        kind: "evolve",
        resource_key: "training-manual",
        display_name: "Training Manual",
        amount: 200,
        icon_url: null,
      },
      {
        hero_content_id: "h",
        rarity: "legendary",
        scope: "total",
        tier: 0,
        kind: "evolve",
        resource_key: "training-manual",
        display_name: "Training Manual",
        amount: 9999,
        icon_url: null,
      },
    ],
    null,
  );
  assert.ok(prog);
  assert.deepEqual(
    prog.rarities[0].tiers.map((t) => t.tier),
    [1, 2],
    "tiers sort ascending",
  );
  assert.equal(prog.rarities[0].tiers[0].evolve.length, 1);
  assert.equal(prog.rarities[0].tiers[1].evolve.length, 1);
  // Totals are the stored scope='total' rows, not a JS sum.
  assert.equal(prog.rarities[0].total[0].amount, 9999);
  assert.equal(prog.maxPower, 51);
});
