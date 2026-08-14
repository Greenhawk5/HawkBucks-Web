-- Correct only the synthetic rows created by the already-applied 0002 seed.
-- The timestamp and empty payload identify that seed; genuine Worker snapshots are untouched.
-- This migration is idempotent and does not insert future-dated records.

UPDATE mission_history
SET total_vbucks = CASE date_utc
      WHEN '2026-07-01' THEN 700
      ELSE 0
    END,
    mission_count = CASE date_utc
      WHEN '2026-07-01' THEN 14
      ELSE 0
    END,
    updated_at = datetime('now')
WHERE created_at = '2026-08-13 20:46:45'
  AND missions_json = '[]'
  AND date_utc >= '2026-07-01'
  AND date_utc < '2026-08-01';

UPDATE mission_history
SET total_vbucks = CASE date_utc
      WHEN '2026-08-01' THEN 350
      WHEN '2026-08-03' THEN 50
      WHEN '2026-08-04' THEN 50
      WHEN '2026-08-10' THEN 50
      WHEN '2026-08-11' THEN 50
      WHEN '2026-08-12' THEN 50
      ELSE 0
    END,
    mission_count = CASE date_utc
      WHEN '2026-08-01' THEN 7
      WHEN '2026-08-03' THEN 1
      WHEN '2026-08-04' THEN 1
      WHEN '2026-08-10' THEN 1
      WHEN '2026-08-11' THEN 1
      WHEN '2026-08-12' THEN 1
      ELSE 0
    END,
    updated_at = datetime('now')
WHERE created_at = '2026-08-13 20:46:45'
  AND missions_json = '[]'
  AND date_utc >= '2026-08-01'
  AND date_utc < '2026-08-13';

UPDATE mission_history
SET mission_count = 93,
    updated_at = datetime('now')
WHERE date_utc = '2026-01-01'
  AND total_vbucks = 4650
  AND mission_count = 107
  AND created_at = '2026-08-13 20:46:45'
  AND missions_json = '[]';
