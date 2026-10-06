-- Phase 23 — Heroes reference model (ADDITIVE ONLY).
--
-- PURPOSE
--   Turn the hero record from a 13-field collectible entry into a queryable
--   Save the World reference record: structured perks, structured abilities,
--   evolution progression, resource costs, and curated relationships.
--
-- CONVENTIONS (match 0001/0006/0007/0008/0009/0010/0011/0012/0013):
--   * TEXT PRIMARY KEY ids, prefixed and generated server-side (nanoid/uuid).
--   * UTC ISO-8601 TEXT timestamps (created_at / updated_at).
--   * IF NOT EXISTS everywhere so a re-run is a safe no-op.
--   * Never modify old migrations. This file is additive only.
--   * SQLite/D1 dialect: no ADD COLUMN IF NOT EXISTS, no ALTER ... DROP COLUMN,
--     no ADD CONSTRAINT. UNIQUE always ships as a separate CREATE UNIQUE INDEX.
--
-- ARCHITECTURAL DECISIONS (do not reverse without re-reading the audit)
--
--   1. HERO PERKS ARE NOT `perk_records`.
--      `perk_records` is the schematic slot-modifier namespace ("Modifier keys
--      ... attached to schematic slots", admin/inventory.tsx) whose real values
--      are free-text stat rolls ("+10% Damage", "Element: Fire"). Hero perks are
--      a disjoint vocabulary ("Monster Smash", "Medic"). Coupling them would
--      corrupt perk_type semantics, flood listPublishedPerks(), and drag the
--      cms_contents publishing lifecycle into a table that needs no public URL.
--      => dedicated hero_perk_defs namespace below.
--
--   2. `hero_perk_defs.perk_key` IS SLOT-SCOPED ("standard/monster-smash" vs
--      "commander/monster-smash"). Measured over stw-db/parsed/heroes.json:
--      416 distinct (label, name) pairs, 416 distinct descriptions, and a naive
--      slugifier collides standard vs commander for ALL 208 perks because the
--      source's "+" suffix is stripped. Slot scoping removes the collision.
--      The "+" convention is not uniform upstream (239/242 use " +", 2 use "+",
--      and `hotwire` has identical standard AND commander perks), so the key
--      MUST NOT be derived by stripping the suffix.
--
--   3. ABILITIES ARE NOT `cms_contents`.
--      A new entity_type requires coordinated edits in content-types.ts,
--      detailBaseForKind() (which currently falls through to
--      schematicDetailPath() and would emit a WRONG url), sitemap.server.ts,
--      ARTICLE_REFERENCE_ENTITY_TYPES, content-create.server.ts, and
--      assertMediaUnreferenced. Abilities are 19 machine-keyed reference rows
--      with no plausible public URL. => standalone ability_defs below.
--
--   4. PROGRESSION IS STAGE A (per-hero rows), NOT Stage B normalization.
--      The UI is identical either way; Stage A is a provable 1:1 mapping of the
--      reference snapshot and carries no inference risk. Stage B (collapsing to
--      per-rarity reference rows) is a pure storage optimization and is deferred.
--
--   5. max_power / tier_count ARE NOT STORED. Both are functions of rarity in
--      the reference data (max_power === 144 and tier_count === 5 for all 242
--      heroes). Storing them invites contradiction; loaders derive them.
--
--   6. REFERENCE vs EDITORIAL. Columns carrying `data_source` /
--      `data_snapshot_at` are synchronized reference data written only by the
--      importer. Everything else on cms_contents / cms_content_translations /
--      hero_records stays editorial and is never touched by a sync.
--
-- ROLLBACK
--   DROP the tables below in reverse dependency order. The four columns added
--   to hero_records and the one added to hero_abilities CANNOT be dropped
--   (older D1 SQLite has no DROP COLUMN) - they are nullable and ignored by
--   the pre-0014 code paths, exactly as documented in 0012's rollback note.
--   No existing row is modified or invalidated by this migration.

-- ---------------------------------------------------------------------------
-- Hero reference metadata (per hero).
--
-- stw_ref_slug is the ONLY stable join key back to the build-time reference
-- snapshot. It is deliberately NOT a numeric id and NOT derived from the public
-- slug: public slugs are editorial per-locale namespaced values, while this is
-- an upstream-owned identifier that stays constant across re-syncs. Nullable so
-- heroes authored purely in the CMS (with no reference counterpart) stay valid.
-- NULL values do not collide in a SQLite UNIQUE index.
-- ---------------------------------------------------------------------------
ALTER TABLE hero_records ADD COLUMN stw_ref_slug TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_hero_records_stw_ref_slug
  ON hero_records (stw_ref_slug);

-- Editorial one-liner used by cards / quick view. Distinct from the long-form
-- `body` in cms_content_translations: a card excerpt must not be produced by
-- truncating prose. Editors own this field; the importer never writes it.
ALTER TABLE hero_records ADD COLUMN summary TEXT;

-- Provenance. 'editorial' = authored in the CMS with no reference sync.
-- 'stw-sync'   = populated/refreshed from the reference snapshot. The importer
--                 only ever writes rows whose data_source = 'stw-sync', which is
--                 what makes a later reference-only rollback possible.
ALTER TABLE hero_records ADD COLUMN data_source TEXT NOT NULL DEFAULT 'editorial';
ALTER TABLE hero_records ADD COLUMN data_snapshot_at TEXT;

-- ---------------------------------------------------------------------------
-- Hero ability definitions (19-row reference namespace).
--
-- NOT on cms_contents - see ARCHITECTURAL DECISION 3. `stw_ref_id` carries the
-- upstream ability template id (e.g. "ability:kit_ninja_smokebomb") purely as an
-- internal change-detection key between reference snapshots. It is never
-- selected by any public loader and must never reach the public API.
--
-- No cooldown / energy / damage columns: the reference source contains none, and
-- a nullable column nothing populates only invites fabricated values later.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ability_defs (
  id TEXT PRIMARY KEY NOT NULL,
  ability_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  stw_ref_id TEXT,
  icon_asset_id TEXT REFERENCES media_assets (id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  data_source TEXT NOT NULL DEFAULT 'stw-sync',
  data_snapshot_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (length(trim(ability_key)) > 0),
  CHECK (length(trim(display_name)) > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ability_defs_key
  ON ability_defs (ability_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ability_defs_stw_ref
  ON ability_defs (stw_ref_id);
CREATE INDEX IF NOT EXISTS idx_ability_defs_sort
  ON ability_defs (sort_order, ability_key);

CREATE TABLE IF NOT EXISTS ability_def_translations (
  id TEXT PRIMARY KEY NOT NULL,
  ability_def_id TEXT NOT NULL REFERENCES ability_defs (id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ability_def_tr_def_locale
  ON ability_def_translations (ability_def_id, locale);
CREATE INDEX IF NOT EXISTS idx_ability_def_tr_locale
  ON ability_def_translations (locale);

-- Backfill link from the existing per-hero ability rows onto the new
-- definitions. NULLABLE and indexed so pre-0014 rows keep working untouched;
-- the importer fills it for rows whose ability_key matches a definition.
ALTER TABLE hero_abilities ADD COLUMN ability_def_id TEXT
  REFERENCES ability_defs (id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_hero_abilities_def
  ON hero_abilities (ability_def_id);

-- ---------------------------------------------------------------------------
-- Hero perk definitions (416-row reference namespace).
--
-- NOT perk_records - see ARCHITECTURAL DECISION 1. `perk_key` is slot-scoped
-- (see DECISION 2). `display_name` is the reference-side canonical name and
-- includes the upstream " +" marker; editors localize via the translations
-- table rather than mutating this column.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hero_perk_defs (
  id TEXT PRIMARY KEY NOT NULL,
  perk_key TEXT NOT NULL,
  slot TEXT NOT NULL,
  display_name TEXT NOT NULL,
  icon_asset_id TEXT REFERENCES media_assets (id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  data_source TEXT NOT NULL DEFAULT 'stw-sync',
  data_snapshot_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (slot IN ('standard', 'commander')),
  CHECK (length(trim(perk_key)) > 0),
  CHECK (length(trim(display_name)) > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hero_perk_defs_key
  ON hero_perk_defs (perk_key);
CREATE INDEX IF NOT EXISTS idx_hero_perk_defs_slot
  ON hero_perk_defs (slot, display_name);

CREATE TABLE IF NOT EXISTS hero_perk_def_translations (
  id TEXT PRIMARY KEY NOT NULL,
  hero_perk_def_id TEXT NOT NULL REFERENCES hero_perk_defs (id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hero_perk_def_tr_def_locale
  ON hero_perk_def_translations (hero_perk_def_id, locale);
CREATE INDEX IF NOT EXISTS idx_hero_perk_def_tr_locale
  ON hero_perk_def_translations (locale);

-- Ordered join. One hero can carry many standard/commander perk variants over
-- its lifetime, so uniqueness is per (hero, definition) and ordering is explicit
-- rather than positional.
CREATE TABLE IF NOT EXISTS hero_perks (
  id TEXT PRIMARY KEY NOT NULL,
  hero_content_id TEXT NOT NULL REFERENCES hero_records (content_id) ON DELETE CASCADE,
  hero_perk_def_id TEXT NOT NULL REFERENCES hero_perk_defs (id) ON DELETE RESTRICT,
  slot_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE (hero_content_id, hero_perk_def_id),
  CHECK (slot_order >= 0)
);
CREATE INDEX IF NOT EXISTS idx_hero_perks_hero
  ON hero_perks (hero_content_id, slot_order);
CREATE INDEX IF NOT EXISTS idx_hero_perks_def
  ON hero_perks (hero_perk_def_id);

-- ---------------------------------------------------------------------------
-- Evolution progression (Stage A - one row per hero / rarity / tier).
--
-- `rarity` is deliberately NOT constrained by a CHECK: the reference source
-- carries a richer rarity ladder than the public facet subset, and narrowing it
-- here would reject legitimate rows. `tier` is 1-based.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hero_progression (
  id TEXT PRIMARY KEY NOT NULL,
  hero_content_id TEXT NOT NULL REFERENCES hero_records (content_id) ON DELETE CASCADE,
  rarity TEXT NOT NULL,
  tier INTEGER NOT NULL,
  power_min INTEGER,
  power_max INTEGER,
  level_min INTEGER,
  level_max INTEGER,
  data_source TEXT NOT NULL DEFAULT 'stw-sync',
  data_snapshot_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (hero_content_id, rarity, tier),
  CHECK (tier >= 1),
  CHECK (length(trim(rarity)) > 0)
);
CREATE INDEX IF NOT EXISTS idx_hero_progression_hero
  ON hero_progression (hero_content_id, rarity, tier);
CREATE INDEX IF NOT EXISTS idx_hero_progression_rarity_power
  ON hero_progression (rarity, power_max);
CREATE INDEX IF NOT EXISTS idx_hero_progression_power
  ON hero_progression (power_max);

-- ---------------------------------------------------------------------------
-- Resources and evolution costs.
--
-- The reference source uses only 8 distinct resource names, repeated across
-- every hero; normalizing them makes "which heroes need Storm Shard" a query
-- instead of a text search.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resources (
  id TEXT PRIMARY KEY NOT NULL,
  resource_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  icon_asset_id TEXT REFERENCES media_assets (id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (length(trim(resource_key)) > 0),
  CHECK (length(trim(display_name)) > 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_resources_key
  ON resources (resource_key);

-- Cost vectors.
--   scope = 'tier'  -> tier is the tier you are evolving INTO (1-based).
--   scope = 'total' -> tier is 0 and the row is the tier-1-to-max summary.
-- Using an explicit scope plus a non-null sentinel tier keeps UNIQUE effective
-- (SQLite treats NULLs as distinct, so a nullable tier would silently permit
-- duplicate total rows).
CREATE TABLE IF NOT EXISTS hero_progression_costs (
  id TEXT PRIMARY KEY NOT NULL,
  hero_content_id TEXT NOT NULL REFERENCES hero_records (content_id) ON DELETE CASCADE,
  rarity TEXT NOT NULL,
  scope TEXT NOT NULL,
  tier INTEGER NOT NULL,
  kind TEXT NOT NULL,
  resource_id TEXT NOT NULL REFERENCES resources (id) ON DELETE RESTRICT,
  amount INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (hero_content_id, rarity, scope, tier, kind, resource_id),
  CHECK (scope IN ('tier', 'total')),
  CHECK (kind IN ('evolve', 'recycle', 'upgrade_rarity')),
  CHECK (amount >= 0),
  CHECK ((scope = 'total' AND tier = 0) OR (scope = 'tier' AND tier >= 1))
);
CREATE INDEX IF NOT EXISTS idx_hero_progression_costs_hero
  ON hero_progression_costs (hero_content_id, rarity, scope, tier);
CREATE INDEX IF NOT EXISTS idx_hero_progression_costs_resource
  ON hero_progression_costs (resource_id);

-- ---------------------------------------------------------------------------
-- Curated hero-to-hero relationships.
--
-- Only explicit editorial links are stored. Similarity-based relations
-- (same category / same perk / same ability / same class) are derived at read
-- time so they cannot go stale when a hero's classification changes - see
-- hero-related.server.ts. Mirrors article_related (0010) including the
-- self-reference CHECK.
--
-- relation_kind defaults to 'curated'; the remaining values let an editor pin a
-- specific derived relation when they want it to lead the list.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hero_related_heroes (
  id TEXT PRIMARY KEY NOT NULL,
  hero_content_id TEXT NOT NULL REFERENCES hero_records (content_id) ON DELETE CASCADE,
  related_content_id TEXT NOT NULL REFERENCES hero_records (content_id) ON DELETE CASCADE,
  relation_kind TEXT NOT NULL DEFAULT 'curated',
  slot_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE (hero_content_id, related_content_id),
  CHECK (hero_content_id != related_content_id),
  CHECK (relation_kind IN (
    'curated', 'same_class', 'same_category', 'same_perk', 'same_ability'
  )),
  CHECK (slot_order >= 0)
);
CREATE INDEX IF NOT EXISTS idx_hero_related_hero
  ON hero_related_heroes (hero_content_id, slot_order);
CREATE INDEX IF NOT EXISTS idx_hero_related_related
  ON hero_related_heroes (related_content_id);