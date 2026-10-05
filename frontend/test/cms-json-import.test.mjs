// Wave 1 — CMS JSON object import: validation, templates, and atomicity.
//
// WHY THE SPLIT
// -------------
// `src/lib/cms/import-schemas.ts` is PURE logic (no framework, no server
// imports), so every schema assertion below drives the REAL exported functions
// and checks the real messages. That is the part that has to be trustworthy —
// the whole feature rests on "a bad file creates nothing".
//
// The React wiring and the server-function handler cannot run under Node
// type-stripping (this repo has no jsdom / testing-library — see the note in
// test/cms-media-library.test.mjs), so those are asserted as SOURCE CONTRACTS
// in section 3: they check that the handler calls the real service, that the
// rollback is wired, and that no bypass of the shared create path was
// introduced.
//
// Run: node --experimental-test-module-mocks
//        --import ./test/ts-path-alias-loader.mjs
//        --experimental-strip-types --test test/cms-json-import.test.mjs
import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const {
  IMPORT_DOCUMENT_VERSION,
  IMPORT_ENTITY_KINDS,
  MAX_IMPORT_ITEMS,
  buildBulkImportTemplate,
  buildSingleImportTemplate,
  describeImportFields,
  formatImportIssue,
  importFieldsFor,
  parseImportDocument,
} = await import("../src/lib/cms/import-schemas.ts");

const file = (p) => readFile(new URL(p, import.meta.url), "utf8");

/** Import as `kind`, returning the normalised result for readable assertions. */
function run(text, kind = "hero") {
  const result = parseImportDocument(text, kind);
  if (result.ok) return { ok: true, items: result.document.items, issues: [] };
  return {
    ok: false,
    items: [],
    parseError: result.parseError,
    issues: result.issues.map(formatImportIssue),
  };
}

const HERO_OK = { heroClass: "soldier", title: "Riftbreaker" };
const doc = (items, type = "hero") =>
  JSON.stringify({ version: IMPORT_DOCUMENT_VERSION, type, items });
const errorsOf = (result) => result.issues;

/* ================================================================== */
/* 1. Single object — valid and every rejection class                  */
/* ================================================================== */

test("single: a minimal valid hero yields exactly one validated item", () => {
  const result = run(JSON.stringify(HERO_OK));
  assert.equal(result.ok, true);
  assert.equal(result.items.length, 1);
  const item = result.items[0].item;
  assert.equal(item.heroClass, "soldier");
  assert.equal(item.title, "Riftbreaker");
  // Defaults are applied so an imported draft matches one made through the form.
  assert.equal(item.locale, "en");
  assert.equal(item.body, "");
  assert.equal(item.popularity, 0);
  assert.equal(item.sortOrder, 0);
  assert.equal(item.portraitAssetId, null);
  assert.equal(item.bannerAssetId, null);
  assert.equal(item.slug, null);
});

test("single: a fully populated hero round-trips every field", () => {
  const result = run(
    JSON.stringify({
      heroClass: "ninja",
      title: "  Ninja Main  ",
      category: "recon",
      rarity: "legendary",
      popularity: 42,
      sortOrder: -3,
      portraitAssetId: " media_abc123 ",
      bannerAssetId: "media_def456",
      locale: "fr",
      body: "Body copy.",
      slug: "ninja-main",
      seoTitle: "Ninja Main | HawkBucks",
      seoDescription: "Desc",
    }),
  );
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  const item = result.items[0].item;
  assert.equal(item.title, "Ninja Main", "title is trimmed like requireTitle does");
  assert.equal(item.portraitAssetId, "media_abc123", "media ids are trimmed");
  assert.equal(item.bannerAssetId, "media_def456");
  assert.equal(item.locale, "fr");
  assert.equal(item.popularity, 42);
  assert.equal(item.sortOrder, -3, "negative sortOrder is legal");
  assert.equal(item.seoTitle, "Ninja Main | HawkBucks");
});

test("single: malformed JSON is a PARSER error, never a field issue", () => {
  const result = run("{ not json");
  assert.equal(result.ok, false);
  assert.match(result.parseError, /^Malformed JSON: /);
  assert.deepEqual(result.issues, [], "a parser failure has no item to attribute a field error to");
});

test("single: a non-object root is a parser error", () => {
  for (const [text, label] of [
    ["[]", "array"],
    ['"hello"', "string"],
    ["42", "number"],
    ["null", "null"],
  ]) {
    const result = run(text);
    assert.equal(result.ok, false, label);
    assert.match(result.parseError, /Expected a JSON object at the document root/, label);
  }
});

test("single: missing required field is reported per field", () => {
  const noTitle = run(JSON.stringify({ heroClass: "soldier" }));
  assert.equal(noTitle.ok, false);
  assert.deepEqual(errorsOf(noTitle), ["Item 1 → title: required field is missing"]);

  const noClass = run(JSON.stringify({ title: "Riftbreaker" }));
  assert.deepEqual(errorsOf(noClass), ["Item 1 → heroClass: required field is missing"]);

  // A blank title is "missing", not "invalid" — same as requireTitle.
  const blank = run(JSON.stringify({ heroClass: "soldier", title: "   " }));
  assert.deepEqual(errorsOf(blank), ["Item 1 → title: required field is missing"]);
});

test("single: wrong field type is reported per field", () => {
  const result = run(
    JSON.stringify({ heroClass: "soldier", title: "X", popularity: "10", body: 5 }),
  );
  assert.equal(result.ok, false);
  assert.deepEqual(errorsOf(result), [
    "Item 1 → popularity: expected a finite number",
    "Item 1 → body: expected a string or null",
  ]);
});

test("single: an invalid enum value lists the allowed values", () => {
  const rarity = run(JSON.stringify({ ...HERO_OK, rarity: "bogus" }));
  assert.deepEqual(errorsOf(rarity), [
    'Item 1 → rarity: expected one of ["common","uncommon","rare","epic","legendary","mythic"]',
  ]);

  const cls = run(JSON.stringify({ ...HERO_OK, heroClass: "commando" }));
  assert.deepEqual(errorsOf(cls), [
    'Item 1 → heroClass: expected one of ["soldier","constructor","ninja","outlander"]',
  ]);

  const category = run(JSON.stringify({ ...HERO_OK, category: "healer" }));
  assert.deepEqual(errorsOf(category), [
    'Item 1 → category: expected one of ["assault","support","recon","defense","special"]',
  ]);

  const locale = run(JSON.stringify({ ...HERO_OK, locale: "kl" }));
  assert.deepEqual(errorsOf(locale), [
    'Item 1 → locale: expected one of ["en","es","fr","ru","de","pt","zh","ar-SA","fa-IR"]',
  ]);
});

test("single: an unexpected field is rejected and a typo is suggested", () => {
  const unknown = run(JSON.stringify({ ...HERO_OK, portrait_asset_id: "media_x" }));
  assert.deepEqual(errorsOf(unknown), [
    "Item 1 → portrait_asset_id: unexpected field (not part of this schema)",
  ]);

  // snake_case is the DB column name, so a mistyped-but-close key gets a fix.
  const typo = run(JSON.stringify({ ...HERO_OK, portraitassetid: "media_x" }));
  assert.deepEqual(errorsOf(typo), [
    'Item 1 → portraitassetid: unexpected field; did you mean "portraitAssetId"?',
  ]);
});

test("single: a media field that is not an id shape is rejected", () => {
  const url = run(JSON.stringify({ ...HERO_OK, portraitAssetId: "https://example.com/a.png" }));
  assert.equal(url.ok, false);
  assert.match(errorsOf(url)[0], /^Item 1 → portraitAssetId: expected a Media Asset id/);

  const number = run(JSON.stringify({ ...HERO_OK, bannerAssetId: 7 }));
  assert.deepEqual(errorsOf(number), [
    'Item 1 → bannerAssetId: expected a Media Asset id string (e.g. "media_…"), or null',
  ]);

  // null and "" are legitimate: every media column is nullable.
  const blank = run(JSON.stringify({ ...HERO_OK, portraitAssetId: null, bannerAssetId: "" }));
  assert.equal(blank.ok, true, "null / empty media means 'no media', not an error");
});

test("single: out-of-range numbers are rejected with the actual bound", () => {
  const popularity = run(JSON.stringify({ ...HERO_OK, popularity: -1 }));
  assert.deepEqual(errorsOf(popularity), [
    "Item 1 → popularity: must be an integer between 0 and 1000000",
  ]);

  const sortOrder = run(JSON.stringify({ ...HERO_OK, sortOrder: 9999999 }));
  assert.deepEqual(errorsOf(sortOrder), [
    "Item 1 → sortOrder: must be an integer between -1000000 and 1000000",
  ]);

  const fractional = run(JSON.stringify({ ...HERO_OK, popularity: 1.5 }));
  assert.deepEqual(errorsOf(fractional), ["Item 1 → popularity: expected an integer"]);
});

test("enum values are normalised EXACTLY as the editor normalises them", () => {
  // `validateHeroInput` does String(rarity).trim().toLowerCase() then isRarity,
  // and normalizeHeroCategory lower-cases. If the importer tested membership on
  // the raw string it would REJECT records the editor happily creates — the two
  // paths must not disagree.
  const rarity = run(JSON.stringify({ ...HERO_OK, rarity: "  RARE  " }));
  assert.equal(rarity.ok, true, "capitalised rarity must be accepted and stored lower-cased");
  assert.equal(rarity.items[0].item.rarity, "rare");

  const category = run(JSON.stringify({ ...HERO_OK, category: "Assault" }));
  assert.equal(category.ok, true, "capitalised category must be accepted");
  assert.equal(category.items[0].item.category, "assault");

  // Genuinely wrong values are still rejected after normalisation.
  const bad = run(JSON.stringify({ ...HERO_OK, rarity: "  RAWRY  " }));
  assert.equal(bad.ok, false);

  // heroClass and locale are EXACT-match in the editor (isHeroClass /
  // isCmsContentLocale do not normalise), so the importer must not either.
  assert.equal(run(JSON.stringify({ ...HERO_OK, heroClass: "Soldier" })).ok, false);
  assert.equal(run(JSON.stringify({ ...HERO_OK, locale: "EN" })).ok, false);
});

test("single: an over-long title is rejected rather than silently truncated", () => {
  const result = run(JSON.stringify({ ...HERO_OK, title: "x".repeat(201) }));
  assert.deepEqual(errorsOf(result), ["Item 1 → title: must be at most 200 characters"]);
});

/* ================================================================== */
/* 2. Bulk                                                             */
/* ================================================================== */

test("bulk: a valid 1-item file creates exactly one item", () => {
  const result = run(doc([HERO_OK]));
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.equal(result.items.length, 1);
});

test("bulk: a valid 5-item file preserves the original item order", () => {
  const items = [
    { heroClass: "soldier", title: "One" },
    { heroClass: "ninja", title: "Two" },
    { heroClass: "outlander", title: "Three" },
    { heroClass: "constructor", title: "Four" },
    { heroClass: "soldier", title: "Five" },
  ];
  const result = run(doc(items));
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.deepEqual(
    result.items.map((i) => i.item.title),
    ["One", "Two", "Three", "Four", "Five"],
    "item order must match the file, not be sorted or de-duplicated",
  );
});

test("bulk: an invalid item in the middle does NOT create the surrounding items", () => {
  const items = [
    { heroClass: "soldier", title: "One" },
    { heroClass: "ninja", title: "Two" },
    { heroClass: "sniper", title: "Three" }, // invalid class
    { heroClass: "outlander", title: "Four" },
    { heroClass: "soldier", title: "Five" },
  ];
  const result = run(doc(items));
  assert.equal(result.ok, false, "a batch with one bad item must not report success");
  assert.deepEqual(errorsOf(result), [
    'Item 3 → heroClass: expected one of ["soldier","constructor","ninja","outlander"]',
  ]);
  // The pure validator returns nothing usable to the writer when issues exist;
  // the handler short-circuits on errors.length > 0 before any create call.
  assert.equal(
    result.items.length,
    0,
    "the handler must not create anything when issues exist (asserted in section 3)",
  );
});

/**
 * Assert the exact SET of reported errors.
 *
 * Order is deliberately NOT the contract — the contract is that EVERY error is
 * reported and each one names the item and field that is wrong. Comparing as a
 * set keeps these assertions from breaking when field-validation order is
 * reordered (a presentational change, not a correctness one).
 */
function assertErrorSet(actual, expected) {
  assert.deepEqual([...actual].sort(), [...expected].sort());
}

test("bulk: ALL validation errors are collected, not just the first", () => {
  const items = [
    { heroClass: "soldier", title: "One", rarity: "bogus" },
    { heroClass: "nope", title: "" },
    { heroClass: "ninja", title: "Three", popularity: -5, body: 12 },
  ];
  const result = run(doc(items));
  assert.equal(result.ok, false);
  assertErrorSet(errorsOf(result), [
    'Item 1 → rarity: expected one of ["common","uncommon","rare","epic","legendary","mythic"]',
    'Item 2 → heroClass: expected one of ["soldier","constructor","ninja","outlander"]',
    "Item 2 → title: required field is missing",
    "Item 3 → popularity: must be an integer between 0 and 1000000",
    "Item 3 → body: expected a string or null",
  ]);
});

test("bulk: an empty items array is rejected", () => {
  const result = run(doc([]));
  assert.equal(result.ok, false);
  assert.deepEqual(errorsOf(result), ["items: must contain at least one item"]);
});

test("bulk: an oversized batch is rejected before any item is validated", () => {
  const items = Array.from({ length: MAX_IMPORT_ITEMS + 1 }, (_, i) => ({
    heroClass: "soldier",
    title: `Hero ${i}`,
  }));
  const result = run(doc(items));
  assert.equal(result.ok, false);
  assert.deepEqual(errorsOf(result), [
    `items: contains ${MAX_IMPORT_ITEMS + 1} items; the maximum is ${MAX_IMPORT_ITEMS}`,
  ]);
});

test("bulk: the envelope is validated (version, type, unknown keys)", () => {
  const wrongVersion = run(JSON.stringify({ version: 99, type: "hero", items: [HERO_OK] }));
  assert.deepEqual(errorsOf(wrongVersion), [
    `version: unsupported document version 99; this CMS accepts version ${IMPORT_DOCUMENT_VERSION}`,
  ]);

  const wrongType = run(JSON.stringify({ version: 1, type: "loadout", items: [HERO_OK] }));
  assert.deepEqual(errorsOf(wrongType), ['type: expected one of ["hero","schematic"]']);

  // Importing a hero file into the schematics section is a section mismatch.
  // It is reported as such AND the per-item errors still come back, so the
  // administrator learns everything that is wrong in one pass.
  const mismatch = run(JSON.stringify({ version: 1, type: "hero", items: [HERO_OK] }), "schematic");
  assertErrorSet(errorsOf(mismatch), [
    'type: this file declares "hero" but is being imported as "schematic"',
    "Item 1 → heroClass: unexpected field (not part of this schema)",
    'Item 1 → weaponContentId / trapContentId: expected exactly one of "weaponContentId" or "trapContentId"',
  ]);

  const missingType = run(JSON.stringify({ version: 1, items: [HERO_OK] }));
  assert.deepEqual(errorsOf(missingType), [
    'type: required field is missing (expected ["hero","schematic"])',
  ]);

  const extraKey = run(
    JSON.stringify({ version: 1, type: "hero", items: [HERO_OK], mode: "upsert" }),
  );
  assert.deepEqual(errorsOf(extraKey), ["mode: unexpected envelope field"]);
});

test("bulk: duplicate titles are allowed — slug collisions are resolved, not rejected", () => {
  // Two items with the same title are legitimate. `upsertContentTranslation`
  // resolves the collision; the importer reports the RESOLVED slug (asserted on
  // the handler contract in section 3).
  const items = [
    { heroClass: "soldier", title: "Duplicate" },
    { heroClass: "ninja", title: "Duplicate" },
  ];
  const result = run(doc(items));
  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.equal(result.items.length, 2, "duplicates are two independent items");
});

/* ================================================================== */
/* Schematics                                                          */
/* ================================================================== */

test("schematic: exactly one of weaponContentId / trapContentId is required", () => {
  const neither = run(JSON.stringify({ title: "S" }), "schematic");
  assert.deepEqual(errorsOf(neither), [
    'Item 1 → weaponContentId / trapContentId: expected exactly one of "weaponContentId" or "trapContentId"',
  ]);

  const both = run(
    JSON.stringify({ title: "S", weaponContentId: "cms_a", trapContentId: "cms_b" }),
    "schematic",
  );
  assert.deepEqual(errorsOf(both), [
    'Item 1 → weaponContentId / trapContentId: expected exactly one of "weaponContentId" or "trapContentId"',
  ]);

  const weapon = run(JSON.stringify({ title: "S", weaponContentId: "cms_weapon1" }), "schematic");
  assert.equal(weapon.ok, true, JSON.stringify(weapon.issues));
  assert.equal(weapon.items[0].item.weaponContentId, "cms_weapon1");
  assert.equal(weapon.items[0].item.trapContentId, null);
});

/* ================================================================== */
/* 3. Templates                                                        */
/* ================================================================== */

test("templates: every shipped template is itself a VALID import document", () => {
  for (const kind of IMPORT_ENTITY_KINDS) {
    const single = run(buildSingleImportTemplate(kind), kind);
    assert.equal(single.ok, true, `${kind} single template must validate`);
    assert.equal(single.items.length, 1);

    const bulk = run(buildBulkImportTemplate(kind), kind);
    assert.equal(bulk.ok, true, `${kind} bulk template must validate: ${bulk.issues}`);
    assert.equal(bulk.items.length, 2);
  }
});

test("templates: bulk items never collide on a schematic target", () => {
  // The bulk schematic template ships two items. If both carried the same
  // weaponContentId the template would be rejected by its own validator (a
  // schematic claims its weapon exclusively), so the placeholders must differ.
  const parsed = JSON.parse(buildBulkImportTemplate("schematic"));
  const targets = parsed.items.map((i) => i.weaponContentId ?? i.trapContentId);
  assert.equal(new Set(targets).size, targets.length, "each sample item needs its own target");
});

test("templates: single is the bare object, bulk is the versioned envelope", () => {
  const single = JSON.parse(buildSingleImportTemplate("hero"));
  assert.equal(single.items, undefined, "single template must not be wrapped in an envelope");

  const bulk = JSON.parse(buildBulkImportTemplate("hero"));
  assert.equal(bulk.version, IMPORT_DOCUMENT_VERSION);
  assert.equal(bulk.type, "hero");
  assert.ok(Array.isArray(bulk.items));
});

test("templates: field keys match the real server-function parameters", () => {
  // The template must describe the same vocabulary the create loaders accept,
  // or an administrator would author a file the server rejects. These are the
  // exact parameter names of createAdminHero / createAdminSchematic.
  const heroFields = new Set(describeImportFields("hero").map((f) => f.key));
  for (const key of [
    "heroClass",
    "title",
    "category",
    "rarity",
    "popularity",
    "sortOrder",
    "portraitAssetId",
    "bannerAssetId",
    "locale",
    "body",
    "slug",
    "seoTitle",
    "seoDescription",
  ]) {
    assert.ok(heroFields.has(key), `hero import schema is missing ${key}`);
  }

  const schematicFields = new Set(describeImportFields("schematic").map((f) => f.key));
  for (const key of [
    "title",
    "weaponContentId",
    "trapContentId",
    "popularity",
    "sortOrder",
    "iconAssetId",
    "locale",
    "body",
    "slug",
  ]) {
    assert.ok(schematicFields.has(key), `schematic import schema is missing ${key}`);
  }
});

test("templates: field specs describe enums with their real values", () => {
  const rarity = importFieldsFor("hero").find((f) => f.key === "rarity");
  assert.deepEqual(rarity.values, ["common", "uncommon", "rare", "epic", "legendary", "mythic"]);
  const heroClass = importFieldsFor("hero").find((f) => f.key === "heroClass");
  assert.deepEqual(heroClass.values, ["soldier", "constructor", "ninja", "outlander"]);
});

/* ================================================================== */
/* 4. Handler + rollback contracts (source-level)                     */
/* ================================================================== */

const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const loaderSource = stripComments(await file("../src/lib/cms/import-admin.loader.ts"));
const createSource = stripComments(await file("../src/lib/cms/content-create.server.ts"));
const heroesLoaderSource = stripComments(await file("../src/lib/cms/heroes-admin.loader.ts"));
const schematicsLoaderSource = stripComments(
  await file("../src/lib/cms/schematics-admin.loader.ts"),
);

test("the importer converges on the SAME create service as the normal form", () => {
  // The core architectural requirement: there is no second create path.
  assert.match(
    loaderSource,
    /import\("\.\/content-create\.server"\)/,
    "the importer must call the shared create service",
  );
  assert.match(loaderSource, /createDraftFromImportItem/);

  // ...and the normal create server functions call that same service.
  assert.match(heroesLoaderSource, /import\("\.\/content-create\.server"\)/);
  assert.match(heroesLoaderSource, /createHeroDraft/);
  assert.match(schematicsLoaderSource, /import\("\.\/content-create\.server"\)/);
  assert.match(schematicsLoaderSource, /createSchematicDraft/);

  // No direct record-table writes in either loader: the rules live in services.
  for (const [name, src] of [
    ["import-admin.loader.ts", loaderSource],
    ["heroes-admin.loader.ts", heroesLoaderSource],
    ["schematics-admin.loader.ts", schematicsLoaderSource],
  ]) {
    assert.doesNotMatch(
      src,
      /INSERT INTO (hero_records|schematic_records|weapon_records|trap_records|perk_records)/,
      `${name} must not write entity tables directly — go through the service layer`,
    );
  }
});

test("no drafts are created when validation reports any issue", () => {
  // The short-circuit must come BEFORE the creation loop.
  const guardIndex = loaderSource.indexOf("if (errors.length > 0) {");
  const createIndex = loaderSource.indexOf("createDraftFromImportItem(db, actor, entry)");
  assert.ok(guardIndex > -1, "the handler has an errors short-circuit");
  assert.ok(createIndex > -1, "the handler creates drafts");
  assert.ok(
    guardIndex < createIndex,
    "every validation error must be reported before a single draft is created",
  );
  assert.match(
    loaderSource.slice(guardIndex, guardIndex + 220),
    /return failure\(kind, errors, null\)/,
    "the short-circuit returns zero created items",
  );
});

test("a mid-write failure rolls back EVERY draft the import created", () => {
  // Track-then-create, and compensate on failure — the A1 contract.
  assert.match(
    loaderSource,
    /rollbackRefs\.push\(\{ entityType: entry\.kind, contentId: result\.contentId \}\)/,
  );
  assert.match(
    loaderSource,
    /const report = await rollbackCreatedDrafts\(db, rollbackRefs, actor\)/,
  );
  assert.match(
    loaderSource,
    /the whole import was rolled back/,
    "the failure message must state that the import was rolled back",
  );
  assert.match(
    loaderSource,
    /Manual cleanup required/,
    "a rollback that itself fails must be surfaced, never hidden",
  );
});

test("rollback deletes every descendant row, not just the content row", () => {
  const rollback = createSource.slice(createSource.indexOf("async function deleteDraftRows"));
  // These are the tables the create path populates, per the migration FK map.
  for (const sql of [
    "DELETE FROM hero_ability_translations WHERE ability_id IN (SELECT id FROM hero_abilities WHERE hero_content_id = ?)",
    "DELETE FROM hero_abilities WHERE hero_content_id = ?",
    "DELETE FROM schematic_perks WHERE schematic_content_id = ?",
    "DELETE FROM perk_translations WHERE perk_content_id = ?",
    "DELETE FROM hero_records WHERE content_id = ?",
    "DELETE FROM schematic_records WHERE content_id = ?",
    "DELETE FROM cms_content_translations WHERE content_id = ?",
    "DELETE FROM cms_preview_tokens WHERE content_id = ?",
    "DELETE FROM cms_slugs WHERE content_id = ?",
    "DELETE FROM cms_contents WHERE id = ?",
  ]) {
    assert.ok(rollback.includes(sql), `rollback is missing: ${sql}`);
  }
  // Children before the root, so a RESTRICT edge can never block the root delete.
  const rootIndex = rollback.indexOf("DELETE FROM cms_contents WHERE id = ?");
  for (const child of [
    "DELETE FROM hero_abilities WHERE hero_content_id = ?",
    "DELETE FROM schematic_perks WHERE schematic_content_id = ?",
    "DELETE FROM cms_slugs WHERE content_id = ?",
  ]) {
    assert.ok(
      rollback.indexOf(child) < rootIndex,
      `${child} must be deleted before the cms_contents root`,
    );
  }
  // Reverse creation order, so a later draft referencing an earlier one goes first.
  assert.match(createSource, /const ordered = \[\.\.\.created\]\.reverse\(\)/);
  // Rollback is all-or-report: it records failures instead of throwing.
  assert.match(createSource, /report\.failures\.push\(\{/);
  assert.doesNotMatch(
    createSource.slice(createSource.indexOf("export async function rollbackCreatedDrafts")),
    /\bthrow\b/,
    "rollbackCreatedDrafts must never throw over the original error",
  );
  // Audit rows are append-only and must survive; the rollback is audited instead.
  assert.doesNotMatch(createSource, /DELETE FROM cms_audit_events/);
  assert.match(createSource, /action: "content\.import\.rollback"/);
});

test("rollback only ever touches content the import itself created", () => {
  // The rollback list is populated exclusively from createDraftFromImportItem's
  // return value inside this request; nothing is read from client input.
  const loader = loaderSource;
  const pushIndex = loader.indexOf("rollbackRefs.push(");
  assert.ok(pushIndex > -1);
  assert.ok(
    !/rollbackRefs\.push\([^)]*data\./s.test(loader),
    "rollback targets must never be sourced from the uploaded document",
  );
});

test("the importer proves media ids usable BEFORE creating anything", () => {
  // One batched query, using the same status rule as the writer.
  assert.match(loaderSource, /listUsableMediaAssetIds/);
  const guardIndex = loaderSource.indexOf("const mediaRefs = collectMediaRefs");
  const createIndex = loaderSource.indexOf("createDraftFromImportItem(db, actor, entry)");
  assert.ok(guardIndex < createIndex, "media is resolved before any create call");
  assert.match(
    loaderSource,
    /is unknown, tombstoned, or failed/,
    "the media error must name the actual cause",
  );
});

test("schematic targets are pre-validated, including within-file claims", () => {
  assert.match(loaderSource, /no content with id/);
  assert.match(loaderSource, /already has a schematic/);
  assert.match(
    loaderSource,
    /already claimed by item \$\{previous\} in this file/,
    "two items in one file cannot claim the same weapon or trap",
  );
  const guardIndex = loaderSource.indexOf("validateSchematicTargets(db, document.items)");
  const createIndex = loaderSource.indexOf("createDraftFromImportItem(db, actor, entry)");
  assert.ok(guardIndex < createIndex);
});

test("the importer is a guarded mutation, not a bypass", () => {
  assert.match(loaderSource, /assertSameOriginForMutation\(\)/);
  assert.match(loaderSource, /requireCapability\(session, "cms\.write"\)/);
  assert.match(loaderSource, /throw new CmsAuthError\(401, "CMS authentication required\."\)/);
  // The raw document is never parsed on trust: it goes through the validator.
  assert.match(loaderSource, /parseImportDocument\(data\.document, kind\)/);
  assert.doesNotMatch(
    loaderSource,
    /JSON\.parse\(data\.document\)/,
    "the handler must not hand-parse the document instead of the shared validator",
  );
});

test("parser errors stay separate from field errors in the result shape", () => {
  assert.match(loaderSource, /parseError: string \| null/);
  assert.match(loaderSource, /errors: string\[\]/);
  const failure = loaderSource.slice(loaderSource.indexOf("function failure("));
  assert.match(failure, /created: \[\]/, "a failure reports zero created items");
});

test("imported media may not be invented from the file: ids only", () => {
  // A JSON import may reference an EXISTING Media Asset id. It must not be able
  // to smuggle bytes or a URL into the media store.
  assert.doesNotMatch(loaderSource, /uploadAdminMedia/);
  assert.doesNotMatch(loaderSource, /uploadMediaAsset/);
  assert.doesNotMatch(loaderSource, /media\.server/);
  assert.doesNotMatch(createSource, /uploadAdminMedia|uploadMediaAsset/);
});

/* ================================================================== */
/* 5. Backwards compatibility                                          */
/* ================================================================== */

test("existing records and media ids are untouched by the import path", () => {
  // Import only ever INSERTs new drafts. No UPDATE/DELETE against pre-existing
  // content appears anywhere in the create service.
  const createBody = createSource.slice(
    0,
    createSource.indexOf("export async function rollbackCreatedDrafts"),
  );
  assert.doesNotMatch(createBody, /UPDATE\s+hero_records|UPDATE\s+schematic_records/);
  assert.doesNotMatch(createBody, /DELETE FROM media_assets/);
  // The media pipeline is untouched: uploads still go only through media.server.
  assert.doesNotMatch(loaderSource, /MEDIA_BUCKET/);
});

test("createAdminHero gained media fields additively (no breaking change)", () => {
  // Existing callers pass only the original keys; the new ones are optional.
  for (const key of ["portraitAssetId", "bannerAssetId", "seoTitle", "seoDescription"]) {
    assert.match(
      heroesLoaderSource,
      new RegExp(`${key}\\?: string \\| null;`),
      `createAdminHero should accept optional ${key}`,
    );
  }
  // The original required shape is untouched.
  assert.match(heroesLoaderSource, /heroClass: string;/);
  assert.match(heroesLoaderSource, /title: string;/);
});

test("audit taxonomy records imports and rollbacks", async () => {
  const audit = stripComments(await file("../src/lib/cms/audit.ts"));
  assert.match(audit, /"content\.import"/);
  assert.match(audit, /"content\.import\.rollback"/);

  // Both declared actions are actually written: an import and a failed one.
  assert.match(loaderSource, /action: "content\.import"/);
  assert.match(createSource, /action: "content\.import\.rollback"/);

  // Audit metadata is scrubbed by buildAuditEvent; the import record must not
  // smuggle the uploaded document itself into metadata_json.
  const auditWrite = loaderSource.slice(loaderSource.indexOf('action: "content.import"'));
  assert.doesNotMatch(auditWrite, /metadata:[\s\S]{0,400}document/);
});
