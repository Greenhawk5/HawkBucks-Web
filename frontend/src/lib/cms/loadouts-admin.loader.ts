import { createServerFn } from "@tanstack/react-start";
import {
  asOptionalNumber,
  asOptionalString,
  asOptionalStringOrNull,
  requireContentId,
  requireNonEmptyString,
  requireTitle,
  stripUndefined,
} from "./admin-inputs";
import { parseAdminListSearch, type AdminPageMeta, type AdminStatusCounts } from "./admin-list";
async function requireLoadoutSession(cap: "cms.read" | "cms.write", mutate = false) {
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
  teamPerkContentId: string | null;
  teamPerkTitle: string | null;
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
export interface LoadoutAdminListResult {
  items: LoadoutAdminItem[];
  total: number;
  counts: AdminStatusCounts;
  meta: AdminPageMeta;
}

export const listAdminLoadouts = createServerFn({ method: "GET" })
  .validator((i: Record<string, unknown>) => {
    const base = parseAdminListSearch(i);
    const loadoutType = asOptionalString(i["loadoutType"]);
    return { ...base, loadoutType };
  })
  .handler(async ({ data }): Promise<LoadoutAdminListResult> => {
    const { db } = await requireLoadoutSession("cms.read");
    // Same fix as heroes, plus the per-row `loadout_heroes` count is batched
    // into one COUNT(*) ... GROUP BY instead of N queries.
    const { queryEntityAdminList } = await import("./admin-list.server");
    const list = await queryEntityAdminList<
      {
        content_id: string;
        status: string;
        loadout_type: string;
        popularity: number;
        sort_order: number;
        default_locale: string;
        updated_at: string;
        entity_type: string;
      },
      LoadoutAdminItem
    >(db, "loadout", data, (row, ctx) => ({
      contentId: row.content_id,
      status: row.status,
      loadoutType: row.loadout_type,
      popularity: row.popularity,
      sortOrder: row.sort_order,
      defaultLocale: row.default_locale,
      updatedAt: row.updated_at,
      title: ctx.titles.get(row.content_id) ?? null,
      locales: ctx.locales.get(row.content_id) ?? [],
      heroCount: 0,
    }));
    // Batch the roster counts for this page in one query.
    if (list.items.length > 0) {
      const placeholders = list.items.map(() => "?").join(", ");
      const { results } = await db
        .prepare(
          `SELECT loadout_content_id AS loadout_content_id, COUNT(*) AS n
             FROM loadout_heroes
            WHERE loadout_content_id IN (${placeholders})
            GROUP BY loadout_content_id`,
        )
        .bind(...list.items.map((item) => item.contentId))
        .all<{ loadout_content_id: string; n: number }>();
      const byLoadout = new Map(results.map((row) => [row.loadout_content_id, Number(row.n) || 0]));
      for (const item of list.items) item.heroCount = byLoadout.get(item.contentId) ?? 0;
    }
    return list;
  });
export const getAdminLoadout = createServerFn({ method: "GET" })
  .validator((i: { contentId: string }) => ({ contentId: requireContentId(i.contentId) }))
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
    const teamPerkId = (record.team_perk_content_id as string | null) ?? null;
    const teamPerkTitle =
      teamPerkId !== null
        ? ((
            await db
              .prepare(
                "SELECT title FROM cms_content_translations WHERE content_id = ? AND locale = ?",
              )
              .bind(teamPerkId, c.default_locale)
              .first<{ title: string }>()
          )?.title ?? null)
        : null;
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
        teamPerkContentId: teamPerkId,
        teamPerkTitle,
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
      coverAssetId?: string | null;
      teamPerkContentId?: string | null;
      /** Wave 1 — optional roster at creation; same rules as the Roster section. */
      heroSlots?: Array<string | null>;
      schematicContentIds?: string[];
      title: string;
      body?: string;
      slug?: string;
      locale?: string;
      seoTitle?: string | null;
      seoDescription?: string | null;
    }) => ({
      loadoutType: asOptionalString(i.loadoutType),
      popularity: asOptionalNumber(i.popularity),
      sortOrder: asOptionalNumber(i.sortOrder),
      coverAssetId: asOptionalStringOrNull(i.coverAssetId),
      teamPerkContentId: asOptionalStringOrNull(i.teamPerkContentId),
      heroSlots: Array.isArray(i.heroSlots) ? i.heroSlots : undefined,
      schematicContentIds: Array.isArray(i.schematicContentIds) ? i.schematicContentIds : undefined,
      title: requireTitle(i.title),
      body: asOptionalString(i.body),
      slug: asOptionalString(i.slug),
      locale: asOptionalString(i.locale),
      seoTitle: asOptionalStringOrNull(i.seoTitle),
      seoDescription: asOptionalStringOrNull(i.seoDescription),
    }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireLoadoutSession("cms.write", true);
    const { createLoadoutDraft } = await import("./content-create.server");
    // The SAME domain service the JSON importer calls — one create path, one
    // rollback, one set of entity + roster rules.
    return createLoadoutDraft(db, { id: session.user.id, username: session.user.username }, data);
  });
export const setAdminLoadoutTeamPerk = createServerFn({ method: "POST" })
  .validator((i: { contentId: string; teamPerkContentId?: string | null }) => ({
    contentId: requireContentId(i.contentId),
    teamPerkContentId: asOptionalStringOrNull(i.teamPerkContentId),
  }))
  .handler(async ({ data }) => {
    const { db, session } = await requireLoadoutSession("cms.write", true);
    const { updateLoadoutRecord } = await import("./heroes-loadouts.server");
    await updateLoadoutRecord(
      db,
      data.contentId,
      { teamPerkContentId: data.teamPerkContentId ?? null },
      { id: session.user.id, username: session.user.username },
    );
    return { ok: true as const };
  });
export const updateAdminLoadout = createServerFn({ method: "POST" })
  .validator(
    (i: {
      contentId: string;
      loadoutType?: string;
      popularity?: number;
      sortOrder?: number;
      coverAssetId?: string | null;
      teamPerkContentId?: string | null;
    }) =>
      stripUndefined({
        contentId: requireContentId(i.contentId),
        loadoutType: asOptionalString(i.loadoutType),
        popularity: asOptionalNumber(i.popularity),
        sortOrder: asOptionalNumber(i.sortOrder),
        coverAssetId: asOptionalStringOrNull(i.coverAssetId),
        teamPerkContentId: asOptionalStringOrNull(i.teamPerkContentId),
      }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireLoadoutSession("cms.write", true);
    const { updateLoadoutRecord } = await import("./heroes-loadouts.server");
    const { contentId } = data as { contentId: string };
    const { contentId: _ignored, ...patch } = data as Record<string, unknown>;
    void _ignored;
    await updateLoadoutRecord(db, contentId, patch as Parameters<typeof updateLoadoutRecord>[2], {
      id: session.user.id,
      username: session.user.username,
    });
    return { ok: true as const };
  });
export const setAdminLoadoutHeroes = createServerFn({ method: "POST" })
  .validator(
    (i: { contentId: string; heroContentIds: string[]; heroSlots?: Array<string | null> }) => {
      if (!Array.isArray(i.heroContentIds)) throw new Error("Invalid heroContentIds.");
      if (i.heroSlots !== undefined) {
        if (!Array.isArray(i.heroSlots)) throw new Error("Invalid heroSlots.");
        for (const slot of i.heroSlots) {
          if (slot !== null && typeof slot !== "string") throw new Error("Invalid heroSlots.");
        }
      }
      return {
        contentId: requireContentId(i.contentId),
        heroContentIds: i.heroContentIds,
        heroSlots: i.heroSlots,
      };
    },
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireLoadoutSession("cms.write", true);
    const { setLoadoutHeroes } = await import("./heroes-loadouts.server");
    await setLoadoutHeroes(db, data.contentId, data.heroSlots ?? data.heroContentIds, {
      id: session.user.id,
      username: session.user.username,
    });
    return { ok: true as const };
  });
export const setAdminLoadoutSchematics = createServerFn({ method: "POST" })
  .validator((i: { contentId: string; schematicContentIds: string[] }) => {
    if (!Array.isArray(i.schematicContentIds)) throw new Error("Invalid schematicContentIds.");
    for (const id of i.schematicContentIds) {
      if (typeof id !== "string" || id.trim() === "") throw new Error("Invalid schematic id.");
    }
    if (i.schematicContentIds.length > 12) throw new Error("At most 12 schematics per loadout.");
    return { contentId: requireContentId(i.contentId), schematicContentIds: i.schematicContentIds };
  })
  .handler(async ({ data }) => {
    const { db, session } = await requireLoadoutSession("cms.write", true);
    // Wave 1 — the roster write moved into heroes-loadouts.server.ts so the
    // JSON importer can attach schematics through the SAME rules, rather than
    // this handler keeping a private second copy of the INSERTs.
    const { setLoadoutSchematics } = await import("./heroes-loadouts.server");
    await setLoadoutSchematics(db, data.contentId, data.schematicContentIds, {
      id: session.user.id,
      username: session.user.username,
    });
    return { ok: true as const };
  });
/**
 * Ability write boundary.
 *
 * Every field is OPTIONAL and "absent" means "leave the stored value alone",
 * so a caller that only wants to pick an icon does not have to re-supply the
 * ability's order, name or description. The domain layer turns that into a
 * single-column UPDATE; see `upsertAbility` in heroes-loadouts.server.ts.
 */
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
    }) => ({
      heroContentId: requireContentId(i.heroContentId),
      abilityKey: requireNonEmptyString(i.abilityKey, "abilityKey"),
      sortOrder: asOptionalNumber(i.sortOrder),
      iconAssetId: asOptionalStringOrNull(i.iconAssetId),
      name: asOptionalString(i.name),
      description: asOptionalString(i.description),
      locale: asOptionalString(i.locale),
    }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireLoadoutSession("cms.write", true);
    const { upsertAbility, upsertAbilityTranslation } = await import("./heroes-loadouts.server");
    const actor = { id: session.user.id, username: session.user.username };
    const ability = await upsertAbility(
      db,
      data.heroContentId,
      {
        abilityKey: data.abilityKey,
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.iconAssetId !== undefined ? { iconAssetId: data.iconAssetId } : {}),
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
