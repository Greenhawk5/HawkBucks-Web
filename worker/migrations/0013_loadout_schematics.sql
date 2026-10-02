-- Content Platform — loadout ↔ schematic recommended edges (ADDITIVE ONLY).
--
-- CONVENTIONS (match 0006–0012): IF NOT EXISTS everywhere, never modify old
-- migrations, TEXT PKs, UTC ISO-8601 TEXT timestamps.
--
-- DESIGN:
--   * loadout_schematics is the CMS-curated "recommended schematics" list per
--     loadout (ordered, gap-free, max 12). Complements loadout_heroes
--     (Commander + sparse Support) and the loadout team_perk column (0012).
--   * Both endpoints must exist; RESTRICT on the schematic side so a
--     schematic in use cannot be hard-deleted out from under a published
--     loadout. Public readers re-check published status on BOTH ends.
--
-- ROLLBACK: DROP TABLE IF EXISTS loadout_schematics.

CREATE TABLE IF NOT EXISTS loadout_schematics (
  id TEXT PRIMARY KEY NOT NULL,
  loadout_content_id TEXT NOT NULL REFERENCES loadout_records (content_id) ON DELETE CASCADE,
  schematic_content_id TEXT NOT NULL REFERENCES schematic_records (content_id) ON DELETE RESTRICT,
  slot_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  CHECK (slot_order >= 0 AND slot_order <= 11)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_loadout_schematics_unique
  ON loadout_schematics (loadout_content_id, schematic_content_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_loadout_schematics_slot
  ON loadout_schematics (loadout_content_id, slot_order);
CREATE INDEX IF NOT EXISTS idx_loadout_schematics_schematic
  ON loadout_schematics (schematic_content_id);
