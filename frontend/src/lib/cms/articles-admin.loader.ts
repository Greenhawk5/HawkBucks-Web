/**
 * Phase 16 — article admin boundary (shared validators, authz enforced).
 */

import { createServerFn } from "@tanstack/react-start";
import {
  asOptionalString,
  asSearchFilter,
  asStatusFilter,
  clampAdminPaging,
  requireArticleLocale,
  requireContentId,
  requireNonEmptyString,
  requireTitle,
} from "./admin-inputs";

async function requireArticleSession(
  cap: "cms.read" | "cms.write" | "cms.publish",
  mutate = false,
) {
  const { resolveRequestCmsDb } = await import("./db.server");
  const { resolveRequestSession, hasCapability, CmsAuthError, assertSameOriginForMutation } =
    await import("./auth.server");
  if (mutate) assertSameOriginForMutation();
  const { db } = await resolveRequestCmsDb();
  const session = await resolveRequestSession(db);
  if (!session) throw new CmsAuthError(401, "CMS authentication required.");
  if (!hasCapability(session.user.role, cap)) throw new CmsAuthError(403, "Forbidden.");
  return { db, session };
}

export interface ArticleAdminItem {
  contentId: string;
  status: string;
  defaultLocale: string;
  updatedAt: string;
  title: string | null;
  locales: string[];
}

export const listAdminArticles = createServerFn({ method: "GET" })
  .validator((i: { status?: string; search?: string; limit?: number; offset?: number }) => {
    const status = asStatusFilter(i.status);
    const search = asSearchFilter(i.search);
    const { limit, offset } = clampAdminPaging(i);
    return { status, search, limit, offset };
  })
  .handler(async ({ data }): Promise<{ items: ArticleAdminItem[] }> => {
    const { db } = await requireArticleSession("cms.read");
    const { results } = await db
      .prepare(
        `SELECT c.id AS content_id, c.status AS status, c.default_locale AS default_locale,
                c.updated_at AS updated_at
         FROM cms_contents c WHERE c.entity_type = 'article'
         ORDER BY c.updated_at DESC LIMIT ? OFFSET ?`,
      )
      .bind(data.limit, data.offset)
      .all<{ content_id: string; status: string; default_locale: string; updated_at: string }>();
    const items: ArticleAdminItem[] = [];
    for (const row of results) {
      if (data.status && row.status !== data.status) continue;
      const { results: translations } = await db
        .prepare("SELECT locale, title FROM cms_content_translations WHERE content_id = ?")
        .bind(row.content_id)
        .all<{ locale: string; title: string }>();
      const title =
        translations.find((entry) => entry.locale === row.default_locale)?.title ??
        translations[0]?.title ??
        null;
      if (data.search && title && !title.toLowerCase().includes(data.search.toLowerCase()))
        continue;
      items.push({
        contentId: row.content_id,
        status: row.status,
        defaultLocale: row.default_locale,
        updatedAt: row.updated_at,
        title,
        locales: translations.map((entry) => entry.locale),
      });
    }
    return { items };
  });

export const createAdminArticle = createServerFn({ method: "POST" })
  .validator((i: { title: string; locale?: string }) => ({
    title: requireTitle(i.title),
    locale: asOptionalString(i.locale),
  }))
  .handler(async ({ data }) => {
    const { db, session } = await requireArticleSession("cms.write", true);
    const { createContent, upsertContentTranslation } = await import("./db.server");
    const actor = { id: session.user.id, username: session.user.username };
    const content = await createContent(
      db,
      { entityType: "article", defaultLocale: "en", createdBy: session.user.id },
      actor,
    );
    try {
      await upsertContentTranslation(
        db,
        content,
        {
          contentId: content.id,
          locale: data.locale ?? "en",
          title: data.title,
          body: "",
          slug: data.title,
        },
        actor,
      );
    } catch (error) {
      await db.prepare("DELETE FROM cms_contents WHERE id = ?").bind(content.id).run();
      throw error;
    }
    return { contentId: content.id };
  });

export const saveAdminArticleBody = createServerFn({ method: "POST" })
  .validator(
    (i: {
      contentId: string;
      locale: string;
      body: unknown;
      categoryId?: string | null;
      coverAssetId?: string | null;
    }) => ({
      contentId: requireContentId(i.contentId),
      locale: requireArticleLocale(i.locale),
      body: i.body,
      categoryId: typeof i.categoryId === "string" && i.categoryId !== "" ? i.categoryId : null,
      coverAssetId:
        typeof i.coverAssetId === "string" && i.coverAssetId !== "" ? i.coverAssetId : null,
    }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireArticleSession("cms.write", true);
    const { upsertArticleBody } = await import("./articles.server");
    const { isSupportedLocale } = await import("./articles");
    if (!isSupportedLocale(data.locale)) throw new Error("Unsupported locale.");
    await upsertArticleBody(
      db,
      data.contentId,
      {
        locale: data.locale,
        body: data.body,
        categoryId: data.categoryId,
        coverAssetId: data.coverAssetId,
      },
      { id: session.user.id, username: session.user.username },
    );
    return { ok: true as const };
  });

export const publishAdminArticle = createServerFn({ method: "POST" })
  .validator((i: { contentId: string; to: "published" | "draft" | "archived" }) => {
    if (i.to !== "published" && i.to !== "draft" && i.to !== "archived") {
      throw new Error("Invalid status transition.");
    }
    return { contentId: requireContentId(i.contentId), to: i.to };
  })
  .handler(async ({ data }) => {
    const { db, session } = await requireArticleSession(
      data.to === "published" ? "cms.publish" : "cms.write",
      true,
    );
    const { setContentStatus } = await import("./db.server");
    await setContentStatus(
      db,
      { contentId: data.contentId, to: data.to, updatedBy: session.user.id },
      { id: session.user.id, username: session.user.username },
    );
    return { ok: true as const };
  });

export const getAdminArticleDetail = createServerFn({ method: "GET" })
  .validator((i: { contentId: string }) => ({ contentId: requireContentId(i.contentId) }))
  .handler(async ({ data }) => {
    const { db } = await requireArticleSession("cms.read");
    const { getArticleAdminDetail } = await import("./articles.server");
    return getArticleAdminDetail(db, data.contentId);
  });

export const listAdminCategories = createServerFn({ method: "GET" })
  .validator((i: { limit?: number }) => i)
  .handler(async () => {
    const { db } = await requireArticleSession("cms.read");
    const { listArticleCategories } = await import("./articles.server");
    const categories = await listArticleCategories(db);
    return { categories };
  });

export const listAdminTags = createServerFn({ method: "GET" })
  .validator((i: { limit?: number }) => i)
  .handler(async () => {
    const { db } = await requireArticleSession("cms.read");
    const { listArticleTags } = await import("./articles.server");
    const tags = await listArticleTags(db);
    return { tags };
  });

export const createAdminCategory = createServerFn({ method: "POST" })
  .validator((i: { name: string; slug?: string | undefined }) => ({
    name: requireNonEmptyString(i.name, "name"),
    slug: asOptionalString(i.slug),
  }))
  .handler(async ({ data }) => {
    const { db, session } = await requireArticleSession("cms.write", true);
    const { createArticleCategory } = await import("./articles.server");
    const clean: { name?: string | undefined; slug?: string | undefined } = {};
    if (typeof data.name === "string") clean.name = data.name;
    if (data.slug !== undefined) clean.slug = data.slug;
    const row = await createArticleCategory(db, clean, {
      id: session.user.id,
      username: session.user.username,
    });
    return { id: row.id, slug: row.slug };
  });

export const createAdminTag = createServerFn({ method: "POST" })
  .validator((i: { name: string; slug?: string | undefined }) => ({
    name: requireNonEmptyString(i.name, "name"),
    slug: asOptionalString(i.slug),
  }))
  .handler(async ({ data }) => {
    const { db, session } = await requireArticleSession("cms.write", true);
    const { createArticleTag } = await import("./articles.server");
    const clean: { name?: string | undefined; slug?: string | undefined } = {};
    if (typeof data.name === "string") clean.name = data.name;
    if (data.slug !== undefined) clean.slug = data.slug;
    const row = await createArticleTag(db, clean, {
      id: session.user.id,
      username: session.user.username,
    });
    return { id: row.id, slug: row.slug };
  });

export const setAdminArticleRefs = createServerFn({ method: "POST" })
  .validator(
    (i: {
      contentId: string;
      refs: Array<{ targetEntityType: string; targetContentId: string }>;
    }) => {
      if (!Array.isArray(i.refs)) throw new Error("Invalid refs.");
      return { contentId: requireContentId(i.contentId), refs: i.refs };
    },
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireArticleSession("cms.write", true);
    const { setArticleEntityRefs } = await import("./articles.server");
    await setArticleEntityRefs(db, data.contentId, data.refs, {
      id: session.user.id,
      username: session.user.username,
    });
    return { ok: true as const };
  });

export const setAdminArticleRelated = createServerFn({ method: "POST" })
  .validator((i: { contentId: string; relatedIds: string[] }) => {
    if (!Array.isArray(i.relatedIds)) throw new Error("Invalid related ids.");
    return { contentId: requireContentId(i.contentId), relatedIds: i.relatedIds };
  })
  .handler(async ({ data }) => {
    const { db, session } = await requireArticleSession("cms.write", true);
    const { setArticleRelated } = await import("./articles.server");
    await setArticleRelated(db, data.contentId, data.relatedIds, {
      id: session.user.id,
      username: session.user.username,
    });
    return { ok: true as const };
  });

export const setAdminArticleTags = createServerFn({ method: "POST" })
  .validator((i: { contentId: string; tagIds: string[] }) => {
    if (!Array.isArray(i.tagIds)) throw new Error("Invalid tag ids.");
    return { contentId: requireContentId(i.contentId), tagIds: i.tagIds };
  })
  .handler(async ({ data }) => {
    const { db, session } = await requireArticleSession("cms.write", true);
    const { setArticleTags } = await import("./articles.server");
    await setArticleTags(db, data.contentId, data.tagIds, {
      id: session.user.id,
      username: session.user.username,
    });
    return { ok: true as const };
  });

export const previewAdminArticle = createServerFn({ method: "POST" })
  .validator((i: { contentId: string }) => ({ contentId: requireContentId(i.contentId) }))
  .handler(async ({ data }) => {
    const { db, session } = await requireArticleSession("cms.read", true);
    const { createPreviewToken, recordAuditEvent } = await import("./db.server");
    const { buildAuditEvent } = await import("./audit");
    const grant = await createPreviewToken(db, {
      contentId: data.contentId,
      createdBy: session.user.id,
    });
    // Wave 2 — preview issuance is a privileged draft-access grant: audit it.
    await recordAuditEvent(
      db,
      buildAuditEvent({
        actor: { id: session.user.id, username: session.user.username },
        action: "preview.issue",
        entityType: "article",
        entityId: data.contentId,
      }),
    );
    return { token: grant.token, expiresAt: grant.expiresAt };
  });

export const getAdminArticleBody = createServerFn({ method: "GET" })
  .validator((i: { contentId: string; locale: string }) => ({
    contentId: requireContentId(i.contentId),
    locale: requireArticleLocale(i.locale),
  }))
  .handler(async ({ data }) => {
    const { db } = await requireArticleSession("cms.read");
    const body = await db
      .prepare(
        "SELECT body_json, category_id, cover_asset_id FROM article_bodies WHERE article_content_id = ? AND locale = ?",
      )
      .bind(data.contentId, data.locale)
      .first<{ body_json: string; category_id: string | null; cover_asset_id: string | null }>();
    if (!body) return { found: false as const };
    return {
      found: true as const,
      bodyJson: body.body_json,
      categoryId: body.category_id,
      coverAssetId: body.cover_asset_id,
    };
  });
