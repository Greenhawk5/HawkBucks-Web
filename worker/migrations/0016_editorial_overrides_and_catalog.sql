-- 0016 — Editorial override layer + Game Item Catalog promotion (ADDITIVE ONLY).
--
-- PURPOSE
--   Give HawkBucks a reliable editorial layer over reference-backed game data
--   without letting the reference sync overwrite it, and promote the existing
--   `resources` table to the canonical Game Item Catalog (materials, XP and
--   training resources, and any future reusable game item) instead of creating
--   a competing registry.
--
-- BACKGROUND (verified against scripts/sync-heroes-reference.mjs)
--   The sync's conflict whitelists UPDATE these reference columns on every run:
--     resources.display_name
--     ability_defs.display_name, ability_def_translations.name (en)
--     hero_perk_defs.display_name, hero_perk_def_translations.name+description (en)
--     hero_progression.power_min/max, level_min/max
--     hero_progression_costs.amount
--     hero_perks.slot_order
--   An editor correcting any of those values in place would be silently reverted
--   by the next sync. The sync deliberately never writes `*_asset_id` icon
--   columns, `sort_order`, `ability_def_translations.description`, or any
--   `cms_contents` / `hero_records` editorial column — those stay directly
--   editable and need no override.
--
-- OWNERSHIP MODEL (effective value = editorial override, else reference)
--   Reference columns keep receiving upstream values. Each overwritable value
--   gains a nullable `editorial_*` sibling: NULL means "no override" (the
--   reference value renders); any non-NULL value — INCLUDING 0 and '' — is an
--   explicit editorial decision that the sync must preserve. The sync's
--   INSERT/UPDATE statements name their columns explicitly and never mention
--   `editorial_*`, so overrides survive re-sync by construction. Public and CMS
--   readers resolve COALESCE(editorial_*, reference_*).
--
--   `resources` is NOT duplicated: ability_defs and hero_perk_defs keep their
--   own namespaces (migration 0014, decisions 1-3 — still valid), and weapons /
--   traps / schematics / perks carry no cost/progression structures, so no fake
--   relationship is invented for them. Catalog rows gain `category`, `status`
--   (active/retired), and `upstream_ref` so new item kinds fit without schema
--   changes; localized names live in the new `resource_translations` table.
--
-- CONVENTIONS (match 0001/0006/0007/0008/0009/0010/0011/0012/0013/0014/0015):
--   * TEXT PRIMARY KEY ids, prefixed and generated server-side.
--   * UTC ISO-8601 TEXT timestamps (created_at / updated_at).
--   * IF NOT EXISTS everywhere so a re-run is a safe no-op.
--   * Never modify old migrations. This file is additive only.
--   * SQLite/D1 dialect: no ADD COLUMN IF NOT EXISTS, no ALTER ... DROP COLUMN,
--     no ADD CONSTRAINT. UNIQUE always ships as a separate CREATE UNIQUE INDEX.
--
-- ROLLBACK
--   New tables drop in reverse dependency order. Added columns cannot be
--   dropped on older D1 SQLite; they are nullable (or defaulted) and ignored by
--   pre-0016 code paths, exactly as documented in 0014's rollback note. No
--   existing row is modified or invalidated by this migration.
--
-- ---------------------------------------------------------------------------
-- Game Item Catalog promotion: `resources` gains catalog metadata + name override.
--
-- `category` is free-form by design (material, xp, training, currency, ...):
-- a CHECK enumeration would reject item kinds the next snapshot introduces.
-- `status` is constrained: only 'active' and 'retired' are meaningful, and a
-- retired item stays queryable so existing cost rows never dangle.
-- `upstream_ref` carries an optional stable upstream identifier for future
-- snapshots; it is never derived from display text.
-- ---------------------------------------------------------------------------
ALTER TABLE resources ADD COLUMN category TEXT NOT NULL DEFAULT 'material';
ALTER TABLE resources ADD COLUMN upstream_ref TEXT;
ALTER TABLE resources ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE resources ADD COLUMN editorial_name TEXT;
ALTER TABLE resources ADD COLUMN data_source TEXT NOT NULL DEFAULT 'editorial';
ALTER TABLE resources ADD COLUMN data_snapshot_at TEXT;
CREATE INDEX IF NOT EXISTS idx_resources_status
  ON resources (status, sort_order, resource_key);

-- ---------------------------------------------------------------------------
-- Localized catalog names. The reference sync never writes this table: the
-- `en` display name arrives via resources.display_name, editors extend every
-- other locale here, and readers fall back deterministically
-- (locale -> editorial_name -> display_name -> resource_key).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS resource_translations (
  id TEXT PRIMARY KEY NOT NULL,
  resource_id TEXT NOT NULL REFERENCES resources (id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_resource_tr_resource_locale
  ON resource_translations (resource_id, locale);
CREATE INDEX IF NOT EXISTS idx_resource_tr_locale
  ON resource_translations (locale);

-- ---------------------------------------------------------------------------
-- Definition name overrides. The sync overwrites display_name / en name on
-- every run; editors write editorial_name instead and readers prefer it.
-- Icon columns stay directly editable (the sync never writes them).
-- ---------------------------------------------------------------------------
ALTER TABLE ability_defs ADD COLUMN editorial_name TEXT;
ALTER TABLE ability_def_translations ADD COLUMN editorial_name TEXT;
ALTER TABLE hero_perk_defs ADD COLUMN editorial_name TEXT;
ALTER TABLE hero_perk_def_translations ADD COLUMN editorial_name TEXT;
ALTER TABLE hero_perk_def_translations ADD COLUMN editorial_description TEXT;

-- ---------------------------------------------------------------------------
-- Progression + cost overrides.
--
-- NULL means "no override". An explicit 0 IS an override (a tier can genuinely
-- cost nothing), which is why the sentinel is NULL and not 0.
-- `editorial_excluded` suppresses a synced row from public/CMS-effective reads
-- WITHOUT deleting it: the sync re-inserts deleted rows (INSERT ... WHERE
-- true), so DELETE is not a stable "remove" for reference rows. Excluded rows
-- stay in the database, stay auditable, and can be restored. Rows the CMS
-- creates itself (data_source = 'editorial') may be hard-deleted because the
-- sync only recreates combinations present in the upstream snapshot.
-- ---------------------------------------------------------------------------
ALTER TABLE hero_progression ADD COLUMN editorial_power_min INTEGER;
ALTER TABLE hero_progression ADD COLUMN editorial_power_max INTEGER;
ALTER TABLE hero_progression ADD COLUMN editorial_level_min INTEGER;
ALTER TABLE hero_progression ADD COLUMN editorial_level_max INTEGER;
ALTER TABLE hero_progression ADD COLUMN editorial_excluded INTEGER NOT NULL DEFAULT 0;

ALTER TABLE hero_progression_costs ADD COLUMN editorial_amount INTEGER;
ALTER TABLE hero_progression_costs ADD COLUMN editorial_excluded INTEGER NOT NULL DEFAULT 0;
ALTER TABLE hero_progression_costs ADD COLUMN data_source TEXT NOT NULL DEFAULT 'stw-sync';
