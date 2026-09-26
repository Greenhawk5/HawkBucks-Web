/**
 * Phase 11 — CMS D1 storage layer (SERVER-ONLY).
 *
 * server-only marker: D1 bindings and every query live behind the TanStack
 * Start server boundary. Browser code reaches CMS data exclusively through
 * server functions that call into this module; no privileged DB handle ever
 * crosses into a client bundle.
 *
 * Data-plane decision (see docs/cms-foundation.md): frontend server functions
 * resolve the SAME D1 database the backend Worker owns (shared database_id)
 * via the request-scoped Cloudflare env — the identical mechanism as
 * services/missions.server.ts (getRequest().runtime.cloudflare.env). The
 * missions/history/quote path through HAWKBUCKS_API is untouched; CMS CRUD
 * is too chatty to tunnel through the missions Worker, so it binds D1
 * directly. Deployment wires the binding (frontend/wrangler.json); without
 * it every CMS operation fails closed with an explicit error.
 *
 * PUBLIC vs PRIVATE separation is enforced HERE, not in routes:
 *   * getPublishedBySlug / listPublishedByEntity filter status='published'.
 *   * Drafts, audit events, sessions, preview hashes have NO public reader.
 *   * Preview access goes through verifyPreviewToken + explicit caller check.
 */

import "@tanstack/react-start/server-only";

import { buildAuditEvent, type AuditAction, type AuditActor, type AuditEvent } from "./audit";
import { normalizeSlug, resolveSlugCollision, isValidSlug } from "./slugs";
import { canTransitionStatus, isContentStatus, type ContentStatus } from "./publish";
import { CmsAuthError } from "./auth.server";
import type { MediaAssetStatus, MediaProviderId } from "./media-provider";

/** Minimal structural D1 surface (real binding or test double). */
export interface D1Result<T> {
  results: T[];
}
export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  first<T>(column?: string): Promise<T | null>;
  all<T>(): Promise<D1Result<T>>;
  run(): Promise<unknown>;
}
export interface D1Database {
  prepare(query: string): D1Statement;
  batch(statements: D1Statement[]): Promise<unknown[]>;
}
export type D1Row = Record<string, string | number | null>;

export interface CmsEnv {
  DB?: D1Database;
  CMS_DB?: D1Database;
}

/**
 * Known Cloudflare Worker env keys the CMS reads. Declared (not indexed) so
 * `noPropertyAccessFromIndexSignature` stays satisfied; unknown keys are
 * never read. Secrets are set via `wrangler secret put`, never in source.
 */
export interface CmsWorkerEnv {
  DB?: D1Database;
  CMS_DB?: D1Database;
  CMS_ADMIN_USERNAME?: unknown;
  CMS_ADMIN_PASSWORD_HASH?: unknown;
  IMAGEKIT_PRIVATE_KEY?: unknown;
  IMAGEKIT_PUBLIC_KEY?: unknown;
  IMAGEKIT_URL_ENDPOINT?: unknown;
}

/** Resolve the CMS database from the request env. Fail-closed, always. */
export function resolveCmsDb(env: CmsEnv | undefined | null): D1Database {
  const db = env?.DB ?? env?.CMS_DB;
  if (!db || typeof db.prepare !== "function") {
    throw new Error(
      "CMS database binding is not available. " +
        "Wire the shared D1 database to the frontend Worker (frontend/wrangler.json) " +
        "— CMS operations never fall back to mock data in production.",
    );
  }
  return db;
}

/**
 * Resolve the CMS database for the CURRENT request (server functions / SSR).
 * Reads the per-request Cloudflare env attached by Nitro's cloudflare-pages
 * runtime — the identical mechanism as services/missions.server.ts, so
 * concurrent requests each observe their own env and no mutable global state
 * is involved. Throws fail-closed outside the Cloudflare runtime.
 */
export async function resolveRequestCmsDb(): Promise<{
  db: D1Database;
  env: CmsWorkerEnv;
}> {
  const { getCmsRequest } = await import("./auth.server");
  const request = getCmsRequest();
  const env = (
    request as unknown as {
      runtime?: { cloudflare?: { env?: CmsWorkerEnv } };
    }
  )?.runtime?.cloudflare?.env;
  if (!env) {
    throw new Error(
      "CMS database binding is not available: no Cloudflare request context. " +
        "CMS server functions require the Cloudflare runtime.",
    );
  }
  const db = (env.DB ?? env.CMS_DB) as D1Database | undefined;
  if (!db || typeof db.prepare !== "function") {
    throw new Error(
      "CMS database binding is not available. " +
        "Wire the shared D1 database to the frontend Worker (frontend/wrangler.json).",
    );
  }
  return { db, env };
}

function utcNow(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

// ---------------------------------------------------------------------------
// Media assets.
// ---------------------------------------------------------------------------

export interface CreateMediaAssetInput {
  provider: MediaProviderId;
  providerAssetId: string;
  deliveryUrl: string;
  originalFilename: string;
  mimeType: string;
  byteSize?: number | null;
  width?: number | null;
  height?: number | null;
  altText?: string;
  title?: string | null;
  caption?: string | null;
  createdBy?: string | null;
}

export interface MediaAssetRow extends D1Row {
  id: string;
  provider: string;
  provider_asset_id: string;
  delivery_url: string;
  original_filename: string;
  mime_type: string;
  byte_size: number | null;
  width: number | null;
  height: number | null;
  alt_text: string;
  title: string | null;
  caption: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const MEDIA_LIST_STATUSES: readonly string[] = ["ready", "processing", "failed", "deleted"];

export async function createMediaAsset(
  db: D1Database,
  input: CreateMediaAssetInput,
): Promise<MediaAssetRow> {
  const timestamp = utcNow();
  const row: MediaAssetRow = {
    id: newId("media"),
    provider: input.provider,
    provider_asset_id: input.providerAssetId,
    delivery_url: input.deliveryUrl,
    original_filename: input.originalFilename,
    mime_type: input.mimeType,
    byte_size: input.byteSize ?? null,
    width: input.width ?? null,
    height: input.height ?? null,
    alt_text: input.altText ?? "",
    title: input.title ?? null,
    caption: input.caption ?? null,
    status: "ready",
    created_by: input.createdBy ?? null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  await db
    .prepare(
      `INSERT INTO media_assets
        (id, provider, provider_asset_id, delivery_url, original_filename, mime_type,
         byte_size, width, height, alt_text, title, caption, status, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.provider,
      row.provider_asset_id,
      row.delivery_url,
      row.original_filename,
      row.mime_type,
      row.byte_size,
      row.width,
      row.height,
      row.alt_text,
      row.title,
      row.caption,
      row.status,
      row.created_by,
      row.created_at,
      row.updated_at,
    )
    .run();
  return row;
}

export async function getMediaAssetById(db: D1Database, id: string): Promise<MediaAssetRow | null> {
  return db.prepare("SELECT * FROM media_assets WHERE id = ?").bind(id).first<MediaAssetRow>();
}

export async function listMediaAssets(
  db: D1Database,
  options: {
    status?: MediaAssetStatus;
    provider?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<MediaAssetRow[]> {
  const limit = Math.max(1, Math.min(100, Math.floor(options.limit ?? 50)));
  const offset = Math.max(0, Math.floor(options.offset ?? 0));
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (options.status !== undefined) {
    if (!MEDIA_LIST_STATUSES.includes(options.status)) {
      throw new Error(`Unknown media status: ${options.status}`);
    }
    clauses.push("status = ?");
    values.push(options.status);
  }
  if (options.provider !== undefined) {
    clauses.push("provider = ?");
    values.push(options.provider);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const { results } = await db
    .prepare(`SELECT * FROM media_assets ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .bind(...values, limit, offset)
    .all<MediaAssetRow>();
  return results;
}

/**
 * Tombstone a media row AFTER the provider's physical asset was removed.
 * The row is kept as status='deleted' (provenance for audit/history), never
 * hard-deleted by application code.
 */
export async function tombstoneMediaAsset(db: D1Database, id: string): Promise<void> {
  await db
    .prepare("UPDATE media_assets SET status = 'deleted', updated_at = ? WHERE id = ?")
    .bind(utcNow(), id)
    .run();
}

// ---------------------------------------------------------------------------
// Content base + publishing.
// ---------------------------------------------------------------------------

export interface ContentRow extends D1Row {
  id: string;
  entity_type: string;
  default_locale: string;
  status: string;
  published_at: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export async function createContent(
  db: D1Database,
  input: { entityType: string; defaultLocale?: string; createdBy?: string | null },
  actor: AuditActor,
): Promise<ContentRow> {
  if (!/^[a-z][a-z0-9_]{1,63}$/.test(input.entityType)) {
    throw new Error(`Invalid entity_type: ${input.entityType}`);
  }
  const timestamp = utcNow();
  const id = newId("cms");
  await db
    .prepare(
      `INSERT INTO cms_contents
        (id, entity_type, default_locale, status, published_at, created_by, updated_by, created_at, updated_at)
       VALUES (?, ?, ?, 'draft', NULL, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.entityType,
      input.defaultLocale ?? "en",
      input.createdBy ?? null,
      input.createdBy ?? null,
      timestamp,
      timestamp,
    )
    .run();
  const event = buildAuditEvent({
    actor,
    action: "content.create",
    entityType: input.entityType,
    entityId: id,
  });
  await recordAuditEvent(db, event);
  const row = await db
    .prepare("SELECT * FROM cms_contents WHERE id = ?")
    .bind(id)
    .first<ContentRow>();
  if (!row) throw new Error("Failed to read back created content.");
  return row;
}

export async function getContentById(db: D1Database, id: string): Promise<ContentRow | null> {
  return db.prepare("SELECT * FROM cms_contents WHERE id = ?").bind(id).first<ContentRow>();
}

/**
 * Server-controlled status change. Illegal transitions throw; publish sets
 * published_at, unpublish/archival clears nothing historical (published_at
 * stays as last-publish evidence) and every change writes an audit event.
 */
export async function setContentStatus(
  db: D1Database,
  input: { contentId: string; to: ContentStatus; updatedBy?: string | null },
  actor: AuditActor,
): Promise<ContentRow> {
  const current = await getContentById(db, input.contentId);
  if (!current || !isContentStatus(current.status)) {
    throw new Error(`Content not found: ${input.contentId}`);
  }
  const from = current.status;
  if (!canTransitionStatus(from, input.to)) {
    throw new Error(`Illegal status transition: ${from} → ${input.to}`);
  }
  const timestamp = utcNow();
  const publishedAt = input.to === "published" ? timestamp : current.published_at;
  await db
    .prepare(
      `UPDATE cms_contents SET status = ?, published_at = ?, updated_by = ?, updated_at = ? WHERE id = ?`,
    )
    .bind(input.to, publishedAt, input.updatedBy ?? null, timestamp, input.contentId)
    .run();
  const action: AuditAction =
    input.to === "published"
      ? "content.publish"
      : input.to === "archived"
        ? "content.archive"
        : "content.unpublish";
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action,
      entityType: current.entity_type,
      entityId: current.id,
      metadata: { from, to: input.to },
    }),
  );
  const updated = await getContentById(db, input.contentId);
  if (!updated) throw new Error("Failed to read back updated content.");
  return updated;
}

// ---------------------------------------------------------------------------
// Translations + slugs.
// ---------------------------------------------------------------------------

export interface ContentTranslationRow extends D1Row {
  id: string;
  content_id: string;
  locale: string;
  title: string;
  body: string;
  slug: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_canonical_override: string | null;
  seo_robots: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_asset_id: string | null;
  translation_status: string;
  created_at: string;
  updated_at: string;
}

export interface UpsertTranslationInput {
  contentId: string;
  locale: string;
  title: string;
  body: string;
  slug: string;
  translationStatus?: string;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoCanonicalOverride?: string | null;
  seoRobots?: string | null;
  ogTitle?: string | null;
  ogDescription?: string | null;
  ogImageAssetId?: string | null;
}

/**
 * Upsert a translation AND reserve its slug in cms_slugs atomically (one
 * batch). Slug collisions inside the (entity_type, locale) scope resolve
 * deterministically (-2, -3, ...); the resolved slug is written back to both
 * tables so they can never disagree.
 */
export async function upsertContentTranslation(
  db: D1Database,
  content: ContentRow,
  input: UpsertTranslationInput,
  actor: AuditActor,
): Promise<{ translation: ContentTranslationRow; slug: string }> {
  const normalized = normalizeSlug(input.slug || input.title);
  if (!isValidSlug(normalized)) {
    throw new Error(`Invalid slug for locale ${input.locale}.`);
  }
  const scope = await db
    .prepare("SELECT slug FROM cms_slugs WHERE entity_type = ? AND locale = ?")
    .bind(content.entity_type, input.locale)
    .all<{ slug: string }>();
  const taken = new Set(scope.results.map((r) => r.slug));
  // The content's own current slug in this locale is not a collision.
  const own = await db
    .prepare("SELECT slug FROM cms_slugs WHERE content_id = ? AND locale = ?")
    .bind(content.id, input.locale)
    .first<{ slug: string }>();
  if (own) taken.delete(own.slug);
  const slug = resolveSlugCollision(normalized, taken);
  if (!slug) throw new Error("Could not resolve a unique slug.");

  const timestamp = utcNow();
  const translationId = newId("tr");
  const status =
    input.translationStatus === "complete" || input.translationStatus === "needs-review"
      ? input.translationStatus
      : "draft";
  await db.batch([
    db
      .prepare(
        `INSERT INTO cms_content_translations
          (id, content_id, locale, title, body, slug, seo_title, seo_description,
           seo_canonical_override, seo_robots, og_title, og_description,
           og_image_asset_id, translation_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(content_id, locale) DO UPDATE SET
           title = excluded.title, body = excluded.body, slug = excluded.slug,
           seo_title = excluded.seo_title, seo_description = excluded.seo_description,
           seo_canonical_override = excluded.seo_canonical_override,
           seo_robots = excluded.seo_robots, og_title = excluded.og_title,
           og_description = excluded.og_description,
           og_image_asset_id = excluded.og_image_asset_id,
           translation_status = excluded.translation_status,
           updated_at = excluded.updated_at`,
      )
      .bind(
        translationId,
        content.id,
        input.locale,
        input.title,
        input.body,
        slug,
        input.seoTitle ?? null,
        input.seoDescription ?? null,
        input.seoCanonicalOverride ?? null,
        input.seoRobots ?? null,
        input.ogTitle ?? null,
        input.ogDescription ?? null,
        input.ogImageAssetId ?? null,
        status,
        timestamp,
        timestamp,
      ),
    db
      .prepare("DELETE FROM cms_slugs WHERE content_id = ? AND locale = ?")
      .bind(content.id, input.locale),
    db
      .prepare(
        `INSERT INTO cms_slugs (id, entity_type, content_id, locale, slug, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        newId("slug"),
        content.entity_type,
        content.id,
        input.locale,
        slug,
        timestamp,
        timestamp,
      ),
  ]);

  const event = buildAuditEvent({
    actor,
    action: "translation.upsert" as AuditAction,
    entityType: content.entity_type,
    entityId: content.id,
    metadata: { locale: input.locale, slug },
  });
  await recordAuditEvent(db, event);

  const translation = await db
    .prepare("SELECT * FROM cms_content_translations WHERE content_id = ? AND locale = ?")
    .bind(content.id, input.locale)
    .first<ContentTranslationRow>();
  if (!translation) throw new Error("Failed to read back translation.");
  return { translation, slug };
}

// ---------------------------------------------------------------------------
// PUBLIC selectors — published rows only. No caller can opt out.
// ---------------------------------------------------------------------------

export interface PublishedContent {
  content: ContentRow;
  translation: ContentTranslationRow;
}

export async function getPublishedBySlug(
  db: D1Database,
  input: { entityType: string; locale: string; slug: string },
): Promise<PublishedContent | null> {
  const slugRow = await db
    .prepare(
      `SELECT c.*, t.*
       FROM cms_slugs s
       JOIN cms_contents c ON c.id = s.content_id
       JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = s.locale
       WHERE s.entity_type = ? AND s.locale = ? AND s.slug = ?
         AND c.status = 'published'`,
    )
    .bind(input.entityType, input.locale, normalizeSlug(input.slug))
    .first<ContentRow & ContentTranslationRow>();
  if (!slugRow) return null;
  const content = await getContentById(db, slugRow.content_id as string);
  if (!content || content.status !== "published") return null;
  const translation = await db
    .prepare("SELECT * FROM cms_content_translations WHERE content_id = ? AND locale = ?")
    .bind(content.id, input.locale)
    .first<ContentTranslationRow>();
  if (!translation) return null;
  return { content, translation };
}

export async function listPublishedByEntity(
  db: D1Database,
  input: { entityType: string; locale: string; limit?: number; offset?: number },
): Promise<PublishedContent[]> {
  const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 50)));
  const offset = Math.max(0, Math.floor(input.offset ?? 0));
  const { results } = await db
    .prepare(
      `SELECT c.*, t.id AS t_id FROM cms_contents c
       JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ?
       WHERE c.entity_type = ? AND c.status = 'published'
       ORDER BY c.published_at DESC LIMIT ? OFFSET ?`,
    )
    .bind(input.locale, input.entityType, limit, offset)
    .all<ContentRow & { t_id: string }>();
  const out: PublishedContent[] = [];
  for (const row of results) {
    const translation = await db
      .prepare("SELECT * FROM cms_content_translations WHERE id = ?")
      .bind(row.t_id)
      .first<ContentTranslationRow>();
    if (translation) out.push({ content: row, translation });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Audit (append-only: INSERT + SELECT only).
// ---------------------------------------------------------------------------

export async function recordAuditEvent(db: D1Database, event: AuditEvent): Promise<void> {
  await db
    .prepare(
      `INSERT INTO cms_audit_events
        (id, actor_id, actor_username, action, entity_type, entity_id, metadata_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      event.id,
      event.actorId,
      event.actorUsername,
      event.action,
      event.entityType,
      event.entityId,
      event.metadataJson,
      event.createdAt,
    )
    .run();
}

export interface AuditEventRow extends D1Row {
  id: string;
  actor_id: string | null;
  actor_username: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata_json: string;
  created_at: string;
}

/** Admin-only reader (callers enforce cms.admin via requireCapability). */
export async function listAuditEvents(
  db: D1Database,
  options: { entityType?: string; entityId?: string; limit?: number } = {},
): Promise<AuditEventRow[]> {
  const limit = Math.max(1, Math.min(200, Math.floor(options.limit ?? 50)));
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (options.entityType !== undefined) {
    clauses.push("entity_type = ?");
    values.push(options.entityType);
  }
  if (options.entityId !== undefined) {
    clauses.push("entity_id = ?");
    values.push(options.entityId);
  }
  const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
  const { results } = await db
    .prepare(`SELECT * FROM cms_audit_events ${where} ORDER BY created_at DESC LIMIT ?`)
    .bind(...values, limit)
    .all<AuditEventRow>();
  return results;
}

// ---------------------------------------------------------------------------
// Preview tokens (short-lived draft grants; hash-only storage).
// ---------------------------------------------------------------------------

export const PREVIEW_TOKEN_TTL_SECONDS = 60 * 60;

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken(bytes = 32): string {
  const raw = crypto.getRandomValues(new Uint8Array(bytes));
  let binary = "";
  for (const byte of raw) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createPreviewToken(
  db: D1Database,
  input: { contentId: string; createdBy?: string | null; ttlSeconds?: number },
): Promise<{ id: string; token: string; expiresAt: string }> {
  const token = randomToken();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + (input.ttlSeconds ?? PREVIEW_TOKEN_TTL_SECONDS) * 1000,
  ).toISOString();
  const id = newId("preview");
  await db
    .prepare(
      `INSERT INTO cms_preview_tokens
        (id, content_id, token_hash, expires_at, created_by, created_at, revoked_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    )
    .bind(
      id,
      input.contentId,
      await sha256Hex(token),
      expiresAt,
      input.createdBy ?? null,
      now.toISOString(),
    )
    .run();
  return { id, token, expiresAt };
}

/**
 * Verify a preview grant. Returns the content id when the token is live, or
 * null for unknown/expired/revoked tokens. Callers still render preview
 * responses as noindex/nofollow/no-store — verification grants ACCESS, never
 * indexability.
 */
export async function verifyPreviewToken(
  db: D1Database,
  input: { contentId: string; token: string; now?: Date },
): Promise<boolean> {
  const now = input.now ?? new Date();
  const row = await db
    .prepare(
      `SELECT token_hash, expires_at, revoked_at FROM cms_preview_tokens
       WHERE content_id = ? AND revoked_at IS NULL AND expires_at > ?`,
    )
    .bind(input.contentId, now.toISOString())
    .all<{ token_hash: string; expires_at: string; revoked_at: string | null }>();
  const presented = await sha256Hex(input.token);
  return row.results.some((candidate) => candidate.token_hash === presented);
}

export async function revokePreviewToken(
  db: D1Database,
  id: string,
  now = new Date(),
): Promise<void> {
  await db
    .prepare("UPDATE cms_preview_tokens SET revoked_at = ? WHERE id = ?")
    .bind(now.toISOString(), id)
    .run();
}

/** Guard helper so routes share one error shape for authz rejections. */
export function assertCmsErrorShape(error: unknown): asserts error is CmsAuthError {
  if (!(error instanceof CmsAuthError)) throw error;
}
