WITH RECURSIVE offsets(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM offsets WHERE n < 59
), seed_rows AS (
  SELECT
    date('now', printf('-%d days', n)) AS date_utc,
    CASE
      WHEN n = 0 THEN 0
      WHEN n = 1 THEN 50
      WHEN n BETWEEN 2 AND 6 THEN 20
      WHEN n = 7 THEN 10
      WHEN n BETWEEN 8 AND 13 THEN 15
      WHEN n BETWEEN 14 AND 28 THEN 20
      WHEN n = 29 THEN 50
      WHEN n = 30 THEN 700
      ELSE 0
    END AS total_vbucks
  FROM offsets
)
INSERT OR IGNORE INTO mission_history
  (date_utc, total_vbucks, mission_count, missions_json, created_at, updated_at)
SELECT date_utc, total_vbucks, 0, '[]', datetime('now'), datetime('now')
FROM seed_rows;

INSERT OR IGNORE INTO mission_history
  (date_utc, total_vbucks, mission_count, missions_json, created_at, updated_at)
SELECT date('now', 'start of year'), 4650, 0, '[]', datetime('now'), datetime('now')
WHERE CAST(julianday('now') - julianday(date('now', 'start of year')) AS INTEGER) >= 30;
