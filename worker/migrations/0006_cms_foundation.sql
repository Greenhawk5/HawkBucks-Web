-- Phase 11 — CMS foundation.
--
-- OWNERSHIP: this D1 database is shared by the backend Worker
-- (worker/wrangler.toml, migrations_dir = "migrations") and the frontend
-- server boundary (frontend server functions resolve the same database via
-- the request-scoped Cloudflare env — see frontend/src/lib/cms/db.server.ts
-- and docs/cms-foundation.md). Migrations live ONLY here; the frontend never
-- carries its own migration set.
--
-- CONVENTIONS (match 0001_history_and_quotes.sql):
--   * TEXT PRIMARY KEY ids (prefixed nanoid/uuid generated server-side).
--   * UTC ISO-8601 TEXT timestamps (created_at / updated_at), consistent with
--     mission_history / daily_quotes.
--   * Monetary/count integers as INTEGER.
--   * Binary media is NEVER stored here — only provider-independent metadata.
--     The physical bytes live with the media provider (ImageKit in Phase 11,
--     R2 in the future); D1 holds the logical asset record.
--
-- SCOPE: generic foundation tables only. Phase 12+ entities (heroes,
-- loadouts, schematics, ...) reference cms_contents by content id instead of
-- creating parallel publishing/translation/slug infrastructure.

-- ---------------------------------------------------------------------------
-- Admin identities. Separate from any future end-user accounts: CMS
-- authentication is its own boundary (see auth.server.ts). Passwords are
-- stored as PBKDF2 envelopes (pbkdf2$iter$salt$hash), never plaintext.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_users (
  id TEXT PRIMARY KEY NOT NULL,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor',
  password_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cms_users_username
  ON cms_users (username);

-- ---------------------------------------------------------------------------
-- Server-side CMS sessions. Only a random token HASH is stored; the raw token
-- lives exclusively in the HttpOnly session cookie. Revocation = delete row
-- (or set revoked_at). Expiry is enforced server-side on every request.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES cms_users (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_cms_sessions_user
  ON cms_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_cms_sessions_token
  ON cms_sessions (token_hash);

-- ---------------------------------------------------------------------------
-- Logical media assets. Provider-independent: `provider` names the physical
-- store ('imagekit' in Phase 11, 'r2' in the future) and `provider_asset_id`
-- is opaque to every consumer except that provider's implementation.
-- ImageKit-only concepts (fileId vs filePath, transformation endpoints) stay
-- inside the provider implementation and the provider_* columns — never in
-- the content models that reference media_assets by id.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY NOT NULL,
  provider TEXT NOT NULL,
  provider_asset_id TEXT NOT NULL,
  delivery_url TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER,
  width INTEGER,
  height INTEGER,
  alt_text TEXT NOT NULL DEFAULT '',
  title TEXT,
  caption TEXT,
  status TEXT NOT NULL DEFAULT 'ready',
  created_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- One physical asset is referenced at most once per provider.
CREATE UNIQUE INDEX IF NOT EXISTS idx_media_assets_provider_asset
  ON media_assets (provider, provider_asset_id);
CREATE INDEX IF NOT EXISTS idx_media_assets_status
  ON media_assets (status);
CREATE INDEX IF NOT EXISTS idx_media_assets_created
  ON media_assets (created_at);

-- ---------------------------------------------------------------------------
-- Generic content base. Every future CMS entity (hero, loadout, article, ...)
-- gets one row here carrying the publishing lifecycle; entity-specific fields
-- live in Phase 12+ tables keyed by content id. `entity_type` partitions the
-- id space so slugs, audit events and preview tokens stay unambiguous.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_contents (
  id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL,
  default_locale TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TEXT,
  created_by TEXT,
  updated_by TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cms_contents_entity_status
  ON cms_contents (entity_type, status);
CREATE INDEX IF NOT EXISTS idx_cms_contents_published
  ON cms_contents (published_at);

-- ---------------------------------------------------------------------------
-- Content translations. Normalized (one row per content × locale) so adding a
-- locale never alters entity tables. SEO fields live here — not in a parallel
-- table — because SEO metadata is inherently localized (Phase 6 parity).
-- `slug` is duplicated from cms_slugs for read convenience but cms_slugs is
-- the uniqueness authority; writers must update both in one transaction
-- (see db.server.ts upsertContentTranslation).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_content_translations (
  id TEXT PRIMARY KEY NOT NULL,
  content_id TEXT NOT NULL REFERENCES cms_contents (id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL DEFAULT '',
  seo_title TEXT,
  seo_description TEXT,
  seo_canonical_override TEXT,
  seo_robots TEXT,
  og_title TEXT,
  og_description TEXT,
  og_image_asset_id TEXT REFERENCES media_assets (id) ON DELETE SET NULL,
  translation_status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_translations_content_locale
  ON cms_content_translations (content_id, locale);
CREATE INDEX IF NOT EXISTS idx_cms_translations_locale
  ON cms_content_translations (locale);

-- ---------------------------------------------------------------------------
-- Slug registry — the uniqueness authority. Scoped by (entity_type, locale):
-- the same slug may exist for a hero and an article, or in 'en' and 'es',
-- but never twice for the same entity type in the same locale. Drafts reserve
-- slugs exactly like published rows so a draft can never shadow (or be
-- shadowed by) a published URL at publish time.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_slugs (
  id TEXT PRIMARY KEY NOT NULL,
  entity_type TEXT NOT NULL,
  content_id TEXT NOT NULL REFERENCES cms_contents (id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_slugs_entity_locale_slug
  ON cms_slugs (entity_type, locale, slug);
CREATE INDEX IF NOT EXISTS idx_cms_slugs_content
  ON cms_slugs (content_id);

-- ---------------------------------------------------------------------------
-- Audit trail. Append-only by convention: application code only INSERTs and
-- SELECTs (no UPDATE/DELETE helpers exist in db.server.ts). Actor identity,
-- action, resource and timestamp are mandatory; metadata_json carries a
-- redacted diff summary — never secrets, tokens, or password material.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_audit_events (
  id TEXT PRIMARY KEY NOT NULL,
  actor_id TEXT,
  actor_username TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cms_audit_entity
  ON cms_audit_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cms_audit_actor
  ON cms_audit_events (actor_id);
CREATE INDEX IF NOT EXISTS idx_cms_audit_created
  ON cms_audit_events (created_at);

-- ---------------------------------------------------------------------------
-- Preview tokens. Short-lived, single-purpose grants that let an authorized
-- editor share an unpublished draft URL. Only the SHA-256 HASH is stored; the
-- raw token is shown once at creation. Expiry + revocation enforced
-- server-side; preview responses are always noindex, nofollow, no-store.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_preview_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  content_id TEXT NOT NULL REFERENCES cms_contents (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_cms_preview_content
  ON cms_preview_tokens (content_id);
CREATE INDEX IF NOT EXISTS idx_cms_preview_token
  ON cms_preview_tokens (token_hash);
