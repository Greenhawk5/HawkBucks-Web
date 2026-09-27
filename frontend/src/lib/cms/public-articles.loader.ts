/**
 * Phase 16/17 — public article readers (published-only, localized).
 */

import { createServerFn } from "@tanstack/react-start";
import { ARTICLE_ENTITY_TYPE } from "./content-types";
import { articleBodyImageAssetIds, validateArticleDocument } from "./articles";
import type { ArticleDocument } from "./articles";

export interface PublicArticleItem {
  contentId: string;
  slug: string;
  title: string;
  excerpt: string;
  locale: string;
  updatedAt: string;
}

export interface PublicArticleDetail extends PublicArticleItem {
  bodyJson: string;
  seoTitle: string | null;
  seoDescription: string | null;
  imageUrl: string | null;
  bodyImageUrls: Record<string, string>;
  completeLocales: string[];
  categorySlug: string | null;
  tagSlugs: string[];
  entityRefs: Array<{ entityType: string; contentId: string; slug: string; title: string }>;
  related: Array<{ contentId: string; slug: string; title: string; excerpt: string }>;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.floor(n)));
}

interface CompatMediaAssetRow {
  provider: string;
  provider_asset_id: string;
  delivery_url: string;
  status: string;
}

type CompatDeliveryConfig = { r2BaseUrl: string };

/**
 * Resolve article body image-block references to public delivery URLs through
 * the canonical compat layer (R2 base + legacy ImageKit contract). Only assets
 * in a publicly renderable lifecycle state resolve: missing rows plus
 * deleted/failed assets return no URL so ArticleBody renders its captioned
 * placeholder instead of a broken <img>. Never creates thumbnails or copies.
 *
 * Phase 19 — single batched query. The previous implementation issued one
 * media_assets query PER image block (N+1); article docs allow up to
 * MAX_ARTICLE_BLOCKS (200) image blocks, so detail SSR could fan out to
 * hundreds of sequential D1 round trips. Ids are deduplicated and the batch
 * is hard-capped to the same bound the validator enforces.
 */
export async function resolveArticleBodyImageUrls(
  db: DbLike,
  doc: ArticleDocument,
  config: CompatDeliveryConfig,
): Promise<Record<string, string>> {
  const ids = [...new Set(articleBodyImageAssetIds(doc))].slice(0, 200);
  if (ids.length === 0) return {};
  const { resolveCompatDeliveryUrl } = await import("./media-compat");
  const placeholders = ids.map(() => "?").join(",");
  let rows: CompatMediaAssetRow[] = [];
  try {
    const result = await db
      .prepare(
        `SELECT id, provider, provider_asset_id, delivery_url, status FROM media_assets WHERE id IN (${placeholders})`,
      )
      .bind(...ids)
      .all<CompatMediaAssetRow & { id: string }>();
    rows = result.results;
  } catch {
    return {};
  }
  const out: Record<string, string> = {};
  for (const row of rows) {
    const id = (row as { id?: unknown }).id;
    if (typeof id !== "string" || out[id] !== undefined) continue;
    if (!row || row.status === "deleted" || row.status === "failed") continue;
    try {
      const url = resolveCompatDeliveryUrl(row, config);
      if (typeof url === "string" && url.startsWith("https://")) out[id] = url;
    } catch {
      continue;
    }
  }
  return out;
}

async function resolveSingleMediaUrl(
  db: DbLike,
  assetId: string,
  config: CompatDeliveryConfig,
): Promise<string | null> {
  const { resolveCompatDeliveryUrl } = await import("./media-compat");
  const row = await db
    .prepare(
      "SELECT provider, provider_asset_id, delivery_url, status FROM media_assets WHERE id = ?",
    )
    .bind(assetId)
    .first<CompatMediaAssetRow>();
  if (!row || row.status === "deleted" || row.status === "failed") return null;
  return resolveCompatDeliveryUrl(row, config);
}

interface RelatedRow {
  contentId: string;
  slug: string;
  title: string;
  excerpt: string;
}

async function completeArticleLocales(db: DbLike, articleId: string): Promise<string[]> {
  const { results } = await db
    .prepare("SELECT locale, translation_status FROM cms_content_translations WHERE content_id = ?")
    .bind(articleId)
    .all<{ locale: string; translation_status: string }>();
  return results.filter((row) => row.translation_status === "complete").map((row) => row.locale);
}

async function fallbackRelated(
  db: DbLike,
  input: { articleId: string; locale: string; categoryId: string | null },
): Promise<RelatedRow[]> {
  if (!input.categoryId) return [];
  const { results } = await db
    .prepare(
      `SELECT c.id AS content_id, t.slug AS slug, t.title AS title,
              b.excerpt AS excerpt
       FROM article_bodies b
       JOIN cms_contents c ON c.id = b.article_content_id
       JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ?
       LEFT JOIN article_bodies self_b ON self_b.article_content_id = t.content_id
       WHERE b.category_id = ? AND b.locale = ? AND c.status = 'published'
         AND c.id != ? AND c.entity_type = 'article'
       ORDER BY c.updated_at DESC LIMIT 6`,
    )
    .bind(input.locale, input.categoryId, input.locale, input.articleId)
    .all<{ content_id: string; slug: string; title: string; excerpt: string | null }>();
  return results.map((row) => ({
    contentId: row.content_id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt ?? "",
  }));
}

interface DbLike {
  prepare(query: string): {
    bind(...values: unknown[]): {
      first<T>(): Promise<T | null>;
      all<T>(): Promise<{ results: T[] }>;
    };
  };
}

export const listPublicArticles = createServerFn({ method: "GET" })
  .validator(
    (i: { locale?: string | undefined; limit?: number | undefined; offset?: number | undefined }) =>
      i,
  )
  .handler(async ({ data }): Promise<{ items: PublicArticleItem[]; total: number }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    const limit = clamp(typeof data.limit === "number" ? data.limit : 24, 1, 100);
    const offset = clamp(typeof data.offset === "number" ? data.offset : 0, 0, 100000);
    const { db } = await resolveRequestCmsDb();
    // Phase 19 — single bounded query. The previous implementation loaded
    // EVERY published article (listPublishedByEntity without pagination) plus
    // one excerpt query per row, then sliced in JS — full-table cost on every
    // listing SSR. Pagination now happens in SQL; the excerpt rides the same
    // join so no per-row query remains. Listing pages never load body_json.
    const { results } = await db
      .prepare(
        `SELECT c.id AS content_id, t.slug AS slug, t.title AS title,
                b.excerpt AS excerpt, c.updated_at AS updated_at
         FROM cms_contents c
         JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ?
         LEFT JOIN article_bodies b ON b.article_content_id = c.id AND b.locale = ?
         WHERE c.entity_type = 'article' AND c.status = 'published'
         ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(locale, locale, limit, offset)
      .all<{
        content_id: string;
        slug: string;
        title: string;
        excerpt: string | null;
        updated_at: string;
      }>();
    const [{ results: countRows }] = [
      await db
        .prepare(
          `SELECT COUNT(*) AS n FROM cms_contents c
           JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ?
           WHERE c.entity_type = 'article' AND c.status = 'published'`,
        )
        .bind(locale)
        .all<{ n: number }>(),
    ];
    const total = Number(countRows[0]?.n ?? results.length);
    const items: PublicArticleItem[] = results.map((row) => ({
      contentId: row.content_id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt ?? "",
      locale,
      updatedAt: row.updated_at,
    }));
    return { items, total };
  });

export const getPublicArticle = createServerFn({ method: "GET" })
  .validator((i: { locale?: string | undefined; slug?: string | undefined }) => i)
  .handler(async ({ data }): Promise<{ article: PublicArticleDetail | null }> => {
    const { resolveRequestCmsDb } = await import("./db.server");
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    const slug = typeof data.slug === "string" ? data.slug : "";
    const { db } = await resolveRequestCmsDb();
    const { getPublishedBySlug } = await import("./db.server");
    const found = await getPublishedBySlug(db, {
      entityType: ARTICLE_ENTITY_TYPE,
      locale,
      slug,
    });
    if (!found) return { article: null };
    const body = await db
      .prepare(
        "SELECT body_json, excerpt, cover_asset_id, category_id FROM article_bodies WHERE article_content_id = ? AND locale = ?",
      )
      .bind(found.content.id, locale)
      .first<{
        body_json: string;
        excerpt: string;
        cover_asset_id: string | null;
        category_id: string | null;
      }>();
    const bodyJson = body?.body_json ?? '{"version":1,"blocks":[]}';
    try {
      validateArticleDocument(bodyJson);
    } catch {
      return { article: null };
    }
    // Image: resolve ONLY through the compat delivery layer. Bare R2 keys
    // never reach the client verbatim; legacy ImageKit https rows stay
    // readable per the Phase 15.5 compatibility contract. Deleted/failed
    // assets resolve to null so routes render no broken image.
    const { R2_PUBLIC_BASE_URL } = await import("./r2.server");
    const compatConfig = { r2BaseUrl: R2_PUBLIC_BASE_URL };
    const validatedDoc = validateArticleDocument(bodyJson);
    // Phase 19 — independent reads run concurrently. The previous
    // implementation awaited cover, body images, category, tags, refs,
    // related and locales strictly sequentially (up to 8 D1 round trips on
    // the SSR critical path); D1 round trips now collapse to two batches.
    const [imageUrl, bodyImageUrls, category, tagRows, refRows, explicitRelated, locales] =
      await Promise.all([
        body?.cover_asset_id
          ? resolveSingleMediaUrl(db, body.cover_asset_id, compatConfig)
          : Promise.resolve(null),
        resolveArticleBodyImageUrls(db, validatedDoc, compatConfig).catch(
          (): Record<string, string> => ({}),
        ),
        body?.category_id
          ? db
              .prepare("SELECT slug FROM article_categories WHERE id = ?")
              .bind(body.category_id)
              .first<{ slug: string }>()
          : Promise.resolve(null),
        db
          .prepare(
            `SELECT t.slug AS slug FROM article_tag_links l
             JOIN article_tags t ON t.id = l.tag_id
             WHERE l.article_content_id = ? ORDER BY t.slug ASC`,
          )
          .bind(found.content.id)
          .all<{ slug: string }>()
          .then((r) => r.results),
        // Entity refs: published targets only. Draft/archived targets are
        // filtered here (SQL status check) AND re-checked per-row below, so an
        // unpublished entity can never leak through an editorial card.
        db
          .prepare(
            `SELECT r.target_entity_type AS entity_type, r.target_content_id AS content_id,
                    t.slug AS slug, t.title AS title, c.status AS status
             FROM article_entity_refs r
             JOIN cms_contents c ON c.id = r.target_content_id
             JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ?
             WHERE r.article_content_id = ? AND c.status = 'published'
             ORDER BY r.slot_order ASC LIMIT 24`,
          )
          .bind(locale, found.content.id)
          .all<{
            entity_type: string;
            content_id: string;
            slug: string;
            title: string;
            status: string;
          }>()
          .then((r) => r.results),
        db
          .prepare(
            `SELECT c.id AS content_id, t.slug AS slug, t.title AS title,
                    b.excerpt AS excerpt, c.status AS status
             FROM article_related r
             JOIN cms_contents c ON c.id = r.related_content_id
             JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ?
             LEFT JOIN article_bodies b ON b.article_content_id = c.id AND b.locale = ?
             WHERE r.article_content_id = ? AND c.status = 'published'
             ORDER BY r.slot_order ASC LIMIT 12`,
          )
          .bind(locale, locale, found.content.id)
          .all<{
            content_id: string;
            slug: string;
            title: string;
            excerpt: string | null;
            status: string;
          }>()
          .then((r) => r.results),
        completeArticleLocales(db, String(found.content.id)),
      ]);
    const related =
      explicitRelated.length > 0
        ? explicitRelated
            .filter((row) => row.status === "published")
            .map((row) => ({
              contentId: row.content_id,
              slug: row.slug,
              title: row.title,
              excerpt: row.excerpt ?? "",
            }))
        : // Deterministic fallback: same category, newest first — computed at
          // read time, never stored, and published-only by construction.
          await fallbackRelated(db, {
            articleId: String(found.content.id),
            locale,
            categoryId: body?.category_id ?? null,
          });
    return {
      article: {
        contentId: found.content.id as string,
        slug: found.translation.slug as string,
        title: found.translation.title as string,
        excerpt: body?.excerpt ?? "",
        locale,
        updatedAt: found.content.updated_at as string,
        bodyJson,
        seoTitle: (found.translation.seo_title as string | null) ?? null,
        seoDescription: (found.translation.seo_description as string | null) ?? null,
        imageUrl,
        bodyImageUrls,
        completeLocales: locales,
        categorySlug: category?.slug ?? null,
        tagSlugs: tagRows.map((row) => row.slug),
        entityRefs: refRows
          .filter((row) => row.status === "published")
          .map((row) => ({
            entityType: row.entity_type,
            contentId: row.content_id,
            slug: row.slug,
            title: row.title,
          })),
        related,
      },
    };
  });

/**
 * Preview consumer: time-limited draft access via verifyPreviewToken.
 * Returns the article detail shape WITHOUT publication filtering, but the
 * route layer must render it as noindex/nofollow and never link it.
 *
 * Cache contract: draft preview responses must never be cached. The
 * `getPreviewArticle` handler marks its own response
 * `Cache-Control: private, no-store` (see handler body), and the
 * `/articles/preview` route emits the same header on the SSR document.
 */

export const PREVIEW_NO_STORE = "private, no-store" as const;

export function previewCacheControl(): string {
  return PREVIEW_NO_STORE;
}
export const getPreviewArticle = createServerFn({ method: "GET" })
  .validator(
    (i: {
      contentId?: string | undefined;
      token?: string | undefined;
      locale?: string | undefined;
    }) => i,
  )
  .handler(async ({ data }): Promise<{ article: PublicArticleDetail | null; reason?: string }> => {
    const { setResponseHeader } = await import("@tanstack/react-start/server");
    try {
      setResponseHeader("Cache-Control", PREVIEW_NO_STORE);
    } catch {
      // Outside a request context (unit tests) there is no response to mark.
    }
    const contentId = typeof data.contentId === "string" ? data.contentId : "";
    const token = typeof data.token === "string" ? data.token : "";
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    if (contentId === "" || token === "") return { article: null, reason: "missing" };
    const { resolveRequestCmsDb, verifyPreviewToken, getContentById } = await import("./db.server");
    const { db } = await resolveRequestCmsDb();
    const ok = await verifyPreviewToken(db, { contentId, token });
    if (!ok) return { article: null, reason: "invalid" };
    const content = await getContentById(db, contentId);
    if (!content || content.entity_type !== ARTICLE_ENTITY_TYPE)
      return { article: null, reason: "missing" };
    const [translation, body] = await Promise.all([
      db
        .prepare(
          "SELECT slug, title, seo_title, seo_description FROM cms_content_translations WHERE content_id = ? AND locale = ?",
        )
        .bind(contentId, locale)
        .first<{
          slug: string;
          title: string;
          seo_title: string | null;
          seo_description: string | null;
        }>(),
      db
        .prepare(
          "SELECT body_json, excerpt, cover_asset_id, category_id FROM article_bodies WHERE article_content_id = ? AND locale = ?",
        )
        .bind(contentId, locale)
        .first<{
          body_json: string;
          excerpt: string;
          cover_asset_id: string | null;
          category_id: string | null;
        }>(),
    ]);
    if (!translation) return { article: null, reason: "missing" };
    const bodyJson = body?.body_json ?? '{"version":1,"blocks":[]}';
    try {
      validateArticleDocument(bodyJson);
    } catch {
      return { article: null, reason: "invalid-body" };
    }
    const { R2_PUBLIC_BASE_URL } = await import("./r2.server");
    const compatConfig = { r2BaseUrl: R2_PUBLIC_BASE_URL };
    const validatedPreview = validateArticleDocument(bodyJson);
    // Phase 19 — cover, body images and locale list are independent.
    const [previewImageUrl, previewBodyImageUrls, previewLocales] = await Promise.all([
      body?.cover_asset_id
        ? resolveSingleMediaUrl(db, body.cover_asset_id, compatConfig)
        : Promise.resolve(null),
      resolveArticleBodyImageUrls(db, validatedPreview, compatConfig).catch(
        (): Record<string, string> => ({}),
      ),
      completeArticleLocales(db, contentId),
    ]);
    return {
      article: {
        contentId,
        slug: translation.slug,
        title: translation.title,
        excerpt: body?.excerpt ?? "",
        locale,
        updatedAt: String((content as unknown as Record<string, unknown>)["updated_at"] ?? ""),
        bodyJson,
        seoTitle: translation.seo_title ?? null,
        seoDescription: translation.seo_description ?? null,
        imageUrl: previewImageUrl,
        bodyImageUrls: previewBodyImageUrls,
        completeLocales: previewLocales,
        categorySlug: null,
        tagSlugs: [],
        entityRefs: [],
        related: [],
      },
    };
  });

/**
 * Entity → editorial: published articles referencing a given entity.
 * Used by hero/loadout/inventory detail pages for "Related guides".
 */
export const listArticlesForEntity = createServerFn({ method: "GET" })
  .validator(
    (i: {
      entityContentId?: string | undefined;
      locale?: string | undefined;
      limit?: number | undefined;
    }) => i,
  )
  .handler(async ({ data }): Promise<{ items: PublicArticleItem[] }> => {
    const target = typeof data.entityContentId === "string" ? data.entityContentId : "";
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    const limit = clamp(typeof data.limit === "number" ? data.limit : 6, 1, 12);
    if (target === "") return { items: [] };
    const { resolveRequestCmsDb } = await import("./db.server");
    const { db } = await resolveRequestCmsDb();
    const { results } = await db
      .prepare(
        `SELECT c.id AS content_id, t.slug AS slug, t.title AS title,
                b.excerpt AS excerpt, c.updated_at AS updated_at
         FROM article_entity_refs r
         JOIN cms_contents c ON c.id = r.article_content_id AND c.status = 'published' AND c.entity_type = 'article'
         JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ?
         LEFT JOIN article_bodies b ON b.article_content_id = c.id AND b.locale = ?
         WHERE r.target_content_id = ?
         ORDER BY c.updated_at DESC LIMIT ?`,
      )
      .bind(locale, locale, target, limit)
      .all<{
        content_id: string;
        slug: string;
        title: string;
        excerpt: string | null;
        updated_at: string;
      }>();
    return {
      items: results.map((row) => ({
        contentId: row.content_id,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt ?? "",
        locale,
        updatedAt: row.updated_at,
      })),
    };
  });

/**
 * Topic-filtered published articles for cluster pages (category/tag).
 */
export const listArticlesByTopic = createServerFn({ method: "GET" })
  .validator(
    (i: {
      categorySlug?: string | undefined;
      tagSlug?: string | undefined;
      locale?: string | undefined;
      limit?: number | undefined;
    }) => i,
  )
  .handler(async ({ data }): Promise<{ items: PublicArticleItem[] }> => {
    const locale = typeof data.locale === "string" && data.locale !== "" ? data.locale : "en";
    const limit = clamp(typeof data.limit === "number" ? data.limit : 12, 1, 24);
    const { resolveRequestCmsDb } = await import("./db.server");
    const { db } = await resolveRequestCmsDb();
    if (typeof data.categorySlug === "string" && data.categorySlug !== "") {
      const { results } = await db
        .prepare(
          `SELECT c.id AS content_id, t.slug AS slug, t.title AS title,
                  b.excerpt AS excerpt, c.updated_at AS updated_at
           FROM article_bodies b
           JOIN cms_contents c ON c.id = b.article_content_id AND c.status = 'published' AND c.entity_type = 'article'
           JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ?
           JOIN article_categories cat ON cat.id = b.category_id AND cat.slug = ?
           WHERE b.locale = ?
           ORDER BY c.updated_at DESC LIMIT ?`,
        )
        .bind(locale, data.categorySlug, locale, limit)
        .all<{
          content_id: string;
          slug: string;
          title: string;
          excerpt: string | null;
          updated_at: string;
        }>();
      return {
        items: results.map((row) => ({
          contentId: row.content_id,
          slug: row.slug,
          title: row.title,
          excerpt: row.excerpt ?? "",
          locale,
          updatedAt: row.updated_at,
        })),
      };
    }
    if (typeof data.tagSlug === "string" && data.tagSlug !== "") {
      const { results } = await db
        .prepare(
          `SELECT c.id AS content_id, t.slug AS slug, t.title AS title,
                  b.excerpt AS excerpt, c.updated_at AS updated_at
           FROM article_tag_links l
           JOIN article_tags tag ON tag.id = l.tag_id AND tag.slug = ?
           JOIN cms_contents c ON c.id = l.article_content_id AND c.status = 'published' AND c.entity_type = 'article'
           JOIN cms_content_translations t ON t.content_id = c.id AND t.locale = ?
           LEFT JOIN article_bodies b ON b.article_content_id = c.id AND b.locale = ?
           ORDER BY c.updated_at DESC LIMIT ?`,
        )
        .bind(data.tagSlug, locale, locale, limit)
        .all<{
          content_id: string;
          slug: string;
          title: string;
          excerpt: string | null;
          updated_at: string;
        }>();
      return {
        items: results.map((row) => ({
          contentId: row.content_id,
          slug: row.slug,
          title: row.title,
          excerpt: row.excerpt ?? "",
          locale,
          updatedAt: row.updated_at,
        })),
      };
    }
    return { items: [] };
  });
