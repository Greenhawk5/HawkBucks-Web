#!/usr/bin/env node
/**
 * PHASE 2 — Heroes reference sync.
 *
 * Reads the BUILD-TIME reference snapshot (stw-db/parsed/heroes.json) and emits
 * a deterministic, idempotent SQL file that populates the Phase 23 reference
 * model (migration 0014) in D1.
 *
 * THIS SCRIPT IS THE ONLY WRITER OF REFERENCE DATA.
 * It never writes editorial data.
 *
 * ---------------------------------------------------------------------------
 * SOURCE-OF-TRUTH CONTRACT
 * ---------------------------------------------------------------------------
 *   stw-db/parsed/heroes.json  ->  build-time input only, NEVER read at runtime.
 *   D1                          ->  runtime source of truth after a successful sync.
 *
 * The reference snapshot is gitignored (see the /stw-db/* allow-list) and may be
 * absent on a clean clone. Nothing under frontend/src reads it. This script is
 * its only consumer, and it runs offline, by hand, from a checkout that has it.
 *
 * ---------------------------------------------------------------------------
 * GUARANTEES
 * ---------------------------------------------------------------------------
 *   1. DETERMINISTIC   Every generated id is a content hash of the reference
 *                      key, so re-running produces identical ids and SQL.
 *   2. IDEMPOTENT      Reference tables are upserted on their UNIQUE index and
 *                      only reference columns are refreshed.
 *   3. NON-DESTRUCTIVE No DELETE against production data. Only this script's own
 *                      staging tables are dropped.
 *   4. EDITORIAL-SAFE  Editorial columns are written ONLY for heroes this sync
 *                      creates. An existing CMS hero keeps its title, body,
 *                      slug, seo fields, og fields, summary and publish status.
 *   5. NO INVENTION    Values absent from the snapshot stay NULL. Specifically:
 *                        category           - the snapshot has NO subclass field
 *                        ability desc/cd    - absent upstream, never populated
 *                        aboutText          - third-party prose duplicating the
 *                                             structured sections we render
 *                        pageTitle/metaDesc - third-party SEO copy
 *                        relatedLinks[]     - alphabetical same-class neighbours
 *                                             upstream, i.e. NOT a relationship
 *
 * ---------------------------------------------------------------------------
 * USAGE
 * ---------------------------------------------------------------------------
 *   node scripts/sync-heroes-reference.mjs                  # SQL to stdout
 *   node scripts/sync-heroes-reference.mjs --out=sync.sql  # SQL to file
 *   node scripts/sync-heroes-reference.mjs --quiet          # report only
 *
 *   Apply LOCAL first, always:
 *     npx wrangler d1 execute hawkbucks-cms-local --local \
 *       --config wrangler.local.json --file=sync.sql
 *   Then, only after the local audit queries look right:
 *     npx wrangler d1 execute hawkbucks-data --remote --file=sync.sql
 *
 * ---------------------------------------------------------------------------
 * EDITORIAL SAFETY — the rule that matters most
 * ---------------------------------------------------------------------------
 * A sync is a REFERENCE operation. A hero created by a sync is created as a
 * DRAFT (cms_contents.status = 'draft'): publishing is an editorial act that
 * the CMS already exposes as a separate, permissioned step. A reference sync
 * never publishes and never unpublishes.
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTEND = dirname(join(fileURLToPath(import.meta.url), ".."));
const REPO = dirname(FRONTEND);
const SOURCE = join(REPO, "stw-db", "parsed", "heroes.json");
const SNAPSHOT = join(REPO, "stw-db", "stats.json");

/** Fixed sentinel so generated SQL is byte-stable across runs. */
const STAMP = "1970-01-01T00:00:00.000Z";

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name) => args.some((a) => a === `--${name}` || a.startsWith(`--${name}=`));
const opt = (name, fallback = null) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Stable, content-addressed id. Same reference key => same id, forever. */
const sid = (prefix, ...parts) =>
  `${prefix}_${createHash("sha256").update(parts.join(" ")).digest("hex").slice(0, 32)}`;

/** SQL literal with embedded-quote escaping. */
const q = (v) => {
  if (v === null || v === undefined) return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
};

/**
 * Machine key slug.
 *
 * A trailing "+" marker is stripped so "Monster Smash +" (commander) and
 * "Monster Smash" (standard) normalize the same way — the SLOT prefix in
 * perk_key() is what keeps them apart (migration 0014, DECISION 2). Stripping
 * also absorbs the upstream variant where some rows write "+" without a space.
 */
function slugify(name) {
  return String(name)
    .toLowerCase()
    .replace(/\s*\+\s*$/, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Slot-scoped perk key. The slot prefix is load-bearing, not decoration. */
const perkKey = (slot, name) => `${slot}/${slugify(name)}`;

const RARITY_KEYS = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
const rarityKey = (v) => {
  if (!v) return null;
  const s = String(v).toLowerCase();
  return RARITY_KEYS.includes(s) ? s : null;
};

/** "2,500" -> 2500. Returns null for anything unparseable rather than guessing. */
function toAmount(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).replace(/,/g, "").trim();
  return /^\d+$/.test(s) ? Number(s) : null;
}

const toInt = (raw) => {
  if (raw === null || raw === undefined) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

function heroClassOf(record) {
  const c = (record.classes || []).map((x) => String(x).toLowerCase());
  for (const v of ["soldier", "constructor", "ninja", "outlander"]) if (c.includes(v)) return v;
  return null;
}

// ---------------------------------------------------------------------------
// Load + validate source
// ---------------------------------------------------------------------------

if (!existsSync(SOURCE)) {
  console.error(
    `[sync] reference snapshot not found:\n  ${SOURCE}\n` +
      `  stw-db is build-time input and is gitignored. Fetch it before syncing.`,
  );
  process.exit(1);
}

let snapshotAt = null;
if (existsSync(SNAPSHOT)) {
  try {
    snapshotAt = JSON.parse(readFileSync(SNAPSHOT, "utf8")).generatedAt ?? null;
  } catch {
    /* snapshot metadata is optional */
  }
}

const heroes = JSON.parse(readFileSync(SOURCE, "utf8"));
if (!Array.isArray(heroes)) {
  console.error("[sync] source is not an array of hero records");
  process.exit(1);
}

const warnings = [];
const reject = (msg) => warnings.push(msg);

const seenSlugs = new Set();
for (const h of heroes) {
  if (!h || typeof h.slug !== "string" || !h.slug.trim()) {
    reject("record without a usable slug — skipped");
    continue;
  }
  if (seenSlugs.has(h.slug)) reject(`duplicate source slug: ${h.slug}`);
  seenSlugs.add(h.slug);
}

// ---------------------------------------------------------------------------
// Build reference entities (deterministic)
// ---------------------------------------------------------------------------

const resources = new Map(); // resource_key -> { key, name }
const abilities = new Map(); // ability_key  -> { key, name, iconUrl }
const perkDefs = new Map(); // perk_key     -> { key, slot, name, description, sort }
const heroRows = [];
const progression = [];
const costs = [];

let perkSeq = 0;
let abilitySeq = 0;

function noteResource(name) {
  if (!name) return null;
  const key = slugify(name);
  if (!key) return null;
  if (!resources.has(key)) resources.set(key, { key, name: String(name).trim() });
  return key;
}

for (const h of heroes) {
  const refSlug = String(h.slug).trim();
  const heroClass = heroClassOf(h);
  if (!heroClass) reject(`${refSlug}: no recognized hero class`);

  const panels = (h.rarityPanels || []).filter((p) => p && p.rarity);
  if (panels.length === 0) {
    reject(`${refSlug}: no rarity panels`);
    continue;
  }

  // Perks and abilities are documented as identical across a hero's rarity
  // panels. Prefer the default (highest) panel but VERIFY rather than assume.
  const ordered = [...panels].sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0));
  const primary = ordered[0];
  for (const p of ordered.slice(1)) {
    const sig = (x) => (x.perks || []).map((k) => `${k.label}|${k.name}`).join("~");
    if (sig(p) !== sig(primary))
      reject(`${refSlug}: perk set differs on the ${p.rarity} panel — used default`);
  }

  // -- perks ---------------------------------------------------------------
  const heroPerks = [];
  (primary.perks || []).forEach((perk, idx) => {
    if (!perk || !perk.name) return;
    const slot = perk.label === "Commander perk" ? "commander" : "standard";
    const key = perkKey(slot, perk.name);
    const description = String(perk.description ?? "").trim();
    if (!perkDefs.has(key)) {
      perkDefs.set(key, {
        key,
        slot,
        name: String(perk.name).trim(),
        description,
        sort: perkSeq++,
      });
    } else {
      const prior = perkDefs.get(key);
      // Descriptions are shared per definition. A conflict means the source has
      // two different texts under one key: never silently pick one.
      if (prior.description && description && prior.description !== description) {
        reject(`${refSlug}: perk "${key}" conflicts with an earlier hero's description`);
      }
      if (!prior.description && description) prior.description = description;
    }
    heroPerks.push({ key, order: idx });
  });

  // -- abilities ------------------------------------------------------------
  const heroAbilities = [];
  (primary.abilities || []).forEach((ab, idx) => {
    if (!ab || !ab.name) return;
    const name = String(ab.name).trim();
    const key = slugify(name);
    if (!key) return;
    if (!abilities.has(key)) {
      abilities.set(key, { key, name, iconUrl: ab.iconUrl ?? null, sort: abilitySeq++ });
    }
    heroAbilities.push({ key, order: idx });
  });

  // -- progression + costs --------------------------------------------------
  for (const panel of panels) {
    const pRarity = rarityKey(panel.rarity) ?? String(panel.rarity).toLowerCase();

    for (const tier of panel.tierTable || []) {
      const t = toInt(tier.tier);
      if (t === null || t < 1) continue;
      progression.push({
        ref_slug: refSlug,
        rarity: pRarity,
        tier: t,
        power_min: toInt(tier.powerMin),
        power_max: toInt(tier.powerMax),
        level_min: toInt(tier.levelMin),
        level_max: toInt(tier.levelMax),
      });
      for (const c of tier.evolveToNext || []) {
        const rk = noteResource(c.name);
        const amount = toAmount(c.amount);
        if (!rk || amount === null) continue;
        costs.push({
          ref_slug: refSlug,
          rarity: pRarity,
          scope: "tier",
          tier: t,
          kind: "evolve",
          resource_key: rk,
          amount,
        });
      }
    }
    for (const c of panel.evolveToMax || []) {
      const rk = noteResource(c.name);
      const amount = toAmount(c.amount);
      if (!rk || amount === null) continue;
      costs.push({
        ref_slug: refSlug,
        rarity: pRarity,
        scope: "total",
        tier: 0,
        kind: "evolve",
        resource_key: rk,
        amount,
      });
    }
    for (const c of panel.recyclingReturns || []) {
      const rk = noteResource(c.name);
      const amount = toAmount(c.amount);
      if (!rk || amount === null) continue;
      costs.push({
        ref_slug: refSlug,
        rarity: pRarity,
        scope: "total",
        tier: 0,
        kind: "recycle",
        resource_key: rk,
        amount,
      });
    }
  }

  heroRows.push({
    ref_slug: refSlug,
    hero_slug: refSlug,
    title: String(h.name ?? "").trim(),
    hero_class: heroClass,
    // bestRarity is the hero's HIGHEST rarity; the full ladder lives in
    // hero_progression. category stays NULL: the snapshot has no subclass.
    rarity: rarityKey(h.bestRarity),
    heroPerks,
    heroAbilities,
  });
}

// ---------------------------------------------------------------------------
// Referential integrity + conflict checks, BEFORE emitting anything
// ---------------------------------------------------------------------------

for (const hr of heroRows) {
  for (const p of hr.heroPerks)
    if (!perkDefs.has(p.key)) throw new Error(`internal: missing perk def ${p.key}`);
  for (const a of hr.heroAbilities)
    if (!abilities.has(a.key)) throw new Error(`internal: missing ability def ${a.key}`);
}
for (const c of costs)
  if (!resources.has(c.resource_key))
    throw new Error(`internal: missing resource ${c.resource_key}`);

const progSeen = new Set();
for (const p of progression) {
  const k = `${p.ref_slug}|${p.rarity}|${p.tier}`;
  if (progSeen.has(k)) reject(`duplicate progression row ${k} — later row wins`);
  progSeen.add(k);
}
const costSeen = new Set();
for (const c of costs) {
  const k = `${c.ref_slug}|${c.rarity}|${c.scope}|${c.tier}|${c.kind}|${c.resource_key}`;
  if (costSeen.has(k)) reject(`duplicate cost row ${k} — later row wins`);
  costSeen.add(k);
}

// ---------------------------------------------------------------------------
// SQL emission
// ---------------------------------------------------------------------------

const out = [];
const push = (s = "") => out.push(s);

/**
 * D1/SQLite rejects an over-long statement with SQLITE_TOOBIG. Hero perk
 * descriptions run to several hundred characters each, so batch by BYTES
 * rather than by a fixed row count.
 */
const MAX_STATEMENT_BYTES = 24_000;

/** Fail fast on a property/column mismatch, which otherwise surfaces as a
 *  confusing NOT NULL error at D1, far from the cause. */
function assertShape(table, cols, rows) {
  for (const [i, r] of rows.entries()) {
    for (const c of cols) {
      if (r[c] === undefined) {
        throw new Error(
          `[sync] internal: row ${i} for ${table} is missing property "${c}" (have: ${Object.keys(r).join(", ")})`,
        );
      }
    }
  }
}

function emitBatched(prefix, tail, table, cols, rows) {
  if (rows.length === 0) return;
  assertShape(table, cols, rows);
  const head = `${prefix} VALUES\n  `;
  let batch = [];
  let size = head.length;
  const flush = () => {
    if (batch.length === 0) return;
    push(`${head}${batch.join(",\n  ")}${tail}`);
    batch = [];
    size = head.length;
  };
  for (const r of rows) {
    const tuple = `(${cols.map((c) => q(r[c])).join(",")})`;
    if (batch.length > 0 && size + tuple.length + 3 > MAX_STATEMENT_BYTES) flush();
    batch.push(tuple);
    size += tuple.length + 3;
  }
  flush();
  push("");
}

/** Plain multi-row INSERT (staging tables only). */
const insertMany = (table, cols, rows) =>
  emitBatched(`INSERT OR REPLACE INTO ${table} (${cols.join(",")})`, ";", table, cols, rows);

/**
 * Upsert for the reference-definition tables.
 * `conflictCols` must match an existing UNIQUE index.
 * `updateCols` is the WHITELIST a re-sync may refresh — reference columns
 * only, so a re-sync can never clobber editorial input.
 */
const upsertMany = (table, cols, rows, conflictCols, updateCols) =>
  emitBatched(
    `INSERT INTO ${table} (${cols.join(",")})`,
    `\nON CONFLICT(${conflictCols}) DO UPDATE SET\n${updateCols.map((c) => `  ${c} = excluded.${c}`).join(",\n")};`,
    table,
    cols,
    rows,
  );

push("-- ===========================================================================");
push("-- Heroes reference sync — scripts/sync-heroes-reference.mjs");
push(`-- source       : stw-db/parsed/heroes.json (${heroRows.length} heroes)`);
push(`-- snapshot     : ${snapshotAt ?? "unknown"}`);
push(`-- perk defs    : ${perkDefs.size}`);
push(`-- ability defs : ${abilities.size}`);
push(`-- resources    : ${resources.size}`);
push(`-- progression  : ${progression.length}`);
push(`-- cost rows    : ${costs.length}`);
push(`-- warnings     : ${warnings.length}`);
push("--");
push("-- DETERMINISTIC: every id is a content hash of its reference key.");
push("-- Re-running this file yields the same ids and the same result set.");
push("-- ===========================================================================");
push("");
push("PRAGMA foreign_keys = ON;");
push("");

// ---- staging ---------------------------------------------------------------
push("-- ---- staging (dropped again at the end) ----");
for (const t of [
  "_sync_hero_map",
  "_sync_stage_heroes",
  "_sync_stage_perks",
  "_sync_stage_abilities",
  "_sync_stage_progression",
  "_sync_stage_costs",
]) {
  push(`DROP TABLE IF EXISTS ${t};`);
}
push("");
push(`CREATE TABLE _sync_stage_heroes (
  ref_slug TEXT PRIMARY KEY, hero_slug TEXT NOT NULL, title TEXT NOT NULL,
  hero_class TEXT NOT NULL, rarity TEXT);`);
push(`CREATE TABLE _sync_stage_perks (
  ref_slug TEXT NOT NULL, perk_key TEXT NOT NULL, slot_order INTEGER NOT NULL,
  PRIMARY KEY (ref_slug, perk_key));`);
push(`CREATE TABLE _sync_stage_abilities (
  ref_slug TEXT NOT NULL, ability_key TEXT NOT NULL, slot_order INTEGER NOT NULL,
  PRIMARY KEY (ref_slug, ability_key));`);
push(`CREATE TABLE _sync_stage_progression (
  ref_slug TEXT NOT NULL, rarity TEXT NOT NULL, tier INTEGER NOT NULL,
  power_min INTEGER, power_max INTEGER, level_min INTEGER, level_max INTEGER,
  PRIMARY KEY (ref_slug, rarity, tier));`);
push(`CREATE TABLE _sync_stage_costs (
  ref_slug TEXT NOT NULL, rarity TEXT NOT NULL, scope TEXT NOT NULL, tier INTEGER NOT NULL,
  kind TEXT NOT NULL, resource_key TEXT NOT NULL, amount INTEGER NOT NULL,
  PRIMARY KEY (ref_slug, rarity, scope, tier, kind, resource_key));`);
push("");

push("-- ---- stage payloads ----");
insertMany(
  "_sync_stage_heroes",
  ["ref_slug", "hero_slug", "title", "hero_class", "rarity"],
  heroRows,
);
insertMany(
  "_sync_stage_perks",
  ["ref_slug", "perk_key", "slot_order"],
  heroRows.flatMap((h) =>
    h.heroPerks.map((p) => ({ ref_slug: h.ref_slug, perk_key: p.key, slot_order: p.order })),
  ),
);
insertMany(
  "_sync_stage_abilities",
  ["ref_slug", "ability_key", "slot_order"],
  heroRows.flatMap((h) =>
    h.heroAbilities.map((a) => ({ ref_slug: h.ref_slug, ability_key: a.key, slot_order: a.order })),
  ),
);
insertMany(
  "_sync_stage_progression",
  ["ref_slug", "rarity", "tier", "power_min", "power_max", "level_min", "level_max"],
  progression,
);
insertMany(
  "_sync_stage_costs",
  ["ref_slug", "rarity", "scope", "tier", "kind", "resource_key", "amount"],
  costs,
);

// ---- reference definitions -------------------------------------------------
push("-- ---- resources ----");
upsertMany(
  "resources",
  ["id", "resource_key", "display_name", "icon_asset_id", "sort_order", "created_at", "updated_at"],
  [...resources.values()].map((r, i) => ({
    id: sid("res", r.key),
    resource_key: r.key,
    display_name: r.name,
    icon_asset_id: null,
    sort_order: i,
    created_at: STAMP,
    updated_at: STAMP,
  })),
  "resource_key",
  ["display_name", "updated_at"],
);

push("-- ---- ability_defs (icons wired in Phase 3) ----");
upsertMany(
  "ability_defs",
  [
    "id",
    "ability_key",
    "display_name",
    "stw_ref_id",
    "icon_asset_id",
    "sort_order",
    "data_source",
    "data_snapshot_at",
    "created_at",
    "updated_at",
  ],
  [...abilities.values()].map((a) => ({
    id: sid("abd", a.key),
    ability_key: a.key,
    display_name: a.name,
    stw_ref_id: null,
    icon_asset_id: null,
    sort_order: a.sort,
    data_source: "stw-sync",
    data_snapshot_at: snapshotAt,
    created_at: STAMP,
    updated_at: STAMP,
  })),
  "ability_key",
  ["display_name", "data_snapshot_at", "updated_at"],
);

push("-- ---- ability_def_translations (source locale only; editors extend) ----");
upsertMany(
  "ability_def_translations",
  ["id", "ability_def_id", "locale", "name", "description", "created_at", "updated_at"],
  [...abilities.values()].map((a) => ({
    id: sid("abdt", a.key, "en"),
    ability_def_id: sid("abd", a.key),
    locale: "en",
    name: a.name,
    description: "",
    created_at: STAMP,
    updated_at: STAMP,
  })),
  "ability_def_id, locale",
  ["name", "updated_at"],
);

push("-- ---- hero_perk_defs (NOT perk_records; migration 0014 DECISION 1) ----");
upsertMany(
  "hero_perk_defs",
  [
    "id",
    "perk_key",
    "slot",
    "display_name",
    "icon_asset_id",
    "sort_order",
    "data_source",
    "data_snapshot_at",
    "created_at",
    "updated_at",
  ],
  [...perkDefs.values()].map((p) => ({
    id: sid("hpd", p.key),
    perk_key: p.key,
    slot: p.slot,
    display_name: p.name,
    icon_asset_id: null,
    sort_order: p.sort,
    data_source: "stw-sync",
    data_snapshot_at: snapshotAt,
    created_at: STAMP,
    updated_at: STAMP,
  })),
  "perk_key",
  ["display_name", "data_snapshot_at", "updated_at"],
);

push("-- ---- hero_perk_def_translations (source locale only) ----");
upsertMany(
  "hero_perk_def_translations",
  ["id", "hero_perk_def_id", "locale", "name", "description", "created_at", "updated_at"],
  [...perkDefs.values()].map((p) => ({
    id: sid("hpdtr", p.key, "en"),
    hero_perk_def_id: sid("hpd", p.key),
    locale: "en",
    name: p.name,
    description: p.description,
    created_at: STAMP,
    updated_at: STAMP,
  })),
  "hero_perk_def_id, locale",
  ["name", "description", "updated_at"],
);

// ---- heroes ----------------------------------------------------------------
push("-- ---- heroes: create missing reference rows as DRAFTS, link existing ----");
push("-- Editorial columns are written ONLY for heroes this sync creates.");
push("-- An existing CMS hero keeps title/body/slug/seo/og/summary/status.");
push("");
push(`INSERT INTO cms_contents (id, entity_type, default_locale, status, published_at, created_by, updated_by, created_at, updated_at)
SELECT s.ref_slug || '_c', 'hero', 'en', 'draft', NULL, NULL, NULL, ${q(STAMP)}, ${q(STAMP)}
FROM _sync_stage_heroes s
WHERE NOT EXISTS (SELECT 1 FROM cms_contents c WHERE c.entity_type='hero' AND c.id = s.ref_slug || '_c')
  AND NOT EXISTS (
    SELECT 1 FROM cms_contents c2
    JOIN hero_records h2 ON h2.content_id = c2.id
    WHERE c2.entity_type='hero'
      AND (h2.stw_ref_slug = s.ref_slug
           OR EXISTS (SELECT 1 FROM cms_slugs sl WHERE sl.content_id = c2.id AND sl.locale='en' AND sl.slug = s.hero_slug))
  );`);
push("");

push(`INSERT INTO cms_content_translations (id, content_id, locale, title, body, slug, seo_title, seo_description, seo_canonical_override, seo_robots, og_title, og_description, og_image_asset_id, translation_status, created_at, updated_at)
SELECT s.ref_slug || '_t', s.ref_slug || '_c', 'en', s.title, '', s.hero_slug,
       NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'draft', ${q(STAMP)}, ${q(STAMP)}
FROM _sync_stage_heroes s
WHERE NOT EXISTS (SELECT 1 FROM cms_content_translations t WHERE t.content_id = s.ref_slug || '_c' AND t.locale='en');`);
push("");

push(`INSERT INTO cms_slugs (id, entity_type, content_id, locale, slug, created_at, updated_at)
SELECT s.ref_slug || '_s', 'hero', s.ref_slug || '_c', 'en', s.hero_slug, ${q(STAMP)}, ${q(STAMP)}
FROM _sync_stage_heroes s
WHERE NOT EXISTS (SELECT 1 FROM cms_slugs sl WHERE sl.entity_type='hero' AND sl.content_id = s.ref_slug || '_c' AND sl.locale='en');`);
push("");

push("-- Resolve which content id each reference slug belongs to.");
push("-- Pass A: a row already carries stw_ref_slug from an earlier sync, which");
push("--         is the only way to re-link a hero whose public slug was renamed.");
push("-- Pass B: the hero's English slug equals the reference slug. This also");
push("--         covers the heroes created just above, which have no hero_records");
push("--         row yet — so the map MUST NOT be sourced from hero_records only.");
push("-- (D1 rejects CREATE TEMP TABLE with SQLITE_AUTH, so this is a real");
push("--  table that is dropped again in the cleanup section.)");
push(
  "CREATE TABLE IF NOT EXISTS _sync_hero_map (content_id TEXT PRIMARY KEY, ref_slug TEXT NOT NULL);",
);
push("DELETE FROM _sync_hero_map;");
push(`INSERT OR IGNORE INTO _sync_hero_map (content_id, ref_slug)
SELECT h.content_id, s.ref_slug
FROM hero_records h
JOIN _sync_stage_heroes s ON s.ref_slug = h.stw_ref_slug;`);
push(`INSERT OR IGNORE INTO _sync_hero_map (content_id, ref_slug)
SELECT c.id, s.ref_slug
FROM cms_contents c
JOIN cms_slugs sl ON sl.content_id = c.id AND sl.entity_type='hero' AND sl.locale='en'
JOIN _sync_stage_heroes s ON s.hero_slug = sl.slug
WHERE c.entity_type='hero';`);
push("");

push("-- Newly created heroes get their hero_records row here.");
push(`INSERT INTO hero_records (content_id, hero_class, category, rarity, popularity, sort_order, portrait_asset_id, banner_asset_id, created_at, updated_at, stw_ref_slug, summary, data_source, data_snapshot_at)
SELECT m.content_id, s.hero_class, NULL, s.rarity, 0, 0, NULL, NULL,
       ${q(STAMP)}, ${q(STAMP)}, s.ref_slug, NULL, 'stw-sync', ${q(snapshotAt)}
FROM _sync_hero_map m
JOIN _sync_stage_heroes s ON s.ref_slug = m.ref_slug
WHERE NOT EXISTS (SELECT 1 FROM hero_records h WHERE h.content_id = m.content_id);`);
push("");

push("-- Existing heroes: REFERENCE columns only.");
push("-- category / summary / portrait / banner / sort_order / popularity and");
push("-- cms_contents.status are deliberately absent from this statement.");
push(`UPDATE hero_records SET
  stw_ref_slug     = COALESCE(stw_ref_slug, (SELECT ref_slug FROM _sync_hero_map m WHERE m.content_id = hero_records.content_id)),
  data_source      = 'stw-sync',
  data_snapshot_at = ${q(snapshotAt)},
  rarity           = COALESCE(rarity, (SELECT s.rarity FROM _sync_hero_map m JOIN _sync_stage_heroes s ON s.ref_slug = m.ref_slug WHERE m.content_id = hero_records.content_id))
WHERE content_id IN (SELECT content_id FROM _sync_hero_map)
  AND content_id NOT IN (SELECT ref_slug || '_c' FROM _sync_stage_heroes);`);
push("");

// ---- structured children ----------------------------------------------------
push("-- ---- hero_progression ----");
push(`INSERT INTO hero_progression (id, hero_content_id, rarity, tier, power_min, power_max, level_min, level_max, data_source, data_snapshot_at, created_at, updated_at)
SELECT p.ref_slug || '_pr_' || p.rarity || '_' || p.tier, m.content_id, p.rarity, p.tier,
       p.power_min, p.power_max, p.level_min, p.level_max, 'stw-sync', ${q(snapshotAt)}, ${q(STAMP)}, ${q(STAMP)}
FROM _sync_stage_progression p
JOIN _sync_hero_map m ON m.ref_slug = p.ref_slug
WHERE true
ON CONFLICT(hero_content_id, rarity, tier) DO UPDATE SET
  power_min = excluded.power_min, power_max = excluded.power_max,
  level_min = excluded.level_min, level_max = excluded.level_max,
  data_snapshot_at = excluded.data_snapshot_at, updated_at = excluded.updated_at;`);
push("");

push("-- ---- hero_progression_costs ----");
push(`INSERT INTO hero_progression_costs (id, hero_content_id, rarity, scope, tier, kind, resource_id, amount, created_at, updated_at)
SELECT c.ref_slug || '_pc_' || c.rarity || '_' || c.scope || '_' || c.tier || '_' || c.kind || '_' || c.resource_key,
       m.content_id, c.rarity, c.scope, c.tier, c.kind, r.id, c.amount, ${q(STAMP)}, ${q(STAMP)}
FROM _sync_stage_costs c
JOIN _sync_hero_map m ON m.ref_slug = c.ref_slug
JOIN resources r ON r.resource_key = c.resource_key
WHERE true
ON CONFLICT(hero_content_id, rarity, scope, tier, kind, resource_id) DO UPDATE SET
  amount = excluded.amount, updated_at = excluded.updated_at;`);
push("");

push("-- ---- hero_perks (join) ----");
push(`INSERT INTO hero_perks (id, hero_content_id, hero_perk_def_id, slot_order, created_at)
SELECT sp.ref_slug || '_hp_' || sp.perk_key, m.content_id, d.id, sp.slot_order, ${q(STAMP)}
FROM _sync_stage_perks sp
JOIN _sync_hero_map m ON m.ref_slug = sp.ref_slug
JOIN hero_perk_defs d ON d.perk_key = sp.perk_key
WHERE true
ON CONFLICT(hero_content_id, hero_perk_def_id) DO UPDATE SET slot_order = excluded.slot_order;`);
push("");

push("-- ---- hero_abilities: backfill the def link on existing rows ----");
push(`UPDATE hero_abilities SET ability_def_id = (
  SELECT d.id FROM ability_defs d WHERE d.ability_key = hero_abilities.ability_key
)
WHERE ability_def_id IS NULL
  AND EXISTS (SELECT 1 FROM ability_defs d WHERE d.ability_key = hero_abilities.ability_key);`);
push("");

push("-- ---- hero_abilities: add any the hero is missing ----");
push(`INSERT INTO hero_abilities (id, hero_content_id, ability_key, sort_order, icon_asset_id, created_at, updated_at, ability_def_id)
SELECT sa.ref_slug || '_ha_' || sa.ability_key, m.content_id, sa.ability_key, sa.slot_order,
       NULL, ${q(STAMP)}, ${q(STAMP)}, d.id
FROM _sync_stage_abilities sa
JOIN _sync_hero_map m ON m.ref_slug = sa.ref_slug
JOIN ability_defs d ON d.ability_key = sa.ability_key
WHERE NOT EXISTS (
  SELECT 1 FROM hero_abilities h WHERE h.hero_content_id = m.content_id AND h.ability_key = sa.ability_key
);`);
push("");

push("-- ---- hero_ability_translations: guarantee an 'en' name row ----");
push(`INSERT INTO hero_ability_translations (id, ability_id, locale, name, description, created_at, updated_at)
SELECT a.ability_key || '_' || a.hero_content_id || '_en', a.id, 'en',
       COALESCE(NULLIF(d.display_name, ''), a.ability_key), '', ${q(STAMP)}, ${q(STAMP)}
FROM hero_abilities a
LEFT JOIN ability_defs d ON d.id = a.ability_def_id
WHERE NOT EXISTS (
  SELECT 1 FROM hero_ability_translations t WHERE t.ability_id = a.id AND t.locale = 'en'
);`);
push("");

// ---- cleanup + audit --------------------------------------------------------
push("-- ---- cleanup ----");
for (const t of [
  "_sync_stage_heroes",
  "_sync_stage_perks",
  "_sync_stage_abilities",
  "_sync_stage_progression",
  "_sync_stage_costs",
]) {
  push(`DROP TABLE IF EXISTS ${t};`);
}
push("DROP TABLE IF EXISTS _sync_hero_map;");
push("");

push("-- ---- audit (read-only) ----");
push("-- D1 rejects a compound SELECT with many UNION terms, so these are one");
push("-- statement per metric rather than a single 13-term UNION chain.");
const AUDIT = [
  ["heroes_total", "SELECT COUNT(*) AS n FROM hero_records"],
  ["heroes_from_sync", "SELECT COUNT(*) AS n FROM hero_records WHERE data_source='stw-sync'"],
  [
    "heroes_published",
    "SELECT COUNT(*) AS n FROM cms_contents WHERE entity_type='hero' AND status='published'",
  ],
  [
    "heroes_draft",
    "SELECT COUNT(*) AS n FROM cms_contents WHERE entity_type='hero' AND status='draft'",
  ],
  ["hero_perk_defs", "SELECT COUNT(*) AS n FROM hero_perk_defs"],
  ["hero_perks", "SELECT COUNT(*) AS n FROM hero_perks"],
  ["ability_defs", "SELECT COUNT(*) AS n FROM ability_defs"],
  ["abilities_linked", "SELECT COUNT(*) AS n FROM hero_abilities WHERE ability_def_id IS NOT NULL"],
  ["abilities_unlinked", "SELECT COUNT(*) AS n FROM hero_abilities WHERE ability_def_id IS NULL"],
  ["hero_progression", "SELECT COUNT(*) AS n FROM hero_progression"],
  ["hero_progression_costs", "SELECT COUNT(*) AS n FROM hero_progression_costs"],
  ["resources", "SELECT COUNT(*) AS n FROM resources"],
  [
    "orphan_progression",
    "SELECT COUNT(*) AS n FROM hero_progression p LEFT JOIN hero_records h ON h.content_id = p.hero_content_id WHERE h.content_id IS NULL",
  ],
  [
    "orphan_costs",
    "SELECT COUNT(*) AS n FROM hero_progression_costs c LEFT JOIN hero_records h ON h.content_id = c.hero_content_id WHERE h.content_id IS NULL",
  ],
  [
    "orphan_perk_defs",
    "SELECT COUNT(*) AS n FROM hero_perk_defs d LEFT JOIN hero_perk_def_translations t ON t.hero_perk_def_id = d.id AND t.locale='en' WHERE t.id IS NULL",
  ],
];
for (const [label, stmt] of AUDIT) {
  push(
    `SELECT '${label}' AS metric, ${stmt.replace(/^SELECT COUNT\(\*\) AS n FROM /, "COUNT(*) AS n FROM ")};`,
  );
}
push("");

const sql = out.join("\n");

// ---------------------------------------------------------------------------
// Output + report
// ---------------------------------------------------------------------------

const target = opt("out");
if (target) {
  const path = resolve(FRONTEND, target);
  writeFileSync(path, sql, "utf8");
  console.error(`[sync] wrote ${path} (${sql.length} bytes)`);
} else if (!flag("quiet")) {
  process.stdout.write(sql);
}

const stdCount = perkDefs.size / 2;
console.error("");
console.error("[sync] -- source --");
console.error(`[sync]   heroes             ${heroRows.length}`);
console.error(
  `[sync]   perk definitions   ${perkDefs.size} (${stdCount} standard / ${perkDefs.size - stdCount} commander)`,
);
console.error(`[sync]   ability defs       ${abilities.size}`);
console.error(`[sync]   resources          ${resources.size}`);
console.error(`[sync]   progression rows   ${progression.length}`);
console.error(`[sync]   cost rows          ${costs.length}`);
console.error(`[sync]   snapshot           ${snapshotAt ?? "unknown"}`);
console.error(`[sync] -- warnings (${warnings.length}) --`);
const distinct = new Set();
for (const w of warnings) {
  if (distinct.has(w)) continue;
  distinct.add(w);
  console.error(`[sync]   ! ${w}`);
}
console.error(`[sync]   (${warnings.length} total, ${distinct.size} distinct)`);
console.error("[sync] done.");
