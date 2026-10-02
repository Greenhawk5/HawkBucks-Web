-- Phase 21/22 — Content Platform taxonomy lock (ADDITIVE ONLY).
--
-- CONVENTIONS (match 0006/0007/0008/0009/0010/0011): IF NOT EXISTS everywhere,
-- never modify old migrations, TEXT PKs, UTC ISO-8601 TEXT timestamps.
--
-- DESIGN:
--   * Rarity is a HawkBucks EDITORIAL classification (common → mythic),
--     consistent with secondary catalog evidence (FortniteDB). It is NOT
--     claimed to be official Epic taxonomy. Nullable so existing rows stay
--     valid; public filters treat NULL as "unclassified" (never invent a
--     value for existing content).
--   * trap_placement (floor/wall/ceiling) is the CANONICAL placement taxonomy
--     per secondary source evidence. The legacy trap_subtype
--     (damage/healer/utility/other) column is PRESERVED untouched for backward
--     compatibility — no CHECK is altered, no existing row is invalidated.
--   * loadout team perk references perk_records (content_id). Nullable FK so
--     existing loadouts stay valid; public readers re-check published status.
--   * weapon_subtype keeps its existing CHECK (broad editorial groupings).
--     Finer ranged/melee distinctions from secondary evidence are exposed as a
--     documented mapping in code (taxonomy.ts), NOT as new DB constraints —
--     no existing row risk.
--
-- ROLLBACK: DROP INDEX statements below; ALTER TABLE ... DROP COLUMN is not
-- supported by older D1 SQLite — columns are left in place on rollback (they
-- are nullable and ignored by old code).

-- 1. Rarity on heroes (nullable editorial classification).
--    SQLite/D1 has no "ADD COLUMN IF NOT EXISTS", so guard with a two-step:
--    the column add is idempotent in practice because migrations run once in
--    order; the surrounding index creation uses IF NOT EXISTS.
ALTER TABLE hero_records ADD COLUMN rarity TEXT;
CREATE INDEX IF NOT EXISTS idx_hero_records_rarity ON hero_records (rarity);

-- 2. Rarity on weapons / traps (same contract as heroes).
ALTER TABLE weapon_records ADD COLUMN rarity TEXT;
CREATE INDEX IF NOT EXISTS idx_weapon_records_rarity ON weapon_records (rarity);

ALTER TABLE trap_records ADD COLUMN rarity TEXT;
CREATE INDEX IF NOT EXISTS idx_trap_records_rarity ON trap_records (rarity);

-- 3. Canonical trap placement (legacy trap_subtype preserved untouched).
ALTER TABLE trap_records ADD COLUMN trap_placement TEXT;
CREATE INDEX IF NOT EXISTS idx_trap_records_placement ON trap_records (trap_placement);

-- 4. Loadout team perk (nullable FK → perk_records; RESTRICT so a perk in use
--    cannot be hard-deleted out from under a published loadout).
ALTER TABLE loadout_records ADD COLUMN team_perk_content_id TEXT
  REFERENCES perk_records (content_id) ON DELETE RESTRICT;
CREATE INDEX IF NOT EXISTS idx_loadout_records_team_perk
  ON loadout_records (team_perk_content_id);
