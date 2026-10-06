// Phase 23 — Heroes reference model: migration shape + pure logic.
//
// These guard the two decisions that are expensive to reverse:
//   1. hero perks are NOT perk_records (separate namespace)
//   2. perk_key is SLOT-SCOPED, so standard/commander can never collide
import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";

const FRONTEND = new URL("../", import.meta.url);
const MIGRATIONS = new URL("../worker/migrations/", FRONTEND);
const M14 = "0014_hero_reference_model.sql";

// ---------------------------------------------------------------------------
// Migration shape
// ---------------------------------------------------------------------------

test("0014 creates the full reference model and only that", async () => {
  const sql = await readFile(new URL(M14, MIGRATIONS), "utf8");
  for (const table of [
    "hero_perk_defs",
    "hero_perk_def_translations",
    "hero_perks",
    "hero_progression",
    "resources",
    "hero_progression_costs",
    "hero_related_heroes",
    "ability_defs",
    "ability_def_translations",
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}\\b`), `missing ${table}`);
  }
  // Columns added to existing tables.
  assert.match(sql, /ALTER TABLE hero_records ADD COLUMN stw_ref_slug TEXT/);
  assert.match(sql, /ALTER TABLE hero_records ADD COLUMN summary TEXT/);
  assert.match(
    sql,
    /ALTER TABLE hero_records ADD COLUMN data_source TEXT NOT NULL DEFAULT 'editorial'/,
  );
  assert.match(sql, /ALTER TABLE hero_records ADD COLUMN data_snapshot_at TEXT/);
  assert.match(sql, /ALTER TABLE hero_abilities ADD COLUMN ability_def_id TEXT/);
});

test("0014 is additive: no executed DROP/DELETE/TRUNCATE", async () => {
  const sql = await readFile(new URL(M14, MIGRATIONS), "utf8");
  // Comments legitimately document DROP TABLE in the rollback notes.
  const executed = sql.replace(/--.*$/gm, "");
  assert.equal(/\bDROP\s+TABLE\b/i.test(executed), false, "0014 must not drop a table");
  assert.equal(/\bDELETE\s+FROM\b/i.test(executed), false, "0014 must not delete rows");
  assert.equal(/\bTRUNCATE\b/i.test(executed), false, "0014 must not truncate");
  // ALTER ... ADD COLUMN is additive; ALTER ... DROP COLUMN would not be.
  assert.equal(/ALTER\s+TABLE[\s\S]*?DROP\s+COLUMN/i.test(executed), false);
});

test("0014 leaves perk_records and cms_contents alone", async () => {
  const sql = await readFile(new URL(M14, MIGRATIONS), "utf8");
  const executed = sql.replace(/--.*$/gm, "");
  // The whole point of the design: hero perks live in their own namespace.
  assert.equal(
    /CREATE TABLE IF NOT EXISTS hero_perks[\s\S]*?FOREIGN KEY \(perk_content_id\)/i.test(executed),
    false,
  );
  assert.equal(
    /perk_content_id/.test(executed),
    false,
    "0014 must not couple heroes to perk_records",
  );
  // Abilities must not become cms_contents entities.
  assert.equal(/entity_type\s*=\s*'ability'/.test(executed), false);
  assert.equal(
    /ALTER TABLE cms_/.test(executed),
    false,
    "0014 must not alter cms_contents* tables",
  );
});

test("0014 progression + cost constraints enforce uniqueness and scope", async () => {
  const sql = await readFile(new URL(M14, MIGRATIONS), "utf8");
  // A duplicate (hero, rarity, tier) would silently drop rows on upsert.
  assert.match(sql, /UNIQUE \(hero_content_id, rarity, tier\)/);
  assert.match(sql, /UNIQUE \(hero_content_id, rarity, scope, tier, kind, resource_id\)/);
  // A NULL tier would evade the UNIQUE index in SQLite, hence the 0 sentinel.
  assert.match(
    sql,
    /CHECK \(\(scope = 'total' AND tier = 0\) OR \(scope = 'tier' AND tier >= 1\)\)/,
  );
  assert.match(sql, /CHECK \(hero_content_id != related_content_id\)/);
  assert.match(sql, /CHECK \(slot IN \('standard', 'commander'\)\)/);
});

test("0014 is the newest migration and the chain stays ordered", async () => {
  const names = (await readdir(MIGRATIONS)).filter((n) => n.endsWith(".sql")).sort();
  assert.equal(names[names.length - 1], M14);
  // 0001-0013 are immutable history.
  for (let i = 1; i <= 13; i += 1) {
    assert.match(names[i - 1], new RegExp(`^${String(i).padStart(4, "0")}_`));
  }
});

// ---------------------------------------------------------------------------
// Slot-scoped perk keys (the collision that a naive slugifier creates)
// ---------------------------------------------------------------------------

const ref = await import("../src/lib/cms/hero-reference.ts");

test("standard and commander perks never share a key", async () => {
  // These are the exact pairs that collide under a naive slugifier, because the
  // source's "+" marker is stripped by normalization.
  const pairs = [
    ["Monster Smash", "Monster Smash +"],
    ["Enduring Machine", "Enduring Machine +"],
    ["Rapid Charge", "Rapid Charge +"],
    ["Hang time", "Hang time +"],
    ["Assault Damage", "Assault Damage +"],
  ];
  for (const [std, cmd] of pairs) {
    const a = ref.heroPerkKey("standard", std);
    const b = ref.heroPerkKey("commander", cmd);
    assert.notEqual(a, b, `${a} must not equal ${b}`);
    assert.equal(
      a,
      `standard/${std.toLowerCase().replace(/\s+/g, "-")}`.replace("hang-time", "hang-time"),
    );
  }
});

test("perk key parsing round-trips and rejects garbage", () => {
  const key = ref.heroPerkKey("commander", "Quick Fingers +");
  const parsed = ref.parseHeroPerkKey(key);
  assert.equal(parsed?.slot, "commander");
  assert.equal(parsed?.slug, "quick-fingers");
  assert.equal(ref.parseHeroPerkKey("nonsense"), null);
  assert.equal(ref.parseHeroPerkKey("wrongslot/x"), null);
  assert.equal(ref.parseHeroPerkKey("/x"), null);
  assert.equal(ref.isHeroPerkKey(""), false);
});

test("facet key parsing bounds and de-duplicates", () => {
  assert.deepEqual(ref.parseFacetKeys(["a", "a", "b"]), ["a", "b"]);
  assert.deepEqual(ref.parseFacetKeys("a"), ["a"]);
  assert.deepEqual(ref.parseFacetKeys(["BAD KEY", "ok-key"]), ["ok-key"]);
  assert.deepEqual(ref.parseFacetKeys([null, 5, ""]), []);
  // Bounded so a hand-edited URL cannot widen the IN() list without limit.
  const many = Array.from({ length: 50 }, (_, i) => `k${i}`);
  assert.equal(ref.parseFacetKeys(many).length, 12);
});

test("power param is validated, never coerced", () => {
  assert.equal(ref.parsePowerParam("120"), 120);
  assert.equal(ref.parsePowerParam(0), 0);
  assert.equal(ref.parsePowerParam("-5"), null);
  assert.equal(ref.parsePowerParam("abc"), null);
  assert.equal(ref.parsePowerParam(""), null);
  assert.equal(ref.parsePowerParam(null), null);
});

test("primaryRarity picks the highest rarity that has tiers", () => {
  assert.equal(ref.primaryRarity(["uncommon", "legendary", "epic"], "epic"), "legendary");
  assert.equal(ref.primaryRarity([], "mythic"), "mythic");
  assert.equal(ref.primaryRarity([], null), null);
  // An out-of-vocabulary stored value is never invented into a real rarity.
  assert.equal(ref.primaryRarity(["bogus"], "bogus"), "bogus");
});

test("display labels are null-safe", () => {
  assert.equal(ref.powerRangeLabel(116, 144), "116-144");
  assert.equal(ref.powerRangeLabel(5, 5), "5");
  assert.equal(ref.powerRangeLabel(null, 144), "144");
  assert.equal(ref.powerRangeLabel(null, null), null);
  assert.equal(ref.levelRangeLabel(40, 60), "Lv 40-60");
  assert.equal(ref.levelRangeLabel(null, null), null);
  assert.equal(ref.sumAmounts([]), 0);
  assert.equal(ref.sumAmounts([{ amount: 3 }, { amount: 7 }]), 10);
});

// ---------------------------------------------------------------------------
// Related-hero scoring
// ---------------------------------------------------------------------------

test("scoring weights category and perk above class, and ignores power", () => {
  const self = {
    category: "assault",
    heroClass: "ninja",
    perkKeys: ["standard/medic"],
    abilityKeys: ["phase-shift"],
  };
  const sameClass = { category: "support", heroClass: "ninja", perkKeys: [], abilityKeys: [] };
  const sameCategory = { category: "assault", heroClass: "soldier", perkKeys: [], abilityKeys: [] };
  const samePerk = {
    category: null,
    heroClass: "soldier",
    perkKeys: ["standard/medic"],
    abilityKeys: [],
  };
  const sameAbility = {
    category: null,
    heroClass: "soldier",
    perkKeys: [],
    abilityKeys: ["phase-shift"],
  };
  const nothing = { category: null, heroClass: "outlander", perkKeys: [], abilityKeys: [] };

  assert.ok(ref.heroRelatedScore(self, sameCategory) > ref.heroRelatedScore(self, sameClass));
  assert.ok(ref.heroRelatedScore(self, samePerk) > ref.heroRelatedScore(self, sameAbility));
  assert.equal(ref.heroRelatedScore(self, nothing), 0);
  // power is not part of the signal type at all
  assert.equal("maxPower" in self, false);
});

test("strongestSharedDimension is deterministic on weight ties", () => {
  const self = { category: "assault", heroClass: "ninja", perkKeys: [], abilityKeys: [] };
  // category (3) and ability (2) both shared -> category must win
  const both = { category: "assault", heroClass: "outlander", perkKeys: [], abilityKeys: ["x"] };
  assert.equal(ref.strongestSharedDimension(self, both), "same_category");
  assert.equal(
    ref.strongestSharedDimension(self, {
      category: null,
      heroClass: "ninja",
      perkKeys: [],
      abilityKeys: [],
    }),
    "same_class",
  );
  assert.equal(
    ref.strongestSharedDimension(self, {
      category: null,
      heroClass: "x",
      perkKeys: [],
      abilityKeys: [],
    }),
    null,
  );
});

test("scoreRelatedGroups pins curated first and never repeats a hero", async () => {
  const srv = await import("../src/lib/cms/hero-reference.server.ts");
  const input = {
    contentId: "self",
    locale: "en",
    class: "ninja",
    category: "assault",
    perkKeys: ["standard/medic"],
    abilityKeys: ["phase-shift"],
  };
  const candidates = [
    {
      content_id: "a",
      slug: "a",
      title: "A",
      hero_class: "ninja",
      category: "assault",
      rarity: "legendary",
      image_url: null,
      perk_keys: "standard/medic",
      ability_keys: "phase-shift",
    },
    {
      content_id: "b",
      slug: "b",
      title: "B",
      hero_class: "ninja",
      category: null,
      rarity: "legendary",
      image_url: null,
      perk_keys: null,
      ability_keys: null,
    },
    {
      content_id: "curated-x",
      slug: "x",
      title: "X",
      hero_class: "soldier",
      category: null,
      rarity: "mythic",
      image_url: null,
      perk_keys: null,
      ability_keys: null,
    },
  ];
  const curated = [
    {
      contentId: "curated-x",
      slug: "x",
      title: "X",
      heroClass: "soldier",
      rarity: "mythic",
      imageUrl: null,
      standardPerkName: null,
    },
  ];
  const groups = srv.scoreRelatedGroups(input, candidates, curated);
  assert.equal(groups[0].kind, "curated");
  // A curated hero is never repeated in a similarity group.
  const seen = new Set();
  for (const g of groups) {
    for (const h of g.heroes) {
      assert.equal(seen.has(h.contentId), false, `${h.contentId} duplicated across groups`);
      seen.add(h.contentId);
    }
  }
  assert.equal(seen.has("self"), false, "the current hero is never related to itself");
  // Deterministic ordering: repeated calls agree.
  const again = srv.scoreRelatedGroups(input, candidates, curated);
  assert.deepEqual(
    groups.map((g) => [g.kind, g.heroes.map((h) => h.contentId)]),
    again.map((g) => [g.kind, g.heroes.map((h) => h.contentId)]),
  );
});

test("buildProgression folds tiers and costs, and derives max power", async () => {
  const srv = await import("../src/lib/cms/hero-reference.server.ts");
  const rows = [
    {
      hero_content_id: "h",
      rarity: "mythic",
      tier: 1,
      power_min: 12,
      power_max: 26,
      level_min: 1,
      level_max: 10,
    },
    {
      hero_content_id: "h",
      rarity: "mythic",
      tier: 2,
      power_min: 35,
      power_max: 51,
      level_min: 10,
      level_max: 20,
    },
  ];
  const costs = [
    {
      hero_content_id: "h",
      rarity: "mythic",
      scope: "tier",
      tier: 1,
      kind: "evolve",
      resource_key: "people-xp",
      display_name: "People XP",
      amount: 2500,
      icon_url: null,
    },
    {
      hero_content_id: "h",
      rarity: "mythic",
      scope: "total",
      tier: 0,
      kind: "evolve",
      resource_key: "people-xp",
      display_name: "People XP",
      amount: 32500,
      icon_url: null,
    },
  ];
  const prog = srv.buildProgression(rows, costs, "mythic");
  assert.equal(prog.rarities.length, 1);
  assert.equal(prog.rarities[0].tiers.length, 2);
  assert.equal(prog.rarities[0].tiers[0].evolve[0].amount, 2500);
  assert.equal(prog.rarities[0].tiers[1].evolve.length, 0, "top tier has no evolve cost");
  assert.equal(prog.rarities[0].total[0].amount, 32500);
  assert.equal(prog.maxPower, 51, "max power comes from the top tier");
  assert.equal(prog.tierCount, 2);
  // No rows => null, never an empty object the UI would render as broken.
  assert.equal(srv.buildProgression([], [], "legendary"), null);
});
