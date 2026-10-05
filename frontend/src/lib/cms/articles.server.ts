/**
 * Phase 16 — editorial article persistence (SERVER-ONLY).
 *
 * Thin layer over generic Phase 11 primitives. Articles are cms_contents rows
 * with entity_type='article'; bodies/categories/tags/refs/related live in the
 * Phase 16 tables from migration 0010. Every writer validates structured
 * bodies via articles.ts, validates entity refs against cms_contents +
 * canonical registry, validates media against media_assets usability, and
 * audits mutations. Public readers filter status='published' in SQL.
 */

import "@tanstack/react-start/server-only";

import { buildAuditEvent, type AuditActor } from "./audit";
import {
  ARTICLE_SCHEMA_VERSION,
  excerptFromDocument,
  serializeArticleDocument,
  validateArticleBlock,
  validateArticleDocument,
  validateCategoryInput,
  validateEntityRefInput,
  validateTagInput,
} from "./articles";
import { ARTICLE_ENTITY_TYPE, isArticleReferenceEntityType } from "./content-types";
import { isUsableMediaStatus } from "./media-provider";
import { getContentById, recordAuditEvent, type D1Database, type D1Row } from "./db.server";

function utcNow(): string {
  return new Date().toISOString();
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

async function assertArticle(db: D1Database, contentId: string) {
  const content = await getContentById(db, contentId);
  if (!content || content.entity_type !== ARTICLE_ENTITY_TYPE) {
    throw new Error("Article not found.");
  }
  return content;
}

async function assertMediaUsable(db: D1Database, id: string): Promise<void> {
  const row = await db
    .prepare("SELECT id, status FROM media_assets WHERE id = ?")
    .bind(id)
    .first<{ id: string; status: string }>();
  if (!row) throw new Error("Media asset not found.");
  if (!isUsableMediaStatus(row.status)) {
    throw new Error("Media asset is not usable.");
  }
}

export async function upsertArticleBody(
  db: D1Database,
  articleContentId: string,
  input: {
    locale: string;
    body: unknown;
    categoryId?: string | null;
    coverAssetId?: string | null;
  },
  actor: AuditActor,
): Promise<void> {
  await assertArticle(db, articleContentId);
  const doc = validateArticleDocument(input.body);
  for (const block of doc.blocks) {
    if (block.type === "image" && block.assetId) await assertMediaUsable(db, block.assetId);
    if (block.type === "entity" && block.contentId) {
      const target = await getContentById(db, block.contentId);
      if (!target || !isArticleReferenceEntityType(target.entity_type)) {
        throw new Error("Invalid entity reference.");
      }
    }
  }
  if (input.coverAssetId) await assertMediaUsable(db, input.coverAssetId);
  const now = utcNow();
  const excerpt = excerptFromDocument(doc);
  await db
    .prepare(
      `INSERT INTO article_bodies
        (article_content_id, locale, schema_version, body_json, excerpt,
         cover_asset_id, category_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (article_content_id, locale) DO UPDATE SET
        schema_version = excluded.schema_version, body_json = excluded.body_json,
        excerpt = excluded.excerpt, cover_asset_id = excluded.cover_asset_id,
        category_id = excluded.category_id, updated_at = excluded.updated_at`,
    )
    .bind(
      articleContentId,
      input.locale,
      ARTICLE_SCHEMA_VERSION,
      serializeArticleDocument(doc),
      excerpt,
      input.coverAssetId ?? null,
      input.categoryId ?? null,
      now,
      now,
    )
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: ARTICLE_ENTITY_TYPE,
      entityId: articleContentId,
      metadata: { locale: input.locale },
    }),
  );
}

export interface ArticleCategoryRow extends D1Row {
  id: string;
  slug: string;
  name: string;
  description: string;
  sort_order: number;
}

export async function createArticleCategory(
  db: D1Database,
  input: { slug?: string | undefined; name?: string | undefined },
  actor: AuditActor,
): Promise<ArticleCategoryRow> {
  const clean = validateCategoryInput(input);
  const now = utcNow();
  const id = newId("artcat");
  try {
    await db
      .prepare(
        `INSERT INTO article_categories (id, slug, name, description, sort_order, created_at, updated_at)
         VALUES (?, ?, ?, '', 0, ?, ?)`,
      )
      .bind(id, clean.slug, clean.name, now, now)
      .run();
  } catch {
    throw new Error("Category slug already exists.");
  }
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.create",
      entityType: "article_category",
      entityId: id,
      metadata: { slug: clean.slug },
    }),
  );
  const row = await db
    .prepare("SELECT * FROM article_categories WHERE id = ?")
    .bind(id)
    .first<ArticleCategoryRow>();
  if (!row) throw new Error("Failed to read back category.");
  return row;
}

export async function listArticleCategories(db: D1Database): Promise<ArticleCategoryRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM article_categories ORDER BY sort_order ASC, name ASC")
    .all<ArticleCategoryRow>();
  return results;
}

export interface ArticleTagRow extends D1Row {
  id: string;
  slug: string;
  name: string;
}

export async function createArticleTag(
  db: D1Database,
  input: { slug?: string | undefined; name?: string | undefined },
  actor: AuditActor,
): Promise<ArticleTagRow> {
  const clean = validateTagInput(input);
  const now = utcNow();
  const id = newId("arttag");
  try {
    await db
      .prepare(
        "INSERT INTO article_tags (id, slug, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      )
      .bind(id, clean.slug, clean.name, now, now)
      .run();
  } catch {
    throw new Error("Tag slug already exists.");
  }
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.create",
      entityType: "article_tag",
      entityId: id,
      metadata: { slug: clean.slug },
    }),
  );
  const row = await db
    .prepare("SELECT * FROM article_tags WHERE id = ?")
    .bind(id)
    .first<ArticleTagRow>();
  if (!row) throw new Error("Failed to read back tag.");
  return row;
}

export async function listArticleTags(db: D1Database): Promise<ArticleTagRow[]> {
  const { results } = await db
    .prepare("SELECT * FROM article_tags ORDER BY name ASC")
    .bind()
    .all<ArticleTagRow>();
  return results;
}

export async function getArticleAdminDetail(
  db: D1Database,
  articleContentId: string,
): Promise<{
  bodyLocales: string[];
  categoryIds: Record<string, string | null>;
  tagIds: string[];
  refs: Array<{ entityType: string; contentId: string }>;
  relatedIds: string[];
  mediaAssetIds: string[];
}> {
  await assertArticle(db, articleContentId);
  const { results: bodies } = await db
    .prepare("SELECT locale, category_id FROM article_bodies WHERE article_content_id = ?")
    .bind(articleContentId)
    .all<{ locale: string; category_id: string | null }>();
  const { results: tagLinks } = await db
    .prepare("SELECT tag_id FROM article_tag_links WHERE article_content_id = ?")
    .bind(articleContentId)
    .all<{ tag_id: string }>();
  const { results: refs } = await db
    .prepare(
      "SELECT target_entity_type, target_content_id FROM article_entity_refs WHERE article_content_id = ? ORDER BY slot_order ASC",
    )
    .bind(articleContentId)
    .all<{ target_entity_type: string; target_content_id: string }>();
  const { results: related } = await db
    .prepare(
      "SELECT related_content_id FROM article_related WHERE article_content_id = ? ORDER BY slot_order ASC",
    )
    .bind(articleContentId)
    .all<{ related_content_id: string }>();
  const { results: media } = await db
    .prepare("SELECT asset_id FROM article_media WHERE article_content_id = ?")
    .bind(articleContentId)
    .all<{ asset_id: string }>();
  const categoryIds: Record<string, string | null> = {};
  for (const row of bodies) categoryIds[row.locale] = row.category_id;
  return {
    bodyLocales: bodies.map((row) => row.locale),
    categoryIds,
    tagIds: tagLinks.map((row) => row.tag_id),
    refs: refs.map((row) => ({
      entityType: row.target_entity_type,
      contentId: row.target_content_id,
    })),
    relatedIds: related.map((row) => row.related_content_id),
    mediaAssetIds: media.map((row) => row.asset_id),
  };
}

export async function setArticleTags(
  db: D1Database,
  articleContentId: string,
  tagIds: string[],
  actor: AuditActor,
): Promise<void> {
  await assertArticle(db, articleContentId);
  if (tagIds.length > 24) throw new Error("Too many tags.");
  for (const tagId of tagIds) {
    const tag = await db
      .prepare("SELECT id FROM article_tags WHERE id = ?")
      .bind(tagId)
      .first<{ id: string }>();
    if (!tag) throw new Error("Tag not found.");
  }
  await db
    .prepare("DELETE FROM article_tag_links WHERE article_content_id = ?")
    .bind(articleContentId)
    .run();
  const now = utcNow();
  for (const tagId of tagIds) {
    await db
      .prepare(
        "INSERT INTO article_tag_links (id, article_content_id, tag_id, created_at) VALUES (?, ?, ?, ?)",
      )
      .bind(newId("arttaglink"), articleContentId, tagId, now)
      .run();
  }
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: ARTICLE_ENTITY_TYPE,
      entityId: articleContentId,
      metadata: { tags: tagIds.length },
    }),
  );
}

export async function setArticleEntityRefs(
  db: D1Database,
  articleContentId: string,
  refs: Array<{ targetEntityType: string; targetContentId: string }>,
  actor: AuditActor,
): Promise<void> {
  await assertArticle(db, articleContentId);
  if (refs.length > 24) throw new Error("Too many entity references.");
  const clean = refs.map((entry) =>
    validateEntityRefInput({
      targetEntityType: entry.targetEntityType,
      targetContentId: entry.targetContentId,
    }),
  );
  for (const ref of clean) {
    const target = await getContentById(db, ref.targetContentId);
    if (!target || target.entity_type !== ref.targetEntityType) {
      throw new Error("Referenced entity not found.");
    }
  }
  await db
    .prepare("DELETE FROM article_entity_refs WHERE article_content_id = ?")
    .bind(articleContentId)
    .run();
  const now = utcNow();
  let order = 0;
  for (const ref of clean) {
    await db
      .prepare(
        `INSERT INTO article_entity_refs
          (id, article_content_id, target_content_id, target_entity_type, slot_order, note, created_at)
         VALUES (?, ?, ?, ?, ?, '', ?)`,
      )
      .bind(
        newId("artref"),
        articleContentId,
        ref.targetContentId,
        ref.targetEntityType,
        order,
        now,
      )
      .run();
    order += 1;
  }
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: ARTICLE_ENTITY_TYPE,
      entityId: articleContentId,
      metadata: { refs: clean.length },
    }),
  );
}

/**
 * Reference guard for article media. Called by media deletion so an asset
 * attached to an article (cover OR inline image block OR media attachment)
 * can never be destroyed while the article references it.
 */
export async function assertArticleMediaUnreferenced(
  db: D1Database,
  assetId: string,
): Promise<void> {
  const checks = [
    "SELECT article_content_id FROM article_bodies WHERE cover_asset_id = ? LIMIT 1",
    "SELECT article_content_id FROM article_media WHERE asset_id = ? LIMIT 1",
  ];
  for (const sql of checks) {
    const hit = await db.prepare(sql).bind(assetId).first<{ article_content_id: string }>();
    if (hit) throw new Error("Media asset is still referenced by an article.");
  }
  const { results } = await db
    .prepare("SELECT body_json FROM article_bodies")
    .bind()
    .all<{ body_json: string }>();
  for (const row of results) {
    try {
      const doc = validateArticleDocument(row.body_json);
      if (doc.blocks.some((block) => block.type === "image" && block.assetId === assetId)) {
        throw new Error("Media asset is still referenced by an article.");
      }
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Media asset is still referenced by an article."
      ) {
        throw error;
      }
    }
  }
}

export async function setArticleRelated(
  db: D1Database,
  articleContentId: string,
  relatedIds: string[],
  actor: AuditActor,
): Promise<void> {
  await assertArticle(db, articleContentId);
  if (relatedIds.length > 12) throw new Error("Too many related links.");
  const seen = new Set<string>();
  for (const relatedId of relatedIds) {
    if (relatedId === articleContentId) throw new Error("Article cannot relate to itself.");
    if (seen.has(relatedId)) throw new Error("Duplicate related article.");
    seen.add(relatedId);
    const target = await getContentById(db, relatedId);
    if (!target || target.entity_type !== ARTICLE_ENTITY_TYPE) {
      throw new Error("Related article not found.");
    }
  }
  await db
    .prepare("DELETE FROM article_related WHERE article_content_id = ?")
    .bind(articleContentId)
    .run();
  const now = utcNow();
  let order = 0;
  for (const relatedId of relatedIds) {
    await db
      .prepare(
        `INSERT INTO article_related
          (id, article_content_id, related_content_id, slot_order, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(newId("artrel"), articleContentId, relatedId, order, now)
      .run();
    order += 1;
  }
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: ARTICLE_ENTITY_TYPE,
      entityId: articleContentId,
      metadata: { related: relatedIds.length },
    }),
  );
}

export async function attachArticleMedia(
  db: D1Database,
  articleContentId: string,
  assetId: string,
  actor: AuditActor,
): Promise<void> {
  await assertArticle(db, articleContentId);
  await assertMediaUsable(db, assetId);
  const now = utcNow();
  await db
    .prepare(
      "INSERT INTO article_media (id, article_content_id, asset_id, slot_order, caption, created_at) VALUES (?, ?, ?, 0, '', ?)",
    )
    .bind(newId("artmedia"), articleContentId, assetId, now)
    .run();
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action: "content.update",
      entityType: ARTICLE_ENTITY_TYPE,
      entityId: articleContentId,
      metadata: { media: assetId },
    }),
  );
}
