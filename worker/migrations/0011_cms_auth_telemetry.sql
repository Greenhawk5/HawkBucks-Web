-- Wave 2 — auth/activity telemetry (ADDITIVE ONLY).
--
-- CONVENTIONS (match 0006/0010): IF NOT EXISTS everywhere, never modify old
-- migrations, TEXT PKs, UTC ISO-8601 TEXT timestamps.
--
-- DESIGN:
--   * cms_audit_events gains NO new columns: all telemetry rides the existing
--     metadata_json (already secret-redacted at write time by
--     sanitizeAuditMetadata in frontend/src/lib/cms/audit.ts).
--   * cms_auth_events is a NEW append-only login-history table. One row per
--     login attempt outcome (success/failure), logout, session expiry, and
--     session revocation. Privacy rules enforced at WRITE time in
--     auth-telemetry.server.ts:
--       - username stored (account identifier, required for auditing);
--       - IP stored as SHA-256 hash (hb-cms-ip-v1 domain) OR redacted label —
--         never raw IP in D1;
--       - coarse geo (country/region/city) ONLY from trusted Cloudflare
--         CF-IPCountry / CF-Region / CF-City headers, else NULL;
--       - device as short parsed label (browser/OS/family) + coarse form
--         factor (desktop/mobile/tablet/unknown) — raw User-Agent never stored;
--       - session id stored, NEVER the raw session token (hash only in
--         cms_sessions already; telemetry stores the row id prefix).
--   * Readers filter server-side; UI shows honest empty states when no rows
--     exist yet (no backfill, no fabrication).
--
-- ROLLBACK: DROP TABLE IF EXISTS cms_auth_events.

CREATE TABLE IF NOT EXISTS cms_auth_events (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL DEFAULT 'login',
  outcome TEXT NOT NULL DEFAULT 'success',
  username TEXT,
  actor_id TEXT,
  session_id TEXT,
  ip_hash TEXT,
  country TEXT,
  region TEXT,
  city TEXT,
  device_label TEXT,
  device_kind TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cms_auth_events_created
  ON cms_auth_events (created_at);
CREATE INDEX IF NOT EXISTS idx_cms_auth_events_outcome
  ON cms_auth_events (outcome);
CREATE INDEX IF NOT EXISTS idx_cms_auth_events_kind
  ON cms_auth_events (kind);
CREATE INDEX IF NOT EXISTS idx_cms_auth_events_username
  ON cms_auth_events (username);
