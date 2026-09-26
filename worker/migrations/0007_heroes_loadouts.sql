-- Phase 12 part 1: hero_records + hero_abilities.
CREATE TABLE IF NOT EXISTS hero_records (
  content_id TEXT PRIMARY KEY NOT NULL REFERENCES cms_contents (id) ON DELETE CASCADE,
  hero_class TEXT NOT NULL DEFAULT 'soldier',
  category TEXT,
  popularity INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  portrait_asset_id TEXT REFERENCES media_assets (id) ON DELETE SET NULL,
  banner_asset_id TEXT REFERENCES media_assets (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (hero_class IN ('soldier', 'constructor', 'ninja', 'outlander')),
  CHECK (popularity >= 0)
);
CREATE INDEX IF NOT EXISTS idx_hero_records_class ON hero_records (hero_class);
CREATE INDEX IF NOT EXISTS idx_hero_records_category ON hero_records (category);
CREATE INDEX IF NOT EXISTS idx_hero_records_sort ON hero_records (sort_order, popularity DESC);
CREATE INDEX IF NOT EXISTS idx_hero_records_popularity ON hero_records (popularity DESC);
CREATE TABLE IF NOT EXISTS hero_abilities (
  id TEXT PRIMARY KEY NOT NULL,
  hero_content_id TEXT NOT NULL REFERENCES hero_records (content_id) ON DELETE CASCADE,
  ability_key TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  icon_asset_id TEXT REFERENCES media_assets (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hero_abilities_hero_key ON hero_abilities (hero_content_id, ability_key);
CREATE INDEX IF NOT EXISTS idx_hero_abilities_hero_order ON hero_abilities (hero_content_id, sort_order);
CREATE TABLE IF NOT EXISTS hero_ability_translations (
  id TEXT PRIMARY KEY NOT NULL,
  ability_id TEXT NOT NULL REFERENCES hero_abilities (id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hero_ability_tr_ability_locale ON hero_ability_translations (ability_id, locale);
CREATE INDEX IF NOT EXISTS idx_hero_ability_tr_locale ON hero_ability_translations (locale);
CREATE TABLE IF NOT EXISTS loadout_records (
  content_id TEXT PRIMARY KEY NOT NULL REFERENCES cms_contents (id) ON DELETE CASCADE,
  loadout_type TEXT NOT NULL DEFAULT 'custom',
  popularity INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  cover_asset_id TEXT REFERENCES media_assets (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (loadout_type IN ('beginner', 'meta', 'farming', 'boss', 'fun', 'custom')),
  CHECK (popularity >= 0)
);
CREATE INDEX IF NOT EXISTS idx_loadout_records_type ON loadout_records (loadout_type);
CREATE INDEX IF NOT EXISTS idx_loadout_records_sort ON loadout_records (sort_order, popularity DESC);
CREATE INDEX IF NOT EXISTS idx_loadout_records_popularity ON loadout_records (popularity DESC);
CREATE TABLE IF NOT EXISTS loadout_heroes (
  id TEXT PRIMARY KEY NOT NULL,
  loadout_content_id TEXT NOT NULL REFERENCES loadout_records (content_id) ON DELETE CASCADE,
  hero_content_id TEXT NOT NULL REFERENCES hero_records (content_id) ON DELETE CASCADE,
  slot_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_loadout_heroes_loadout_hero ON loadout_heroes (loadout_content_id, hero_content_id);
CREATE INDEX IF NOT EXISTS idx_loadout_heroes_loadout_order ON loadout_heroes (loadout_content_id, slot_order);
CREATE INDEX IF NOT EXISTS idx_loadout_heroes_hero ON loadout_heroes (hero_content_id);
