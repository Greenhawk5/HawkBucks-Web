import { createServerFn } from "@tanstack/react-start";
async function requireLoadoutSession(cap: "cms.read" | "cms.write") {
  const { resolveRequestCmsDb } = await import("./db.server");
  const { resolveRequestSession, hasCapability, CmsAuthError } = await import("./auth.server");
  const { db } = await resolveRequestCmsDb();
  const session = await resolveRequestSession(db);
  if (!session) throw new CmsAuthError(401, "CMS authentication required.");
  if (!hasCapability(session.user.role, cap)) throw new CmsAuthError(403, "Forbidden.");
  return { db, session };
}
function clampLoadoutPaging(input: { limit?: number; offset?: number }): {
  limit: number;
  offset: number;
} {
  return {
    limit: Math.max(1, Math.min(100, Math.floor(input.limit ?? 50))),
    offset: Math.max(0, Math.floor(input.offset ?? 0)),
  };
}
export interface LoadoutAdminItem {
  contentId: string;
  status: string;
  loadoutType: string;
  popularity: number;
  sortOrder: number;
  defaultLocale: string;
  updatedAt: string;
  title: string | null;
  locales: string[];
  heroCount: number;
}
export interface LoadoutAdminDetail extends LoadoutAdminItem {
  coverAssetId: string | null;
  translations: Array<{
    locale: string;
    title: string;
    body: string;
    slug: string;
    seoTitle: string | null;
    seoDescription: string | null;
    translationStatus: string;
  }>;
  heroes: Array<{ contentId: string; slotOrder: number; title: string | null; status: string }>;
}
export const listAdminLoadouts = createServerFn({ method: "GET" })
  .validator((i: { status?: string; search?: string; limit?: number; offset?: number }) => i)
  .handler(async ({ data }): Promise<{ items: LoadoutAdminItem[] }> => {
    const { db } = await requireLoadoutSession("cms.read");
    const { limit, offset } = clampLoadoutPaging(data);
    const { results } = await db
      .prepare(
        "SELECT l.*, c.status AS c_status, c.default_locale AS c_default, c.updated_at AS c_updated FROM loadout_records l JOIN cms_contents c ON c.id = l.content_id ORDER BY l.sort_order ASC, l.popularity DESC LIMIT ? OFFSET ?",
      )
      .bind(limit, offset)
      .all<{
        content_id: string;
        loadout_type: string;
        popularity: number;
        sort_order: number;
        c_status: string;
        c_default: string;
        c_updated: string;
      }>();
    const items: LoadoutAdminItem[] = [];
    for (const r of results) {
      if (data.status && r.c_status !== data.status) continue;
      const { results: trs } = await db
        .prepare("SELECT locale, title FROM cms_content_translations WHERE content_id = ?")
        .bind(r.content_id)
        .all<{ locale: string; title: string }>();
      const t = trs.find((x) => x.locale === r.c_default)?.title ?? trs[0]?.title ?? null;
      if (data.search && t && !t.toLowerCase().includes(String(data.search).toLowerCase()))
        continue;
      const count = await db
        .prepare("SELECT id FROM loadout_heroes WHERE loadout_content_id = ?")
        .bind(r.content_id)
        .all<{ id: string }>();
      items.push({
        contentId: r.content_id,
        status: r.c_status,
        loadoutType: r.loadout_type,
        popularity: r.popularity,
        sortOrder: r.sort_order,
        defaultLocale: r.c_default,
        updatedAt: r.c_updated,
        title: t,
        locales: trs.map((x) => x.locale),
        heroCount: count.results.length,
      });
    }
    return { items };
  });
export const getAdminLoadout = createServerFn({ method: "GET" })
  .validator((i: { contentId: string }) => i)
  .handler(async ({ data }): Promise<{ loadout: LoadoutAdminDetail }> => {
    const { db } = await requireLoadoutSession("cms.read");
    const { getLoadoutRecord, listLoadoutHeroes } = await import("./heroes-loadouts.server");
    const c = await db
      .prepare("SELECT * FROM cms_contents WHERE id = ? AND entity_type = 'loadout'")
      .bind(data.contentId)
      .first<{ id: string; status: string; default_locale: string; updated_at: string }>();
    if (!c) throw new Error("Loadout not found.");
    const record = await getLoadoutRecord(db, data.contentId);
    if (!record) throw new Error("Loadout not found.");
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
    const members = await listLoadoutHeroes(db, data.contentId);
    const heroes: LoadoutAdminDetail["heroes"] = [];
    for (const m of members) {
      const hc = await db
        .prepare("SELECT status FROM cms_contents WHERE id = ?")
        .bind(m.hero_content_id)
        .first<{ status: string }>();
      const ht = await db
        .prepare("SELECT title FROM cms_content_translations WHERE content_id = ? AND locale = ?")
        .bind(m.hero_content_id, c.default_locale)
        .first<{ title: string }>();
      heroes.push({
        contentId: m.hero_content_id,
        slotOrder: m.slot_order,
        title: ht?.title ?? null,
        status: hc?.status ?? "unknown",
      });
    }
    return {
      loadout: {
        contentId: data.contentId,
        status: c.status,
        loadoutType: record.loadout_type,
        popularity: record.popularity,
        sortOrder: record.sort_order,
        defaultLocale: c.default_locale,
        updatedAt: c.updated_at,
        title: trs.find((x) => x.locale === c.default_locale)?.title ?? trs[0]?.title ?? null,
        locales: trs.map((x) => x.locale),
        heroCount: members.length,
        coverAssetId: record.cover_asset_id,
        translations: trs.map((t) => ({
          locale: t.locale,
          title: t.title,
          body: t.body,
          slug: t.slug,
          seoTitle: t.seo_title,
          seoDescription: t.seo_description,
          translationStatus: t.translation_status,
        })),
        heroes,
      },
    };
  });
export const createAdminLoadout = createServerFn({ method: "POST" })
  .validator(
    (i: {
      loadoutType?: string;
      popularity?: number;
      sortOrder?: number;
      title: string;
      body?: string;
      slug?: string;
      locale?: string;
    }) => i,
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireLoadoutSession("cms.write");
    const { createContent, upsertContentTranslation } = await import("./db.server");
    const { createLoadoutRecord } = await import("./heroes-loadouts.server");
    const actor = { id: session.user.id, username: session.user.username };
    const content = await createContent(
      db,
      { entityType: "loadout", defaultLocale: "en", createdBy: session.user.id },
      actor,
    );
    try {
      await createLoadoutRecord(
        db,
        content,
        {
          loadoutType: data.loadoutType ?? "custom",
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
export const updateAdminLoadout = createServerFn({ method: "POST" })
  .validator(
    (i: {
      contentId: string;
      loadoutType?: string;
      popularity?: number;
      sortOrder?: number;
      coverAssetId?: string | null;
    }) => i,
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireLoadoutSession("cms.write");
    const { updateLoadoutRecord } = await import("./heroes-loadouts.server");
    await updateLoadoutRecord(db, data.contentId, data, {
      id: session.user.id,
      username: session.user.username,
    });
    return { ok: true as const };
  });
export const setAdminLoadoutHeroes = createServerFn({ method: "POST" })
  .validator(
    (i: { contentId: string; heroContentIds: string[]; heroSlots?: Array<string | null> }) => i,
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireLoadoutSession("cms.write");
    const { setLoadoutHeroes } = await import("./heroes-loadouts.server");
    await setLoadoutHeroes(db, data.contentId, data.heroSlots ?? data.heroContentIds, {
      id: session.user.id,
      username: session.user.username,
    });
    return { ok: true as const };
  });
export const upsertAdminAbility = createServerFn({ method: "POST" })
  .validator(
    (i: {
      heroContentId: string;
      abilityKey: string;
      sortOrder?: number;
      iconAssetId?: string | null;
      name?: string;
      description?: string;
      locale?: string;
    }) => i,
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireLoadoutSession("cms.write");
    const { upsertAbility, upsertAbilityTranslation } = await import("./heroes-loadouts.server");
    const actor = { id: session.user.id, username: session.user.username };
    const ability = await upsertAbility(
      db,
      data.heroContentId,
      {
        abilityKey: data.abilityKey,
        sortOrder: data.sortOrder ?? 0,
        iconAssetId: data.iconAssetId ?? null,
      },
      actor,
    );
    if (data.name)
      await upsertAbilityTranslation(
        db,
        ability.id,
        { locale: data.locale ?? "en", name: data.name, description: data.description ?? "" },
        actor,
      );
    return { abilityId: ability.id };
  });
