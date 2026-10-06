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
  /** Phase 23 editorial one-liner. */
  summary: string | null;
  /**
   * hero_records.updated_at, surfaced so the editor can send it back as an
   * optimistic concurrency token. Distinct from HeroAdminItem.updatedAt, which
   * is cms_contents.updated_at.
   */
  recordUpdatedAt: string | null;
  /**
   * Reference provenance + a READ-ONLY summary of what the sync populated.
   * No admin mutation writes to hero_perks / hero_progression /
   * hero_progression_costs / hero_perk_defs / ability_defs, so a reference-only
   * rollback stays safe.
   */
  dataSource: string;
  dataSnapshotAt: string | null;
  stwRefSlug: string | null;
  reference: {
    perks: Array<{ slot: string; name: string; key: string }>;
    rarities: Array<{ rarity: string; tiers: number; maxPower: number | null }>;
    costRows: number;
  };
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
    // Phase 23 reference summary. READ-ONLY: the CMS displays this so an editor
    // can see what the sync populated, but no admin mutation writes to these
    // tables. That separation is what makes a later reference-only rollback
    // (delete rows WHERE data_source='stw-sync') safe.
    const [refPerks, refProg, refCosts] = await Promise.all([
      db
        .prepare(
          `SELECT d.slot AS slot, d.display_name AS name, d.perk_key AS perk_key
             FROM hero_perks p JOIN hero_perk_defs d ON d.id = p.hero_perk_def_id
            WHERE p.hero_content_id = ? ORDER BY p.slot_order ASC`,
        )
        .bind(data.contentId)
        .all<{ slot: string; name: string; perk_key: string }>(),
      db
        .prepare(
          `SELECT rarity, COUNT(*) AS tiers, MAX(power_max) AS max_power
             FROM hero_progression WHERE hero_content_id = ?
            GROUP BY rarity ORDER BY rarity ASC`,
        )
        .bind(data.contentId)
        .all<{ rarity: string; tiers: number; max_power: number | null }>(),
      db
        .prepare(`SELECT COUNT(*) AS n FROM hero_progression_costs WHERE hero_content_id = ?`)
        .bind(data.contentId)
        .first<{ n: number }>(),
    ]);
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
      summary: record.summary ?? null,
      recordUpdatedAt: record.updated_at ?? null,
      dataSource: record.data_source ?? "editorial",
      dataSnapshotAt: record.data_snapshot_at ?? null,
      stwRefSlug: record.stw_ref_slug ?? null,
      reference: {
        perks: refPerks.results.map((r) => ({ slot: r.slot, name: r.name, key: r.perk_key })),
        rarities: refProg.results.map((r) => ({
          rarity: r.rarity,
          tiers: Number(r.tiers) || 0,
          maxPower: r.max_power === null ? null : Number(r.max_power),
        })),
        costRows: Number(refCosts?.n ?? 0),
      },
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
      /** Wave 1 — media may now be set at creation, not only on update. */
      portraitAssetId?: string | null;
      bannerAssetId?: string | null;
      title: string;
      body?: string;
      slug?: string;
      locale?: string;
      seoTitle?: string | null;
      seoDescription?: string | null;
    }) => ({
      heroClass: requireNonEmptyString(i.heroClass, "heroClass"),
      category: asOptionalStringOrNull(i.category),
      rarity: asOptionalStringOrNull(i.rarity),
      popularity: asOptionalNumber(i.popularity),
      sortOrder: asOptionalNumber(i.sortOrder),
      portraitAssetId: asOptionalStringOrNull(i.portraitAssetId),
      bannerAssetId: asOptionalStringOrNull(i.bannerAssetId),
      title: requireTitle(i.title),
      body: asOptionalString(i.body),
      slug: asOptionalString(i.slug),
      locale: asOptionalString(i.locale),
      seoTitle: asOptionalStringOrNull(i.seoTitle),
      seoDescription: asOptionalStringOrNull(i.seoDescription),
    }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireHeroSession("cms.write", true);
    const { createHeroDraft } = await import("./content-create.server");
    // The SAME domain service the JSON importer calls — one create path, one
    // rollback, one set of entity rules.
    return createHeroDraft(db, { id: session.user.id, username: session.user.username }, data);
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
      /** Phase 23 editorial one-liner shown on cards and in quick view. */
      summary?: string | null;
      /** Optimistic concurrency token (hero_records.updated_at as rendered). */
      expectedUpdatedAt?: string | null;
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
        summary: asOptionalStringOrNull(i.summary),
        expectedUpdatedAt: asOptionalStringOrNull(i.expectedUpdatedAt),
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
