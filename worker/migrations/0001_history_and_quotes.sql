CREATE TABLE IF NOT EXISTS mission_history (
  date_utc TEXT PRIMARY KEY NOT NULL,
  total_vbucks INTEGER NOT NULL DEFAULT 0,
  mission_count INTEGER NOT NULL DEFAULT 0,
  missions_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS daily_quotes (
  date_utc TEXT PRIMARY KEY NOT NULL,
  quote TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
