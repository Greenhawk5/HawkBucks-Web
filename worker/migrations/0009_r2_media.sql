-- Phase 15.5 — R2 media migration support.
--
-- CONVENTIONS (match 0006_cms_foundation.sql): IF NOT EXISTS everywhere,
-- never modify old migrations, TEXT PKs, UTC ISO-8601 TEXT timestamps.
--
-- STRATEGY: no data rewrite. Existing media_assets rows (provider='imagekit')
-- keep serving through the compatibility layer (see
-- frontend/src/lib/cms/media-compat.ts). New uploads write provider='r2' with
-- key-only provider_asset_id (e.g. 'heroes/kyle.webp') — never a full URL.
--
-- ROLLBACK: drop nothing. If R2 must be abandoned, stop writing provider='r2'
-- rows; ImageKit rows are untouched and keep rendering. Delete new R2 rows
-- only after confirming no content references them.

-- Index new uploads by provider for migration monitoring
-- (how many rows per provider, what still needs moving).
CREATE INDEX IF NOT EXISTS idx_media_assets_provider
  ON media_assets (provider);
