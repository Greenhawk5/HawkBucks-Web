// Phase 14 tests part 1.
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
const tax = await import("../src/lib/cms/schematics.ts");
const server = await import("../src/lib/cms/schematics-inventory.server.ts");
test("taxonomy: stable machine values", () => {
  assert.deepEqual([...tax.WEAPON_SUBTYPES].sort(), [
    "assault",
    "explosive",
    "melee",
    "other",
    "pistol",
    "shotgun",
    "smg",
    "sniper",
  ]);
  assert.deepEqual([...tax.TRAP_SUBTYPES].sort(), ["damage", "healer", "other", "utility"]);
  assert.deepEqual([...tax.PERK_TYPES].sort(), ["defense", "offense", "other", "team", "utility"]);
  assert.equal(tax.isWeaponSubtype("assault"), true);
  assert.equal(tax.isWeaponSubtype("Railgun"), false);
  assert.equal(tax.normalizeWeaponSubtype("SMG"), "smg");
  assert.equal(tax.normalizeTrapSubtype("boss"), null);
  assert.equal(tax.isValidPerkKey("crit-damage_2"), true);
  assert.equal(tax.isValidPerkKey("Bad Key!"), false);
  assert.equal(tax.isValidSlotOrder(0), true);
  assert.equal(tax.isValidSlotOrder(32), false);
  assert.equal(tax.MAX_SCHEMATIC_PERKS, 12);
});
function contentRow(id, entityType, status = "draft") {
  return { id, entity_type: entityType, default_locale: "en", status };
}
const actor = { id: "u", username: "u" };
function createFakeDb() {
  const contents = new Map();
  const weapons = new Map();
  const traps = new Map();
  const perks = new Map();
  const perkTrs = [];
  const schematics = new Map();
  const sperks = [];
  const ctrans = [];
  const db = {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            first: async () => {
              if (sql.includes("SELECT delivery_url FROM media_assets"))
                return { delivery_url: "https://cdn.example/i.png" };
              if (sql.includes("FROM cms_contents WHERE id")) return contents.get(args[0]) ?? null;
              if (sql.includes("FROM weapon_records WHERE content_id"))
                return weapons.get(args[0]) ?? null;
              if (sql.includes("FROM trap_records WHERE content_id"))
                return traps.get(args[0]) ?? null;
              if (sql.includes("FROM perk_records WHERE content_id"))
                return perks.get(args[0]) ?? null;
              if (sql.includes("FROM perk_records WHERE perk_key"))
                return [...perks.values()].find((p) => p.perk_key === args[0]) ?? null;
              if (sql.includes("FROM schematic_records WHERE content_id"))
                return schematics.get(args[0]) ?? null;
              if (sql.includes("WHERE weapon_content_id = ?"))
                return (
                  [...schematics.values()].find((s) => s.weapon_content_id === args[0]) ?? null
                );
              if (sql.includes("WHERE trap_content_id = ?"))
                return [...schematics.values()].find((s) => s.trap_content_id === args[0]) ?? null;
              if (sql.includes("FROM perk_translations WHERE perk_content_id = ? AND locale"))
                return (
                  perkTrs.find((t) => t.perk_content_id === args[0] && t.locale === args[1]) ?? null
                );
              if (sql.includes("FROM cms_content_translations WHERE content_id = ? AND locale"))
                return ctrans.find((t) => t.content_id === args[0] && t.locale === args[1]) ?? null;
              if (sql.includes("SELECT name, description FROM perk_translations")) {
                if (sql.includes("AND locale = ?"))
                  return (
                    perkTrs.find((t) => t.perk_content_id === args[0] && t.locale === args[1]) ??
                    null
                  );
                return perkTrs.filter((t) => t.perk_content_id === args[0])[0] ?? null;
              }
              return null;
            },
            all: async () => {
              if (sql.includes("FROM schematic_perks WHERE schematic_content_id")) {
                return {
                  results: sperks
                    .filter((s) => s.schematic_content_id === args[0])
                    .sort((a, b) => a.slot_order - b.slot_order),
                };
              }
              if (sql.includes("FROM perk_translations WHERE perk_content_id")) {
                return { results: perkTrs.filter((t) => t.perk_content_id === args[0]) };
              }
              return { results: [] };
            },
            run: async () => {
              if (sql.startsWith("INSERT INTO weapon_records")) {
                weapons.set(args[0], {
                  content_id: args[0],
                  weapon_subtype: args[1],
                  popularity: args[2],
                  sort_order: args[3],
                  icon_asset_id: args[4],
                });
              } else if (sql.startsWith("INSERT INTO trap_records")) {
                traps.set(args[0], {
                  content_id: args[0],
                  trap_subtype: args[1],
                  popularity: args[2],
                  sort_order: args[3],
                  icon_asset_id: args[4],
                });
              } else if (sql.startsWith("INSERT INTO perk_records")) {
                if ([...perks.values()].some((p) => p.perk_key === args[1]))
                  throw new Error("Duplicate perk_key.");
                perks.set(args[0], {
                  content_id: args[0],
                  perk_key: args[1],
                  perk_type: args[2],
                  popularity: args[3],
                  sort_order: args[4],
                  icon_asset_id: args[5],
                });
              } else if (sql.startsWith("INSERT INTO schematic_records")) {
                schematics.set(args[0], {
                  content_id: args[0],
                  weapon_content_id: args[1],
                  trap_content_id: args[2],
                  popularity: args[3],
                  sort_order: args[4],
                  icon_asset_id: args[5],
                });
              } else if (sql.startsWith("INSERT INTO schematic_perks")) {
                if (
                  sperks.some(
                    (s) => s.schematic_content_id === args[1] && s.perk_content_id === args[2],
                  )
                )
                  throw new Error("Duplicate perk assignment.");
                if (
                  sperks.some((s) => s.schematic_content_id === args[1] && s.slot_order === args[3])
                )
                  throw new Error("Duplicate slot_order.");
                sperks.push({
                  id: args[0],
                  schematic_content_id: args[1],
                  perk_content_id: args[2],
                  slot_order: args[3],
                });
              } else if (sql.startsWith("DELETE FROM schematic_perks")) {
                for (let i = sperks.length - 1; i >= 0; i--)
                  if (sperks[i].schematic_content_id === args[0]) sperks.splice(i, 1);
              } else if (sql.startsWith("INSERT INTO perk_translations")) {
                perkTrs.push({
                  id: args[0],
                  perk_content_id: args[1],
                  locale: args[2],
                  name: args[3],
                  description: args[4],
                });
              } else if (sql.startsWith("UPDATE perk_translations")) {
                const t = perkTrs.find((x) => x.id === args[3]);
                if (t) {
                  t.name = args[0];
                  t.description = args[1];
                }
              }
              return {};
            },
          };
        },
      };
    },
  };
  return { db, contents, ctrans };
}
test("weapons/traps: valid creation, subtype integrity", async () => {
  const { db, contents } = createFakeDb();
  contents.set("w1", contentRow("w1", "weapon"));
  contents.set("t1", contentRow("t1", "trap"));
  const w = await server.createWeaponRecord(
    db,
    contents.get("w1"),
    { weaponSubtype: "Assault" },
    actor,
  );
  assert.equal(w.weapon_subtype, "assault");
  const t = await server.createTrapRecord(db, contents.get("t1"), { trapSubtype: "damage" }, actor);
  assert.equal(t.trap_subtype, "damage");
  await assert.rejects(
    () => server.createWeaponRecord(db, contents.get("w1"), { weaponSubtype: "railgun" }, actor),
    /Invalid weapon_subtype/,
  );
  await assert.rejects(
    () => server.createWeaponRecord(db, contents.get("t1"), { weaponSubtype: "smg" }, actor),
    /not a weapon/,
  );
});
test("perks: reusable entities, duplicate keys rejected", async () => {
  const { db, contents } = createFakeDb();
  contents.set("p1", contentRow("p1", "perk"));
  contents.set("p2", contentRow("p2", "perk"));
  const p = await server.createPerkRecord(
    db,
    contents.get("p1"),
    { perkKey: "crit-chance", perkType: "offense" },
    actor,
  );
  assert.equal(p.perk_key, "crit-chance");
  await assert.rejects(
    () => server.createPerkRecord(db, contents.get("p2"), { perkKey: "crit-chance" }, actor),
    /Duplicate perk_key/,
  );
  await assert.rejects(
    () => server.createPerkRecord(db, contents.get("p2"), { perkKey: "Bad Key!" }, actor),
    /Invalid perk_key/,
  );
  const tr = await server.upsertPerkTranslation(
    db,
    "p1",
    { locale: "en", name: "Crit Chance", description: "+crit" },
    actor,
  );
  assert.equal(tr.name, "Crit Chance");
  const list = await server.listPerkTranslations(db, "p1");
  assert.equal(list.length, 1);
  await assert.rejects(
    () => server.upsertPerkTranslation(db, "p1", { locale: "en", name: "" }, actor),
    /required/,
  );
  await assert.rejects(
    () => server.upsertPerkTranslation(db, "p1", { locale: "xx", name: "X" }, actor),
    /Unsupported locale/,
  );
  for (const locale of ["es", "fr", "ru", "de", "pt", "zh", "ar-SA", "fa-IR"]) {
    const row = await server.upsertPerkTranslation(
      db,
      "p1",
      { locale, name: `N-${locale}` },
      actor,
    );
    assert.equal(row.locale, locale);
  }
});
test("schematics: exactly-one target, type-correct, deduped", async () => {
  const { db, contents } = createFakeDb();
  contents.set("w1", contentRow("w1", "weapon"));
  contents.set("t1", contentRow("t1", "trap"));
  contents.set("s1", contentRow("s1", "schematic"));
  contents.set("s2", contentRow("s2", "schematic"));
  contents.set("s3", contentRow("s3", "schematic"));
  await server.createWeaponRecord(db, contents.get("w1"), { weaponSubtype: "smg" }, actor);
  await server.createTrapRecord(db, contents.get("t1"), { trapSubtype: "utility" }, actor);
  const s = await server.createSchematicRecord(
    db,
    contents.get("s1"),
    { weaponContentId: "w1" },
    actor,
  );
  assert.equal(s.weapon_content_id, "w1");
  await assert.rejects(
    () => server.createSchematicRecord(db, contents.get("s2"), { weaponContentId: "w1" }, actor),
    /already has a schematic/,
  );
  await assert.rejects(
    () =>
      server.createSchematicRecord(
        db,
        contents.get("s2"),
        { weaponContentId: "w1", trapContentId: "t1" },
        actor,
      ),
    /exactly one/,
  );
  await assert.rejects(
    () => server.createSchematicRecord(db, contents.get("s2"), {}, actor),
    /exactly one/,
  );
  await assert.rejects(
    () => server.createSchematicRecord(db, contents.get("s2"), { trapContentId: "w1" }, actor),
    /Trap content not found/,
  );
  const st = await server.createSchematicRecord(
    db,
    contents.get("s3"),
    { trapContentId: "t1" },
    actor,
  );
  assert.equal(st.trap_content_id, "t1");
});
test("schematic perks: ordered, deduped, bounded", async () => {
  const { db, contents } = createFakeDb();
  contents.set("w1", contentRow("w1", "weapon"));
  contents.set("s1", contentRow("s1", "schematic"));
  contents.set("p1", contentRow("p1", "perk"));
  contents.set("p2", contentRow("p2", "perk"));
  await server.createWeaponRecord(db, contents.get("w1"), {}, actor);
  await server.createSchematicRecord(db, contents.get("s1"), { weaponContentId: "w1" }, actor);
  await server.createPerkRecord(db, contents.get("p1"), { perkKey: "a" }, actor);
  await server.createPerkRecord(db, contents.get("p2"), { perkKey: "b" }, actor);
  const rows = await server.setSchematicPerks(
    db,
    "s1",
    [
      { perkContentId: "p2", slotOrder: 1 },
      { perkContentId: "p1", slotOrder: 0 },
    ],
    actor,
  );
  assert.deepEqual(
    rows.map((r) => r.perk_content_id),
    ["p1", "p2"],
  );
  await assert.rejects(
    () =>
      server.setSchematicPerks(
        db,
        "s1",
        [
          { perkContentId: "p1", slotOrder: 0 },
          { perkContentId: "p1", slotOrder: 1 },
        ],
        actor,
      ),
    /Duplicate perk/,
  );
  await assert.rejects(
    () =>
      server.setSchematicPerks(
        db,
        "s1",
        [
          { perkContentId: "p1", slotOrder: 0 },
          { perkContentId: "p2", slotOrder: 0 },
        ],
        actor,
      ),
    /Duplicate slot_order/,
  );
  await assert.rejects(
    () => server.setSchematicPerks(db, "s1", [{ perkContentId: "nope", slotOrder: 0 }], actor),
    /Perk content not found/,
  );
  const many = Array.from({ length: 13 }, () => ({ perkContentId: "p1", slotOrder: 0 }));
  await assert.rejects(() => server.setSchematicPerks(db, "s1", many, actor), /at most 12/);
  const cleared = await server.setSchematicPerks(db, "s1", [], actor);
  assert.deepEqual(cleared, []);
});
test("translations: locale-specific perk text, fallback without fabrication", async () => {
  const { db, contents } = createFakeDb();
  contents.set("w1", contentRow("w1", "weapon", "published"));
  contents.set("s1", contentRow("s1", "schematic", "published"));
  contents.set("p1", contentRow("p1", "perk", "published"));
  await server.createWeaponRecord(db, contents.get("w1"), { weaponSubtype: "shotgun" }, actor);
  await server.createPerkRecord(db, contents.get("p1"), { perkKey: "fallback-perk" }, actor);
  await server.upsertPerkTranslation(db, "p1", { locale: "en", name: "EN Perk" }, actor);
  await server.createSchematicRecord(db, contents.get("s1"), { weaponContentId: "w1" }, actor);
  await server.setSchematicPerks(db, "s1", [{ perkContentId: "p1", slotOrder: 0 }], actor);
  const detail = await server.getPublishedSchematicDetail(db, { locale: "es", slug: "unused" });
  assert.equal(detail, null);
});
test("publishing: drafts invisible, unpublished relations do not leak", async () => {
  const { db, contents, ctrans } = createFakeDb();
  contents.set("w1", contentRow("w1", "weapon", "published"));
  contents.set("s1", contentRow("s1", "schematic", "published"));
  contents.set("p1", contentRow("p1", "perk", "draft"));
  ctrans.push({
    content_id: "w1",
    locale: "en",
    title: "W",
    body: "",
    slug: "w",
    translation_status: "complete",
    seo_title: null,
    seo_description: null,
  });
  ctrans.push({
    content_id: "s1",
    locale: "en",
    title: "S",
    body: "",
    slug: "s",
    translation_status: "complete",
    seo_title: null,
    seo_description: null,
  });
  await server.createWeaponRecord(db, contents.get("w1"), { weaponSubtype: "pistol" }, actor);
  await server.createPerkRecord(db, contents.get("p1"), { perkKey: "hidden-perk" }, actor);
  await server.createSchematicRecord(db, contents.get("s1"), { weaponContentId: "w1" }, actor);
  await server.setSchematicPerks(db, "s1", [{ perkContentId: "p1", slotOrder: 0 }], actor);
  const draftWeapon = await server.getPublishedWeaponBySlug(db, { locale: "en", slug: "nope" });
  assert.equal(draftWeapon, null);
  const { results } = await db
    .prepare("SELECT * FROM schematic_perks WHERE schematic_content_id = ?")
    .bind("s1")
    .all();
  assert.equal(results.length, 1);
  const list = await server.listPublishedWeapons(db, { locale: "en" });
  assert.deepEqual(list, []);
});
test("migration 0008: inventory tables reuse foundation", async () => {
  const sql = await readFile(
    new URL("../../worker/migrations/0008_schematics_weapons_traps_perks.sql", import.meta.url),
    "utf8",
  );
  for (const t of [
    "weapon_records",
    "trap_records",
    "perk_records",
    "perk_translations",
    "schematic_records",
    "schematic_perks",
  ]) {
    assert.ok(sql.includes(`CREATE TABLE IF NOT EXISTS ${t}`), `missing ${t}`);
  }
  assert.ok(sql.includes("cms_contents"));
  assert.equal(/CREATE TABLE[^;]*cms_content_translations/.test(sql), false);
  assert.equal(/CREATE TABLE[^;]*cms_slugs/.test(sql), false);
  assert.equal(/imagekit/i.test(sql), false);
  assert.ok(sql.includes("ON DELETE CASCADE"));
  assert.ok(sql.includes("UNIQUE") || sql.includes("idx_schematic_perks"));
});
test("schematic index: 150-record catalog reaches records past the old 100-row window", async () => {
  // Regression: the old listPublicInventory paged the catalog (limit 100)
  // BEFORE filtering/sorting, so records past the first window were
  // unreachable. The index must return the COMPLETE published catalog (up to
  // the 5000 hard cap) with deterministic editorial ordering.
  const N = 150;
  const indexRows = Array.from({ length: N }, (_, i) => {
    const id = `s${String(i).padStart(3, "0")}`;
    return {
      c_id: id,
      c_entity_type: "schematic",
      c_default_locale: "en",
      c_status: "published",
      c_published_at: "2026-01-01T00:00:00.000Z",
      c_created_by: null,
      c_updated_by: null,
      c_created_at: "2026-01-01T00:00:00.000Z",
      c_updated_at: "2026-01-01T00:00:00.000Z",
      t_id: `t${id}`,
      t_content_id: id,
      t_locale: "en",
      t_title: `Schematic ${id}`,
      t_body: "",
      t_slug: `schematic-${id}`,
      t_seo_title: null,
      t_seo_description: null,
      t_seo_canonical_override: null,
      t_seo_robots: null,
      t_og_title: null,
      t_og_description: null,
      t_og_image_asset_id: null,
      t_translation_status: "complete",
      t_created_at: "2026-01-01T00:00:00.000Z",
      t_updated_at: "2026-01-01T00:00:00.000Z",
      s_content_id: id,
      s_weapon_content_id: null,
      s_trap_content_id: `trap-${id}`,
      s_popularity: N - i,
      s_sort_order: i,
      s_icon_asset_id: null,
      s_created_at: "2026-01-01T00:00:00.000Z",
      s_updated_at: "2026-01-01T00:00:00.000Z",
    };
  });
  const fakeDb = {
    prepare(sql) {
      assert.ok(sql.includes("LIMIT ?"), "index query must carry the hard-cap LIMIT");
      return {
        bind(...args) {
          return {
            all: async () => {
              // Hard cap respected: bound LIMIT equals MAX_SCHEMATIC_INDEX_ROWS.
              assert.equal(args[1], server.MAX_SCHEMATIC_INDEX_ROWS);
              assert.equal(server.MAX_SCHEMATIC_INDEX_ROWS, 5000);
              return { results: indexRows };
            },
            first: async () => null,
            run: async () => ({}),
          };
        },
      };
    },
  };
  const index = await server.listPublishedSchematicIndex(fakeDb, { locale: "en" });
  // Whole catalog returned — records 100..149 (the old dead zone) present.
  assert.equal(index.length, N);
  assert.equal(index[149].content.id, "s149");
  assert.equal(index[149].translation.slug, "schematic-s149");
  // Deterministic editorial ordering preserved end to end.
  assert.deepEqual(
    index.map((r) => r.content.id),
    indexRows.map((r) => r.c_id),
  );
  // Paginating the index the way the loader does reaches the tail page with
  // correct metadata: page 7 of 24-per-page over 150 rows.
  const PAGE = 24;
  const total = index.length;
  const pages = Math.ceil(total / PAGE);
  assert.equal(pages, 7);
  const tail = index.slice(6 * PAGE, 6 * PAGE + PAGE);
  assert.equal(tail.length, 6);
  assert.equal(tail[0].content.id, "s144");
  assert.equal(tail[5].content.id, "s149");
  // A mid-catalog search-hit slice also resolves (not just prefix matches).
  const hits = index.filter((r) => r.translation.title.includes("s14"));
  assert.ok(hits.length >= 10);
  assert.ok(hits.every((r) => Number(r.content.id.slice(1)) >= 140 - 10));
});

test("server module: no provider leakage, published-only reads", async () => {
  const src = await readFile(
    new URL("../src/lib/cms/schematics-inventory.server.ts", import.meta.url),
    "utf8",
  );
  assert.equal(/imagekit/i.test(src), false);
  assert.equal(/privateKey|PRIVATE_KEY/.test(src), false);
  assert.ok(src.includes('status !== "published"'));
  assert.ok(src.includes("getPublishedWeaponBySlug") && src.includes("listPublishedWeapons"));
  assert.ok(src.includes("getPublishedSchematicBySlug") && src.includes("listPublishedSchematics"));
  assert.ok(src.includes("SELECT delivery_url FROM media_assets"));
  const pub = await readFile(
    new URL("../src/lib/cms/public-inventory.loader.ts", import.meta.url),
    "utf8",
  );
  assert.equal(/imagekit/i.test(pub), false);
  assert.equal(/privateKey|PRIVATE_KEY|IMAGEKIT_PRIVATE|password/i.test(pub), false);
  const admin = await readFile(
    new URL("../src/lib/cms/schematics-admin.loader.ts", import.meta.url),
    "utf8",
  );
  assert.ok(/CmsAuthError|hasCapability/.test(admin));
  assert.ok(admin.includes("cms.publish"));
});
