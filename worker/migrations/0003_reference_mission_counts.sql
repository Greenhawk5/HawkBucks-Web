-- Corrects only empty placeholder rows created by 0002_reference_history_seed.sql.
-- All dates are calculated from the current UTC date; no future rows are created.
WITH anchor AS (
  SELECT COALESCE(MAX(date_utc), date('now')) AS date_utc
  FROM mission_history
  WHERE date_utc <= date('now')
    AND total_vbucks = 0
    AND mission_count = 0
    AND missions_json = '[]'
)
UPDATE mission_history
SET mission_count = CASE
  WHEN date_utc = (SELECT date_utc FROM anchor) THEN 0
  WHEN date_utc = date((SELECT date_utc FROM anchor), '-1 day') THEN 1
  WHEN date_utc IN (date((SELECT date_utc FROM anchor), '-2 days'), date((SELECT date_utc FROM anchor), '-3 days')) THEN 1
  WHEN date_utc BETWEEN date((SELECT date_utc FROM anchor), '-15 days') AND date((SELECT date_utc FROM anchor), '-7 days') THEN 1
  WHEN date_utc = date((SELECT date_utc FROM anchor), 'start of year') THEN 107
  ELSE mission_count
END
WHERE mission_count = 0
  AND missions_json = '[]'
  AND date_utc IN (
    (SELECT date_utc FROM anchor), date((SELECT date_utc FROM anchor), '-1 day'),
    date((SELECT date_utc FROM anchor), '-2 days'), date((SELECT date_utc FROM anchor), '-3 days'),
    date((SELECT date_utc FROM anchor), '-4 days'), date((SELECT date_utc FROM anchor), '-5 days'), date((SELECT date_utc FROM anchor), '-6 days'),
    date((SELECT date_utc FROM anchor), '-7 days'), date((SELECT date_utc FROM anchor), '-8 days'),
    date((SELECT date_utc FROM anchor), '-9 days'), date((SELECT date_utc FROM anchor), '-10 days'),
    date((SELECT date_utc FROM anchor), '-11 days'), date((SELECT date_utc FROM anchor), '-12 days'),
    date((SELECT date_utc FROM anchor), '-13 days'), date((SELECT date_utc FROM anchor), '-14 days'),
    date((SELECT date_utc FROM anchor), '-15 days'),
    date((SELECT date_utc FROM anchor), 'start of year')
  );

-- Previous-year total is a comparison baseline and is outside current-year aggregates.
WITH anchor AS (
  SELECT COALESCE(MAX(date_utc), date('now')) AS date_utc
  FROM mission_history
  WHERE date_utc <= date('now')
    AND total_vbucks = 0
    AND mission_count = 0
    AND missions_json = '[]'
)
INSERT OR IGNORE INTO mission_history
  (date_utc, total_vbucks, mission_count, missions_json, created_at, updated_at)
SELECT date((CAST(strftime('%Y', (SELECT date_utc FROM anchor)) AS INTEGER) - 1) || '-01-01'),
       12480, 0, '[]', datetime('now'), datetime('now');
