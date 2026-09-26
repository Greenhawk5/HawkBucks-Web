-- Phase 14: schematics / weapons / traps / perks data foundation.
--
-- DESIGN (see docs/schematics-inventory-contract.md):
--   * weapon_records / trap_records / perk_records are canonical definitions
--     (PK = content_id -> cms_contents). Schematics are separate cms_contents
--     rows referencing EXACTLY ONE weapon OR one trap (exclusive-or).
--   * Names/descriptions live in cms_content_translations (Phase 11) for every
--     entity + perk_translations for perks (mirrors hero_ability_translations).
--   * Perks are reusable; schematic_perks is the ordered join (slot_order
--     stable; UNIQUE(schematic, perk) + UNIQUE(schematic, slot)).
--   * Publishing lives ONLY in cms_contents.status. Public readers must join
--     cms_contents and require status='published' on every related entity.
--   * Subtypes are HawkBucks EDITORIAL groupings, not official Epic taxonomy.
--
-- CONVENTIONS (match 0006/0007): TEXT PKs, UTC ISO-8601 TEXT timestamps,
-- IF NOT EXISTS everywhere, never modify old migrations.

CREATE TABLE IF NOT EXISTS weapon_records (
  content_id TEXT PRIMARY KEY NOT NULL REFERENCES cms_contents (id) ON DELETE CASCADE,
  weapon_subtype TEXT NOT NULL DEFAULT 'other',
  popularity INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon_asset_id TEXT REFERENCES media_assets (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (weapon_subtype IN ('assault', 'smg', 'pistol', 'shotgun', 'sniper', 'melee', 'explosive', 'other')),
  CHECK (popularity >= 0)
);
CREATE INDEX IF NOT EXISTS idx_weapon_records_subtype ON weapon_records (weapon_subtype);
CREATE INDEX IF NOT EXISTS idx_weapon_records_sort ON weapon_records (sort_order, popularity DESC);
CREATE INDEX IF NOT EXISTS idx_weapon_records_popularity ON weapon_records (popularity DESC);
CREATE TABLE IF NOT EXISTS trap_records (
  content_id TEXT PRIMARY KEY NOT NULL REFERENCES cms_contents (id) ON DELETE CASCADE,
  trap_subtype TEXT NOT NULL DEFAULT 'other',
  popularity INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon_asset_id TEXT REFERENCES media_assets (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (trap_subtype IN ('damage', 'healer', 'utility', 'other')),
  CHECK (popularity >= 0)
);
CREATE INDEX IF NOT EXISTS idx_trap_records_subtype ON trap_records (trap_subtype);
CREATE INDEX IF NOT EXISTS idx_trap_records_sort ON trap_records (sort_order, popularity DESC);
CREATE INDEX IF NOT EXISTS idx_trap_records_popularity ON trap_records (popularity DESC);
CREATE TABLE IF NOT EXISTS perk_records (
  content_id TEXT PRIMARY KEY NOT NULL REFERENCES cms_contents (id) ON DELETE CASCADE,
  perk_key TEXT NOT NULL,
  perk_type TEXT NOT NULL DEFAULT 'other',
  popularity INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon_asset_id TEXT REFERENCES media_assets (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (perk_type IN ('offense', 'defense', 'utility', 'team', 'other')),
  CHECK (popularity >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_perk_records_key ON perk_records (perk_key);
CREATE INDEX IF NOT EXISTS idx_perk_records_type ON perk_records (perk_type);
CREATE INDEX IF NOT EXISTS idx_perk_records_sort ON perk_records (sort_order, popularity DESC);
CREATE TABLE IF NOT EXISTS perk_translations (
  id TEXT PRIMARY KEY NOT NULL,
  perk_content_id TEXT NOT NULL REFERENCES perk_records (content_id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_perk_tr_perk_locale ON perk_translations (perk_content_id, locale);
CREATE INDEX IF NOT EXISTS idx_perk_tr_locale ON perk_translations (locale);
CREATE TABLE IF NOT EXISTS schematic_records (
  content_id TEXT PRIMARY KEY NOT NULL REFERENCES cms_contents (id) ON DELETE CASCADE,
  weapon_content_id TEXT REFERENCES weapon_records (content_id) ON DELETE RESTRICT,
  trap_content_id TEXT REFERENCES trap_records (content_id) ON DELETE RESTRICT,
  popularity INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon_asset_id TEXT REFERENCES media_assets (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (weapon_content_id IS NOT NULL AND trap_content_id IS NULL) OR
    (weapon_content_id IS NULL AND trap_content_id IS NOT NULL)
  ),
  CHECK (popularity >= 0)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schematic_records_weapon ON schematic_records (weapon_content_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schematic_records_trap ON schematic_records (trap_content_id);
CREATE INDEX IF NOT EXISTS idx_schematic_records_sort ON schematic_records (sort_order, popularity DESC);
CREATE TABLE IF NOT EXISTS schematic_perks (
  id TEXT PRIMARY KEY NOT NULL,
  schematic_content_id TEXT NOT NULL REFERENCES schematic_records (content_id) ON DELETE CASCADE,
  perk_content_id TEXT NOT NULL REFERENCES perk_records (content_id) ON DELETE CASCADE,
  slot_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  CHECK (slot_order >= 0 AND slot_order <= 31)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schematic_perks_schematic_perk
  ON schematic_perks (schematic_content_id, perk_content_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_schematic_perks_schematic_slot
  ON schematic_perks (schematic_content_id, slot_order);
CREATE INDEX IF NOT EXISTS idx_schematic_perks_schematic_order
  ON schematic_perks (schematic_content_id, slot_order);
CREATE INDEX IF NOT EXISTS idx_schematic_perks_perk ON schematic_perks (perk_content_id);
