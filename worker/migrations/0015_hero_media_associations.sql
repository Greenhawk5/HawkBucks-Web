-- Hero media associations (ADDITIVE ONLY).
--
-- PURPOSE
--   Let an editor associate CMS media with the two Hero sub-entities that
--   already have a slot for it in the schema but nothing that can write it:
--   a Hero's abilities and a Hero's perks.
--
-- WHAT ALREADY EXISTED
--   hero_abilities.icon_asset_id   (0007)  per-hero, CMS-writable, validated
--                                       by assertMediaUsable, but read by no
--                                       public loader - the public icon came
--                                       only from the shared definition.
--   ability_defs.icon_asset_id     (0014)  shared reference icon.
--   hero_perk_defs.icon_asset_id   (0014)  shared reference icon.
--
--   `hero_perks` - the per-Hero join row between a hero and a perk definition -
--   had NO icon column, so an editor could not give ONE hero a different perk
--   image without duplicating the perk definition for that hero. Duplicating a
--   definition to carry an image is exactly the thing this migration avoids:
--   `hero_perk_defs.perk_key` is slot-scoped and shared across the whole game,
--   so a duplicate ("standard/monster-smash-2") would corrupt uniqueness, the
--   perk facet counts and the translation join.
--
-- DESIGN
--   The association lives on the PER-HERO join row, mirroring
--   hero_abilities.icon_asset_id exactly:
--
--     hero ability icon  = COALESCE(hero_abilities.icon_asset_id,
--                                   ability_defs.icon_asset_id)
--     hero perk icon     = COALESCE(hero_perks.icon_asset_id,
--                                   hero_perk_defs.icon_asset_id)
--
--   The per-Hero value is an EDITORIAL OVERRIDE. The definition value stays the
--   shared default, which is what a media backfill should populate once for a
--   perk definition instead of once per hero. Reading is therefore
--   additive: a hero with no override renders the shared icon unchanged.
--
--   media_assets is the ONLY media source, referenced by its stable opaque
--   `media_assets.id`. No URL, filename or object key is ever stored here, so
--   the CMS picker's contract (return an asset id) stays the contract, and
--   `ON DELETE SET NULL` mirrors every other media reference in the schema.
--
-- CONVENTIONS (match 0001/0006/0007/0008/0009/0010/0011/0012/0013/0014):
--   * IF NOT EXISTS everywhere so a re-run is a safe no-op.
--   * Never modify old migrations. This file is additive only.
--   * SQLite/D1 dialect: no ADD COLUMN IF NOT EXISTS, no ALTER ... DROP COLUMN.
--
-- ROLLBACK
--   The column cannot be dropped (older D1 SQLite has no DROP COLUMN). It is
--   nullable and ignored by every pre-0015 read path, so leaving it in place is
--   the documented rollback, exactly as in 0012 and 0014.

ALTER TABLE hero_perks ADD COLUMN icon_asset_id TEXT
  REFERENCES media_assets (id) ON DELETE SET NULL;

-- Backwards lookup: "which heroes use this asset as a perk icon". Same shape as
-- idx_hero_perks_def / idx_hero_abilities_hero_order, so the reference finder
-- that the delete path consults runs one index scan.
CREATE INDEX IF NOT EXISTS idx_hero_perks_icon
  ON hero_perks (icon_asset_id)
  WHERE icon_asset_id IS NOT NULL;
