-- 0017 — Reusable icon registry (ADDITIVE ONLY).
--
-- PURPOSE
--   Give the Game Items CMS one place to register a REUSABLE ICON — a small
--   glyph that several entities share — and give the public site a stable way to
--   resolve one by SEMANTIC KEY rather than by display text.
--
-- BACKGROUND (why an existing column could not be reused)
--   Icon identity in HawkBucks already exists, but only as an opaque
--   `media_assets.id` FK stamped on the entity that owns the glyph:
--     resources.icon_asset_id          (Game Item Catalog items)
--     ability_defs.icon_asset_id       (shared ability glyph)
--     hero_perk_defs.icon_asset_id     (shared perk glyph)
--     hero_abilities.icon_asset_id     (per-hero ability override)
--     hero_perks.icon_asset_id         (per-hero perk override)
--   That shape answers "which file does THIS row show?" and nothing else. It
--   cannot express the three things the registry needs:
--     1. a STABLE IDENTIFIER that survives a rename. `display_name` is
--        editorial text and is translatable; matching on it at runtime would be
--        fuzzy matching against a string an editor can change.
--     2. a CATEGORY, so the CMS can filter a flat list and so an invalid key
--        can be rejected at write time.
--     3. a HERO-CLASS glyph AT ALL. `hero_records.hero_class` is a plain TEXT
--        enum with no asset FK, so no class icon exists anywhere in the schema
--        today. The public directory now renders one, and it has to come from a
--        named, canonical key like `hero-class:soldier`.
--   `media_assets` has alt_text / title / caption, but they are free-form
--   display metadata shared with photos, portraits and article imagery; overloading
--   them with a machine-read key would make every other consumer of that row
--   ambiguous. Hence one small table rather than a second media system.
--
-- WHY THIS IS NOT A SECOND ASSET STORE
--   An `icon_registry` row owns no bytes. `media_asset_id` is a foreign key to
--   the SAME `media_assets` table the Media Library already populates, and the
--   icon is delivered through the SAME bucket and the SAME public base URL.
--   Registering an icon therefore never uploads, copies, renames, moves or
--   duplicates an R2 object: it points at an asset that already exists. Deleting
--   a registry row likewise never deletes the underlying object — that stays the
--   Media Library's decision, guarded by `findMediaReferences`.
--
-- OWNERSHIP MODEL
--   Every row is fully editorial and hand-registered; no sync writes this table,
--   so there is no `editorial_*` shadow layer and no COALESCE needed. The
--   semantic key IS the identity; `display_name` is presentation only and is
--   never used for resolution.
--
-- CONVENTIONS (match 0001–0016):
--   * TEXT PRIMARY KEY ids, prefixed and generated server-side.
--   * UTC ISO-8601 TEXT timestamps (created_at / updated_at).
--   * IF NOT EXISTS everywhere so a re-run is a safe no-op.
--   * Never modify old migrations. This file is additive only.
--   * SQLite/D1 dialect: no ADD COLUMN IF NOT EXISTS, no ALTER ... DROP COLUMN.
--     UNIQUE always ships as a separate CREATE UNIQUE INDEX.
--
-- ROLLBACK
--   One table with no dependents: dropping `icon_registry` restores the
--   pre-0017 schema exactly. `ON DELETE SET NULL` on the media FK means an
--   operator deleting a Media Library row empties the registry entry instead of
--   cascading a delete into it; existing `icon_asset_id` columns are untouched.
--
-- ---------------------------------------------------------------------------
-- `icon_registry`
--
--   semantic_key   stable, unique, machine-read identifier. Canonical form is
--                   `<category>:<slug>`, e.g. `hero-class:soldier`,
--                   `standard-perk:hang-time`, `ability:ninja-slash`. The prefix
--                   must equal `category`, enforced by the server validator
--                   rather than a CHECK so a future category needs no migration.
--   category       one of the categories the registry actually serves. Kept
--                   TEXT (not CHECK) for the same additive reason as
--                   `resources.category` in 0016.
--   media_asset_id the canonical Media Library row. NULL means "registered but
--                   not yet bound to a file" — a real state for an editor who
--                   reserved the key before the asset was picked, and it keeps
--                   the unique key reserved while they do.
--   usage_count    NOT stored; derived at read time by the CMS from the same
--                   association tables the Media Library scans, for the same
--                   reason `media_assets` has no in-use flag.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS icon_registry (
  id TEXT PRIMARY KEY NOT NULL,
  semantic_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  media_asset_id TEXT REFERENCES media_assets (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (length(trim(semantic_key)) > 0),
  CHECK (length(trim(display_name)) > 0)
);

-- The identity constraint. Resolution is `WHERE semantic_key = ?`, so this
-- index is the read path, not just a uniqueness guarantee.
CREATE UNIQUE INDEX IF NOT EXISTS idx_icon_registry_key
  ON icon_registry (semantic_key);

-- Supports the CMS category filter and the alphabetical list ordering.
CREATE INDEX IF NOT EXISTS idx_icon_registry_category
  ON icon_registry (category, display_name);

-- Supports the batched public resolver (one query for every key on a page) and
-- the "is this asset still bound?" check. Partial: NULL binds are the common
-- un-registered case and do not need to be indexed.
CREATE INDEX IF NOT EXISTS idx_icon_registry_media
  ON icon_registry (media_asset_id)
  WHERE media_asset_id IS NOT NULL;