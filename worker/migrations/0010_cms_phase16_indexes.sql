-- Phase 16 — Editorial content system (ADDITIVE ONLY).
--
-- CONVENTIONS (match 0006/0007/0008/0009/0010): IF NOT EXISTS everywhere,
-- never modify old migrations, TEXT PKs, UTC ISO-8601 TEXT timestamps.
--
-- DESIGN:
--   * Editorial articles reuse the generic Phase 11 primitives: lifecycle in
--     cms_contents (entity_type='article'), localized titles/bodies/slugs in
--     cms_content_translations + cms_slugs, preview grants in
--     cms_preview_tokens, audit in cms_audit_events, images in media_assets.
--   * This migration adds ONLY article-scoped tables for the structured
--     editorial layer: categories, tags, structured body documents, media
--     attachments, entity references, and explicit related-content edges.
--   * Article body itself is stored as versioned structured JSON
--     (article_bodies.body_json), validated server-side by
--     frontend/src/lib/cms/articles.ts. Arbitrary HTML is never the primary
--     representation; public rendering serializes supported blocks only.
--   * Publishing stays in cms_contents.status. Public readers join
--     cms_contents and require status='published' plus translation fallback.
--   * Drafts reserve slugs exactly like published rows (Phase 11 behavior).
--
-- ROLLBACK: DROP TABLE IF EXISTS each table below, in reverse dependency
-- order (edges first, categories/tags last). No shared-table changes here.

CREATE TABLE IF NOT EXISTS article_categories (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_article_categories_slug
  ON article_categories (slug);
CREATE INDEX IF NOT EXISTS idx_article_categories_sort
  ON article_categories (sort_order);

CREATE TABLE IF NOT EXISTS article_tags (
  id TEXT PRIMARY KEY NOT NULL,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_article_tags_slug
  ON article_tags (slug);

-- Structured body: one row per (article, locale). body_json is the versioned
-- block document; excerpt is plain-text search/listing fallback derived
-- server-side from supported blocks (never raw HTML).
CREATE TABLE IF NOT EXISTS article_bodies (
  article_content_id TEXT NOT NULL REFERENCES cms_contents (id) ON DELETE CASCADE,
  locale TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  body_json TEXT NOT NULL DEFAULT '{"version":1,"blocks":[]}',
  excerpt TEXT NOT NULL DEFAULT '',
  cover_asset_id TEXT REFERENCES media_assets (id) ON DELETE SET NULL,
  category_id TEXT REFERENCES article_categories (id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (article_content_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_article_bodies_locale
  ON article_bodies (locale);
CREATE INDEX IF NOT EXISTS idx_article_bodies_category
  ON article_bodies (category_id);

CREATE TABLE IF NOT EXISTS article_tag_links (
  id TEXT PRIMARY KEY NOT NULL,
  article_content_id TEXT NOT NULL REFERENCES cms_contents (id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES article_tags (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_article_tag_links_unique
  ON article_tag_links (article_content_id, tag_id);
CREATE INDEX IF NOT EXISTS idx_article_tag_links_tag
  ON article_tag_links (tag_id);

-- Entity references: validated server-side against the canonical
-- content-type registry (article may reference heroes, loadouts, weapons,
-- traps, perks, schematics). target_content_id must exist in cms_contents.
CREATE TABLE IF NOT EXISTS article_entity_refs (
  id TEXT PRIMARY KEY NOT NULL,
  article_content_id TEXT NOT NULL REFERENCES cms_contents (id) ON DELETE CASCADE,
  target_content_id TEXT NOT NULL REFERENCES cms_contents (id) ON DELETE CASCADE,
  target_entity_type TEXT NOT NULL,
  slot_order INTEGER NOT NULL DEFAULT 0,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_article_entity_refs_article
  ON article_entity_refs (article_content_id);
CREATE INDEX IF NOT EXISTS idx_article_entity_refs_target
  ON article_entity_refs (target_content_id);
CREATE INDEX IF NOT EXISTS idx_article_entity_refs_type
  ON article_entity_refs (target_entity_type);

-- Article media attachments: reuse media_assets lifecycle + reference guard.
CREATE TABLE IF NOT EXISTS article_media (
  id TEXT PRIMARY KEY NOT NULL,
  article_content_id TEXT NOT NULL REFERENCES cms_contents (id) ON DELETE CASCADE,
  asset_id TEXT NOT NULL REFERENCES media_assets (id) ON DELETE RESTRICT,
  slot_order INTEGER NOT NULL DEFAULT 0,
  caption TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_article_media_article
  ON article_media (article_content_id);
CREATE INDEX IF NOT EXISTS idx_article_media_asset
  ON article_media (asset_id);

-- Explicit related-content edges (editorial curation). Fallback discovery
-- (same category/tags) is computed at read time, never stored.
CREATE TABLE IF NOT EXISTS article_related (
  id TEXT PRIMARY KEY NOT NULL,
  article_content_id TEXT NOT NULL REFERENCES cms_contents (id) ON DELETE CASCADE,
  related_content_id TEXT NOT NULL REFERENCES cms_contents (id) ON DELETE CASCADE,
  slot_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  CHECK (article_content_id != related_content_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_article_related_unique
  ON article_related (article_content_id, related_content_id);
CREATE INDEX IF NOT EXISTS idx_article_related_related
  ON article_related (related_content_id);

