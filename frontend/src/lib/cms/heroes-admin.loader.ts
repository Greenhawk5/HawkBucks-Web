import { createServerFn } from "@tanstack/react-start";
import {
  asSearchFilter,
  asStatusFilter,
  clampAdminPaging,
  requireContentId,
  requireNonEmptyString,
  requireTitle,
  asOptionalNumber,
  asOptionalString,
  asOptionalStringOrNull,
  stripUndefined,
} from "./admin-inputs";
async function requireHeroSession(cap: "cms.read" | "cms.write" | "cms.publish", mutate = false) {
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
export interface HeroAdminItem {
  contentId: string;
  status: string;
  heroClass: string;
  category: string | null;
  rarity: string | null;
  popularity: number;
  sortOrder: number;
  defaultLocale: string;
  updatedAt: string;
  title: string | null;
  locales: string[];
}
export interface HeroAdminDetail extends HeroAdminItem {
  portraitAssetId: string | null;
  bannerAssetId: string | null;
  translations: Array<{
    locale: string;
    title: string;
    body: string;
    slug: string;
    seoTitle: string | null;
    seoDescription: string | null;
    translationStatus: string;
  }>;
  abilities: Array<{
    id: string;
    abilityKey: string;
    sortOrder: number;
    iconAssetId: string | null;
    translations: Array<{ locale: string; name: string; description: string }>;
  }>;
}
export const listAdminHeroes = createServerFn({ method: "GET" })
  .validator(
    (i: {
      heroClass?: string;
      search?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }) => {
      const status = asStatusFilter(i.status);
      const search = asSearchFilter(i.search);
      const { limit, offset } = clampAdminPaging(i);
      const heroClass = asOptionalString(i.heroClass);
      return { heroClass, search, status, limit, offset };
    },
  )
  .handler(async ({ data }): Promise<{ items: HeroAdminItem[] }> => {
    const { db } = await requireHeroSession("cms.read");
    const { listHeroRecords } = await import("./heroes-loadouts.server");
    const { limit, offset } = clampAdminPaging(data);
    const records = await listHeroRecords(
      db,
      data.heroClass === undefined
        ? { limit, offset }
        : { heroClass: data.heroClass, limit, offset },
    );
    const items: HeroAdminItem[] = [];
    for (const r of records) {
      const c = await db
        .prepare("SELECT * FROM cms_contents WHERE id = ?")
        .bind(r.content_id)
        .first<{ id: string; status: string; default_locale: string; updated_at: string }>();
      if (!c) continue;
      if (data.status && c.status !== data.status) continue;
      const { results } = await db
        .prepare("SELECT locale, title FROM cms_content_translations WHERE content_id = ?")
        .bind(r.content_id)
        .all<{ locale: string; title: string }>();
      const t =
        results.find((x) => x.locale === c.default_locale)?.title ?? results[0]?.title ?? null;
      if (data.search && t && !t.toLowerCase().includes(String(data.search).toLowerCase()))
        continue;
      items.push({
        contentId: r.content_id,
        status: c.status,
        heroClass: r.hero_class,
        category: r.category,
        rarity: (r.rarity as string | null) ?? null,
        popularity: r.popularity,
        sortOrder: r.sort_order,
        defaultLocale: c.default_locale,
        updatedAt: c.updated_at,
        title: t,
        locales: results.map((x) => x.locale),
      });
    }
    return { items };
  });
export const getAdminHero = createServerFn({ method: "GET" })
  .validator((i: { contentId: string }) => ({ contentId: requireContentId(i.contentId) }))
  .handler(async ({ data }): Promise<{ hero: HeroAdminDetail }> => {
    const { db } = await requireHeroSession("cms.read");
    const { getHeroRecord, listAbilities, listAbilityTranslations } =
      await import("./heroes-loadouts.server");
    const c = await db
      .prepare("SELECT * FROM cms_contents WHERE id = ? AND entity_type = 'hero'")
      .bind(data.contentId)
      .first<{ id: string; status: string; default_locale: string; updated_at: string }>();
    if (!c) throw new Error("Hero not found.");
    const record = await getHeroRecord(db, data.contentId);
    if (!record) throw new Error("Hero not found.");
    const { results: trs } = await db
      .prepare(
        "SELECT locale, title, body, slug, seo_title, seo_description, translation_status FROM cms_content_translations WHERE content_id = ?",
      )
      .bind(data.contentId)
      .all<{
        locale: string;
        title: string;
        body: string;
        slug: string;
        seo_title: string | null;
        seo_description: string | null;
        translation_status: string;
      }>();
    const abilities = await listAbilities(db, data.contentId);
    const detail: HeroAdminDetail = {
      contentId: data.contentId,
      status: c.status,
      heroClass: record.hero_class,
      category: record.category,
      rarity: (record.rarity as string | null) ?? null,
      popularity: record.popularity,
      sortOrder: record.sort_order,
      defaultLocale: c.default_locale,
      updatedAt: c.updated_at,
      title: trs.find((x) => x.locale === c.default_locale)?.title ?? trs[0]?.title ?? null,
      locales: trs.map((x) => x.locale),
      portraitAssetId: record.portrait_asset_id,
      bannerAssetId: record.banner_asset_id,
      translations: trs.map((t) => ({
        locale: t.locale,
        title: t.title,
        body: t.body,
        slug: t.slug,
        seoTitle: t.seo_title,
        seoDescription: t.seo_description,
        translationStatus: t.translation_status,
      })),
      abilities: [],
    };
    for (const a of abilities) {
      const translations = await listAbilityTranslations(db, a.id);
      detail.abilities.push({
        id: a.id,
        abilityKey: a.ability_key,
        sortOrder: a.sort_order,
        iconAssetId: a.icon_asset_id,
        translations: translations.map((t) => ({
          locale: t.locale,
          name: t.name,
          description: t.description,
        })),
      });
    }
    return { hero: detail };
  });
export const createAdminHero = createServerFn({ method: "POST" })
  .validator(
    (i: {
      heroClass: string;
      category?: string | null;
      rarity?: string | null;
      popularity?: number;
      sortOrder?: number;
      title: string;
      body?: string;
      slug?: string;
      locale?: string;
    }) => ({
      heroClass: requireNonEmptyString(i.heroClass, "heroClass"),
      category: asOptionalStringOrNull(i.category),
      rarity: asOptionalStringOrNull(i.rarity),
      popularity: asOptionalNumber(i.popularity),
      sortOrder: asOptionalNumber(i.sortOrder),
      title: requireTitle(i.title),
      body: asOptionalString(i.body),
      slug: asOptionalString(i.slug),
      locale: asOptionalString(i.locale),
    }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireHeroSession("cms.write", true);
    const { createContent, upsertContentTranslation } = await import("./db.server");
    const { createHeroRecord } = await import("./heroes-loadouts.server");
    const actor = { id: session.user.id, username: session.user.username };
    const content = await createContent(
      db,
      { entityType: "hero", defaultLocale: "en", createdBy: session.user.id },
      actor,
    );
    try {
      await createHeroRecord(
        db,
        content,
        {
          heroClass: data.heroClass,
          category: data.category ?? null,
          rarity: data.rarity ?? null,
          popularity: data.popularity ?? 0,
          sortOrder: data.sortOrder ?? 0,
        },
        actor,
      );
      await upsertContentTranslation(
        db,
        content,
        {
          contentId: content.id,
          locale: data.locale ?? "en",
          title: data.title,
          body: data.body ?? "",
          slug: data.slug ?? data.title,
        },
        actor,
      );
    } catch (e) {
      await db.prepare("DELETE FROM cms_contents WHERE id = ?").bind(content.id).run();
      throw e;
    }
    return { contentId: content.id };
  });
export const updateAdminHero = createServerFn({ method: "POST" })
  .validator(
    (i: {
      contentId: string;
      heroClass?: string;
      category?: string | null;
      rarity?: string | null;
      popularity?: number;
      sortOrder?: number;
      portraitAssetId?: string | null;
      bannerAssetId?: string | null;
    }) =>
      stripUndefined({
        contentId: requireContentId(i.contentId),
        heroClass: asOptionalString(i.heroClass),
        category: asOptionalStringOrNull(i.category),
        rarity: asOptionalStringOrNull(i.rarity),
        popularity: asOptionalNumber(i.popularity),
        sortOrder: asOptionalNumber(i.sortOrder),
        portraitAssetId: asOptionalStringOrNull(i.portraitAssetId),
        bannerAssetId: asOptionalStringOrNull(i.bannerAssetId),
      }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireHeroSession("cms.write", true);
    const { updateHeroRecord } = await import("./heroes-loadouts.server");
    const { contentId } = data as { contentId: string };
    const { contentId: _ignored, ...patch } = data as Record<string, unknown>;
    void _ignored;
    await updateHeroRecord(db, contentId, patch as Parameters<typeof updateHeroRecord>[2], {
      id: session.user.id,
      username: session.user.username,
    });
    return { ok: true as const };
  });
export const deleteAdminAbility = createServerFn({ method: "POST" })
  .validator((i: { abilityId: string }) => ({
    abilityId: requireNonEmptyString(i.abilityId, "abilityId"),
  }))
  .handler(async ({ data }) => {
    const { db, session } = await requireHeroSession("cms.write", true);
    const { deleteAbility } = await import("./heroes-loadouts.server");
    await deleteAbility(db, data.abilityId, {
      id: session.user.id,
      username: session.user.username,
    });
    return { ok: true as const };
  });
export const publishAdminContent = createServerFn({ method: "POST" })
  .validator((i: { contentId: string; to: "published" | "draft" | "archived" }) => {
    if (i.to !== "published" && i.to !== "draft" && i.to !== "archived") {
      throw new Error("Invalid status transition.");
    }
    return { contentId: requireContentId(i.contentId), to: i.to };
  })
  .handler(async ({ data }) => {
    const { db, session } = await requireHeroSession(
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
export const upsertAdminTranslation = createServerFn({ method: "POST" })
  .validator(
    (i: {
      contentId: string;
      locale: string;
      title: string;
      body?: string;
      slug?: string;
      seoTitle?: string | null;
      seoDescription?: string | null;
      translationStatus?: string;
    }) => ({
      contentId: requireContentId(i.contentId),
      locale: requireNonEmptyString(i.locale, "locale"),
      title: requireTitle(i.title),
      body: asOptionalString(i.body),
      slug: asOptionalString(i.slug),
      seoTitle: asOptionalStringOrNull(i.seoTitle),
      seoDescription: asOptionalStringOrNull(i.seoDescription),
      translationStatus: asOptionalString(i.translationStatus),
    }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireHeroSession("cms.write", true);
    const { getContentById, upsertContentTranslation } = await import("./db.server");
    const content = await getContentById(db, data.contentId);
    if (!content) throw new Error("Content not found.");
    await upsertContentTranslation(
      db,
      content,
      {
        contentId: content.id,
        locale: data.locale,
        title: data.title,
        body: data.body ?? "",
        slug: data.slug ?? data.title,
        translationStatus: data.translationStatus ?? "draft",
        seoTitle: data.seoTitle ?? null,
        seoDescription: data.seoDescription ?? null,
      },
      { id: session.user.id, username: session.user.username },
    );
    return { ok: true as const };
  });
