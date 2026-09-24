CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  is_active INTEGER NOT NULL DEFAULT 1,
  last_notified_utc TEXT,
  last_delivered_at TEXT,
  last_failure_at TEXT,
  fail_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active
  ON push_subscriptions(is_active);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_last_notified
  ON push_subscriptions(last_notified_utc);
