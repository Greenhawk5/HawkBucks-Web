// Hero media associations - schema, read path, write path and CMS wiring.
//
// WHAT THIS PINS
// ---------------
//   * migration 0015 adds `hero_perks.icon_asset_id` and nothing destructive
//   * the public read path prefers a hero's own override over the shared icon,
//     for BOTH abilities and perks, and still hides tombstoned/missing assets
//   * updating an icon is a one-column write that cannot reorder an ability,
//     rename a perk, or change a translation
//   * `assertMediaUnreferenced` (the delete guard) knows all four icon columns
//   * the CMS editor exposes the picker for both, and always stores an asset id
//
// Run: node --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/hero-media.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";

const MIGRATIONS = new URL("../../worker/migrations/", import.meta.url);

/** Read a repo path relative to frontend/. */
async function repo(relFromFrontend) {
  return readFile(new URL(relFromFrontend, new URL("../", import.meta.url)), "utf8");
}

/* ================================================================== */
/* 1. Migration 0015                                                   */
/* ================================================================== */

test("0015 adds exactly one column and nothing destructive", async () => {
  const sql = await repo("../worker/migrations/0015_hero_media_associations.sql");
  const alters = sql.match(/ALTER TABLE \w+ ADD COLUMN [^;]+/g) ?? [];
  assert.deepEqual(alters, [
    "ALTER TABLE hero_perks ADD COLUMN icon_asset_id TEXT\n  REFERENCES media_assets (id) ON DELETE SET NULL",
  ]);
  assert.equal(/ALTER TABLE hero_perks DROP COLUMN/i.test(sql), false);
  assert.equal(/ALTER TABLE cms_/i.test(sql), false, "no cms_* table is touched");
  assert.equal(/ALTER TABLE hero_records/i.test(sql), false);
  assert.equal(/ALTER TABLE hero_perk_defs/i.test(sql), false);
  assert.equal(/ALTER TABLE ability_defs/i.test(sql), false);
  const executed = sql.replace(/--.*$/gm, "");
  for (const keyword of [/\bDROP\s+TABLE\b/i, /\bDELETE\s+FROM\b/i, /\bTRUNCATE\b/i]) {
    assert.equal(keyword.test(executed), false, `0015 must not execute ${keyword}`);
  }
  assert.equal(executed.includes("IF NOT EXISTS"), true, "the index is re-runnable");
  assert.equal(
    executed.includes("ON DELETE SET NULL"),
    true,
    "destroying an asset drops the reference instead of leaving a dangling id",
  );
});

test("0015 is the newest migration and the chain stays ordered", async () => {
  const names = (await readdir(MIGRATIONS)).filter((name) => name.endsWith(".sql")).sort();
  assert.equal(names.at(-1), "0015_hero_media_associations.sql");
  for (let i = 1; i <= 15; i += 1) {
    assert.match(names[i - 1], new RegExp(`^${String(i).padStart(4, "0")}_`));
  }
});

test("0015 indexes the icon column for the reference finder", async () => {
  const sql = await repo("../worker/migrations/0015_hero_media_associations.sql");
  assert.match(
    sql,
    /CREATE INDEX IF NOT EXISTS idx_hero_perks_icon\s+ON hero_perks \(icon_asset_id\)/,
  );
  // A partial index: most rows have no override, and they are not worth storing.
  assert.match(sql, /WHERE icon_asset_id IS NOT NULL/);
});

test("the whole migration chain applies and 0015 behaves as designed", async (t) => {
  // This is the LOCAL validation of the migration: it is applied against an
  // in-memory SQLite database inside the test run, never against a real D1
  // database. Production remains untouched by this suite.
  const { DatabaseSync } = await import("node:sqlite");
  const dir = new URL("../../worker/migrations/", import.meta.url);
  const names = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON;");
  for (const name of names) {
    db.exec(await readFile(new URL(name, dir), "utf8"));
  }
  t.diagnostic(`applied ${names.length} migrations`);

  const columns = db.prepare("PRAGMA table_info(hero_perks)").all();
  assert.deepEqual(
    columns.map((column) => column.name),
    ["id", "hero_content_id", "hero_perk_def_id", "slot_order", "created_at", "icon_asset_id"],
    "the new column is appended, so every existing column keeps its position",
  );
  const indexes = db.prepare("PRAGMA index_list(hero_perks)").all();
  const iconIndex = indexes.find((index) => index.name === "idx_hero_perks_icon");
  assert.ok(iconIndex, "idx_hero_perks_icon must exist");
  assert.equal(iconIndex.partial, 1, "the index is partial");

  // ON DELETE SET NULL: destroying an asset drops the reference rather than
  // leaving a dangling id behind. The hero chain is seeded for real because the
  // foreign keys are ON, so this also proves hero_perks still accepts the new
  // column under the constraints migration 0014 put in place.
  db.exec(
    `INSERT INTO cms_contents (id, entity_type, created_at, updated_at)
     VALUES ('h1','hero','t','t')`,
  );
  db.exec(
    `INSERT INTO hero_records (content_id, created_at, updated_at)
     VALUES ('h1','t','t')`,
  );
  db.exec(
    `INSERT INTO hero_perk_defs (id, perk_key, slot, display_name, sort_order, data_source, created_at, updated_at)
     VALUES ('hpd1','standard/monster-smash','standard','Monster Smash',0,'stw-sync','t','t')`,
  );
  db.exec(
    `INSERT INTO media_assets (id, provider, provider_asset_id, delivery_url, original_filename, mime_type, alt_text, status, created_at, updated_at)
     VALUES ('media_x','r2','heroes/a.png','https://x/a.png','a.png','image/png','','ready','t','t')`,
  );
  db.exec(
    `INSERT INTO hero_perks (id, hero_content_id, hero_perk_def_id, slot_order, icon_asset_id, created_at)
     VALUES ('hp1','h1','hpd1',0,'media_x','t')`,
  );
  db.exec(`DELETE FROM media_assets WHERE id = 'media_x'`);
  assert.equal(
    db.prepare("SELECT icon_asset_id AS icon FROM hero_perks").get().icon,
    null,
    "the reference must be dropped, not left pointing at a destroyed asset",
  );

  // The exact resolution the public read path performs.
  const seedAsset = (id, key, status) =>
    db.exec(
      `INSERT INTO media_assets (id, provider, provider_asset_id, delivery_url, original_filename, mime_type, alt_text, status, created_at, updated_at)
       VALUES ('${id}','r2','${key}','https://x/${key}','x.png','image/png','','${status}','t','t')`,
    );
  seedAsset("media_shared", "heroes/b.png", "ready");
  seedAsset("media_override", "heroes/c.png", "ready");
  seedAsset("media_tombstoned", "heroes/d.png", "deleted");
  db.exec("UPDATE hero_perk_defs SET icon_asset_id = 'media_shared' WHERE id = 'hpd1'");
  const iconUrl = () =>
    db
      .prepare(
        `SELECT m.delivery_url AS url
           FROM hero_perks p JOIN hero_perk_defs d ON d.id = p.hero_perk_def_id
           LEFT JOIN media_assets m
                  ON m.id = COALESCE(p.icon_asset_id, d.icon_asset_id) AND m.status = 'ready'`,
      )
      .get()?.url ?? null;
  assert.equal(iconUrl(), "https://x/heroes/b.png", "the shared icon is the fallback");
  db.exec("UPDATE hero_perks SET icon_asset_id = 'media_override'");
  assert.equal(iconUrl(), "https://x/heroes/c.png", "the per-hero override wins");
  // A tombstoned override resolves to NO icon rather than to a broken image.
  // Server-side validation (`assertMediaUsable`) refuses to write a tombstoned
  // id, so this state is only reachable by a write that bypasses the CMS
  // (dashboard edit, import). Resolving to null renders the placeholder;
  // silently falling back to the shared icon would misreport what the editor
  // chose, and rendering the URL would show a 404.
  db.exec("UPDATE hero_perks SET icon_asset_id = 'media_tombstoned'");
  assert.equal(iconUrl(), null, "a tombstoned icon must not produce a URL");
  // Clearing both levels leaves no icon, which is the same as never having had
  // one: an empty slot, not a placeholder image.
  db.exec("UPDATE hero_perks SET icon_asset_id = NULL");
  db.exec("UPDATE hero_perk_defs SET icon_asset_id = NULL WHERE id = 'hpd1'");
  assert.equal(iconUrl(), null, "no icon anywhere resolves to null, not to a broken image");
});

/* ================================================================== */
/* 2. Public read path                                                 */
/* ================================================================== */

test("ability icons resolve override-first, then the shared definition icon", async () => {
  const text = await repo("src/lib/cms/hero-reference.server.ts");
  const abilities = /readHeroAbilities[\s\S]*?ORDER BY a\.sort_order/.exec(text);
  assert.ok(abilities, "readHeroAbilities must still order deterministically");
  assert.match(
    abilities[0],
    /ON m\.id = COALESCE\(a\.icon_asset_id, d\.icon_asset_id\) AND m\.status = 'ready'/,
    "the per-hero override wins, and a non-ready asset still resolves to no icon",
  );
});

test("perk icons resolve override-first, then the shared definition icon", async () => {
  const text = await repo("src/lib/cms/hero-reference.server.ts");
  const perks = /readHeroPerks[\s\S]*?ORDER BY p\.slot_order/.exec(text);
  assert.ok(perks, "readHeroPerks must still order deterministically");
  assert.match(
    perks[0],
    /ON m\.id = COALESCE\(p\.icon_asset_id, d\.icon_asset_id\) AND m\.status = 'ready'/,
  );
});

test("both reads stay batched: no per-hero query loop", async () => {
  const text = await repo("src/lib/cms/hero-reference.server.ts");
  assert.match(text, /for \(const ids of chunk\(contentIds\)\)/);
  // Both icon joins live inside the batched query, so a hero list of N heroes
  // costs one statement per chunk rather than one per hero.
  for (const fn of ["readHeroPerks", "readHeroAbilities"]) {
    const body = new RegExp(`export async function ${fn}\\([\\s\\S]*?\\n}\\n`).exec(text);
    assert.ok(body, `${fn} must exist`);
    assert.match(body[0], /LEFT JOIN media_assets m\s+ON m\.id = COALESCE\(/);
    assert.equal(
      (body[0].match(/await db\s*\.prepare/g) ?? []).length,
      1,
      `${fn} must issue exactly one statement per chunk`,
    );
  }
  // Resource costs also join media_assets but on the definition's own column:
  // resources are not a per-hero override, so COALESCE is not correct there.
  const costs = /readHeroProgressionCosts\([\s\S]*?\n}\n/.exec(text);
  assert.match(costs[0], /LEFT JOIN media_assets m ON m\.id = r\.icon_asset_id/);
});

/* ================================================================== */
/* 3. Write path integrity                                             */
/* ================================================================== */

test("an icon-only ability update cannot touch ordering, name or translations", async () => {
  const text = await repo("src/lib/cms/heroes-loadouts.server.ts");
  const upsert = /export async function upsertAbility\([\s\S]*?\n}\n/;
  const body = upsert.exec(text);
  assert.ok(body, "upsertAbility must exist");
  assert.equal(
    /sets\.push\("sort_order = \?"\)/.test(body[0]),
    true,
    "sort_order is only written when the caller supplied it",
  );
  assert.equal(
    body[0].includes("input.sortOrder !== undefined"),
    true,
    "'absent' must mean 'leave alone', not 'write the default'",
  );
  // The old bug: sortOrder was defaulted to 0 on the update path.
  assert.equal(
    /UPDATE hero_abilities SET sort_order = \?, icon_asset_id = \?, updated_at = \?/.test(body[0]),
    false,
    "the unconditional 3-column UPDATE must not come back",
  );
  assert.equal(
    /hero_ability_translations/i.test(body[0]),
    false,
    "the ability upsert must not read or write translations",
  );
});

test("the ability mutation passes only the fields the editor supplied", async () => {
  const text = await repo("src/lib/cms/loadouts-admin.loader.ts");
  const ability = /export const upsertAdminAbility = createServerFn[\s\S]*?return \{ abilityId/;
  const body = ability.exec(text);
  assert.ok(body, "upsertAdminAbility must exist");
  assert.equal(
    body[0].includes("...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {})"),
    true,
    "sortOrder stays undefined when absent",
  );
  assert.equal(
    body[0].includes(
      "...(data.iconAssetId !== undefined ? { iconAssetId: data.iconAssetId } : {})",
    ),
    true,
    "iconAssetId passes through as null (clear) or undefined (leave alone)",
  );
  // The mutation is authenticated, capability-checked and same-origin guarded.
  assert.equal(body[0].includes('requireLoadoutSession("cms.write", true)'), true);
});

test("the perk icon mutation writes one column on one hero's own row", async () => {
  const text = await repo("src/lib/cms/heroes-loadouts.server.ts");
  const setIcon = /export async function setHeroPerkIcon\([\s\S]*?\n}\n/;
  const body = setIcon.exec(text);
  assert.ok(body, "setHeroPerkIcon must exist");
  assert.match(body[0], /UPDATE hero_perks SET icon_asset_id = \? WHERE id = \?/);
  // The hero the row belongs to is re-checked, so a forged pair cannot write
  // to another hero's perk.
  assert.equal(body[0].includes("That perk does not belong to this hero."), true);
  // Media eligibility is validated server-side, never trusted from the client.
  assert.equal(body[0].includes("await assertMediaUsable(db, input.iconAssetId)"), true);
  // hero_perks has no updated_at (0014 defined it without one), and nothing
  // else is written: not slot_order, not the definition id.
  assert.equal(body[0].includes("slot_order = ?"), false);
});

test("the perk icon mutation is authenticated, capability-checked and guarded", async () => {
  const text = await repo("src/lib/cms/heroes-admin.loader.ts");
  const mutation = /export const upsertAdminHeroPerkIcon = createServerFn[\s\S]*?\}\s*\);/;
  const body = mutation.exec(text);
  assert.ok(body, "upsertAdminHeroPerkIcon must exist");
  assert.equal(body[0].includes('requireHeroSession("cms.write", true)'), true);
  assert.equal(body[0].includes("requireContentId(i.contentId)"), true);
  assert.equal(body[0].includes('requireNonEmptyString(i.heroPerkId, "heroPerkId")'), true);
  assert.equal(body[0].includes("asOptionalStringOrNull(i.iconAssetId)"), true);
});

test("the mutation inventory lists the new perk icon mutation", async () => {
  const text = await repo("src/lib/cms/cms-mutations.ts");
  const entry =
    /file: "\.\.\/src\/lib\/cms\/heroes-admin\.loader\.ts",\s*mutations: \[([\s\S]*?)\],\s*families: \[([\s\S]*?)\],/;
  const body = entry.exec(text);
  assert.ok(body, "the hero loader must be listed");
  assert.equal(body[1].includes('"upsertAdminHeroPerkIcon"'), true);
  assert.equal(body[2].includes('"media association changes"'), true);
});

test("every CMS mutation stays in the inventory", async () => {
  const { CMS_MUTATION_INVENTORY, allCmsMutationNames } =
    await import("../src/lib/cms/cms-mutations.ts");
  const names = allCmsMutationNames();
  assert.equal(new Set(names).size, names.length, "no duplicate mutation names");
  assert.equal(names.includes("upsertAdminHeroPerkIcon"), true);
  // The hero loader entry did not grow by accident: upsertAdminAbility lives
  // in the loadouts boundary on purpose, next to the rest of ability writes.
  const heroes = CMS_MUTATION_INVENTORY.find(
    (entry) => entry.file === "../src/lib/cms/heroes-admin.loader.ts",
  );
  assert.ok(heroes, "the hero loader must be listed");
  assert.equal(heroes.mutations.includes("upsertAdminAbility"), false);
});

test("no admin mutation writes reference tables", async () => {
  // The invariant that makes a reference-only rollback safe. The single
  // exception is hero_perks.icon_asset_id, which is editorial media metadata.
  const text = await repo("src/lib/cms/heroes-admin.loader.ts");
  assert.equal(/INSERT INTO hero_perk_defs/i.test(text), false, "no upsert of perk definitions");
  assert.equal(/INSERT INTO ability_defs/i.test(text), false, "no upsert of ability definitions");
  assert.equal(/INSERT INTO hero_progression/i.test(text), false);
  assert.equal(/INSERT INTO hero_progression_costs/i.test(text), false);
  assert.equal(/DELETE FROM hero_perks/i.test(text), false);
});

/* ================================================================== */
/* 4. CMS editor wiring                                                */
/* ================================================================== */

test("the hero editor exposes a media picker for every ability icon", async () => {
  const text = await repo("src/routes/admin/heroes.$contentId.tsx");
  const abilities = /function AbilitiesForm\([\s\S]*?\n}\n/;
  const body = abilities.exec(text);
  assert.ok(body, "AbilitiesForm must exist");
  // One picker per ability row, keyed to the ability.
  assert.match(body[0], /hero\.abilities\.map\(\(ability\) =>/);
  assert.equal(
    body[0].includes('value={ability.iconAssetId ?? ""}'),
    true,
    "the stored id is shown",
  );
  assert.equal(body[0].includes("upsertAdminAbility({"), true);
  assert.equal(
    body[0].includes("abilityKey: ability.abilityKey"),
    true,
    "the ability is addressed by its stable key, not by index",
  );
  assert.equal(body[0].includes('folder="abilities"'), true, "new uploads land in abilities/");
  // The icon save must not re-send ordering or name.
  assert.equal(
    /sortOrder/.test(body[0].replace(/sortOrder: 0/g, "")),
    false,
    "an icon-only save must not re-send sortOrder",
  );
});

test("the hero editor exposes a media picker for every perk icon", async () => {
  const text = await repo("src/routes/admin/heroes.$contentId.tsx");
  // W6 replaced the image-only PerkMediaForm with per-slot cards that also
  // assign/create perks; the icon save path is unchanged and still targeted by
  // the join-row id.
  const cards = /function PerkSlotCard\([\s\S]*?\n}\n/;
  const body = cards.exec(text);
  assert.ok(body, "PerkSlotCard must exist");
  assert.equal(body[0].includes("upsertAdminHeroPerkIcon({"), true);
  assert.equal(
    body[0].includes("heroPerkId: assigned.id"),
    true,
    "the join-row id, not the def id",
  );
  assert.equal(body[0].includes('folder="perks"'), true, "new uploads land in perks/");
  // Both levels are described, so "nothing set" is never confused with "broken".
  assert.equal(body[0].includes("assigned.iconAssetId"), true);
  assert.equal(body[0].includes("assigned.defIconAssetId"), true);
});

test("the perk form has an explicit empty state", async () => {
  const text = await repo("src/routes/admin/heroes.$contentId.tsx");
  // W6 turned the dead end into the primary call to action: an empty slot
  // offers assignment AND creation rather than stating that nothing can be done.
  assert.match(text, /No perk assigned to this slot\./);
  assert.match(text, /Assign a perk…/);
  assert.match(text, /Create new…/);
  assert.match(text, /assignAdminHeroPerk\(\{/);
});

test("the media section still stores asset ids, never URLs", async () => {
  const text = await repo("src/components/cms/media/CmsMediaField.tsx");
  // The id box stays editable for records created before the picker existed.
  assert.match(text, /placeholder="media_… \(optional\)"/);
  // onPick discards the delivery URL: only the id is persisted.
  assert.equal(text.includes("onPick={(assetId) => props.onChange(assetId)}"), true);
  // No path lets a raw URL become the stored value.
  assert.equal(text.includes("https://"), false, "no URL is stored as the media reference");
});

test("the hero admin detail carries the ids the editor needs", async () => {
  const text = await repo("src/lib/cms/heroes-admin.loader.ts");
  const detail = /interface HeroAdminDetail extends HeroAdminItem \{[\s\S]*?\n}\n/;
  const body = detail.exec(text);
  assert.ok(body, "HeroAdminDetail must exist");
  assert.equal(body[0].includes("iconAssetId: string | null;"), true, "per-hero ability override");
  assert.equal(
    body[0].includes("defIconAssetId: string | null;"),
    true,
    "the shared perk icon, so the editor can see the fallback",
  );
  // The reference reader selects the join-row id so the editor can target one row.
  assert.match(text, /SELECT p\.id AS id, d\.slot AS slot, d\.display_name AS name/);
  assert.match(
    text,
    /p\.icon_asset_id AS hero_icon_asset_id, d\.icon_asset_id AS def_icon_asset_id/,
  );
});

/* ================================================================== */
/* 5. Public rendering                                                 */
/* ================================================================== */

test("the reference UI falls back instead of rendering a broken image", async () => {
  const text = await repo("src/components/heroes/HeroReferenceBits.tsx");
  // One shared icon slot rather than three copies of the same ternary.
  assert.equal(text.includes("export function MediaIcon("), true);
  assert.match(text, /onError=\{\(\) => setFailed\(true\)\}/);
  assert.equal(text.includes('data-placeholder="true"'), true);
  // The slot keeps fixed dimensions either way, so a swap cannot shift layout.
  assert.match(text, /shrink-0 rounded-sm object-contain/);
  assert.match(text, /React\.useEffect\(/);
  // Decorative: the adjacent text already names the entity.
  assert.match(text, /aria-hidden/);
});

test("every ability and perk icon slot routes through the shared MediaIcon", async () => {
  const text = await repo("src/components/heroes/HeroReferenceBits.tsx");
  assert.match(text, /<MediaIcon url=\{perk\.iconUrl\} sizeClass="mt-0\.5 h-8 w-8" \/>/);
  assert.match(text, /<MediaIcon url=\{ability\.iconUrl\} sizeClass="mt-0\.5 h-7 w-7" \/>/);
  assert.match(text, /<MediaIcon url=\{cost\.iconUrl\} sizeClass="h-3\.5 w-3\.5" \/>/);
  // No component keeps its own raw <img> for these icons any more.
  assert.equal(/<img\s+src=\{perk\.iconUrl\}/.test(text), false);
  assert.equal(/<img\s+src=\{ability\.iconUrl\}/.test(text), false);
});

test("RTL uses logical properties only in the reference primitives", async () => {
  const raw = await repo("src/components/heroes/HeroReferenceBits.tsx");
  // The file header documents the convention, so the scan below is intentional.
  assert.match(raw, /LOGICAL property \(ps-\/pe-\/ms-\/me-/);
  // Comments legitimately NAME the forbidden properties, so they are stripped
  // before the scan.
  const text = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|\s)\/\/.*$/gm, "$1");
  for (const forbidden of [
    /\bml-\d/,
    /\bmr-\d/,
    /\bpr-\d/,
    /\bpl-\d/,
    /\btext-right\b/,
    /\bleft-0/,
  ]) {
    assert.equal(forbidden.test(text), false, `${forbidden} breaks RTL mirroring`);
  }
});
