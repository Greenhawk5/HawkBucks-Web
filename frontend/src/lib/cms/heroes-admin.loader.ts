import { createServerFn } from "@tanstack/react-start";
import {
  requireContentId,
  requireNonEmptyString,
  requireTitle,
  asOptionalNumber,
  asOptionalString,
  asOptionalStringOrNull,
  stripUndefined,
} from "./admin-inputs";
import {
  parseAdminListSearch,
  type AdminListSearchBase,
  type AdminPageMeta,
  type AdminStatusCounts,
} from "./admin-list";
import type { HeroPerkSlot } from "./heroes-loadouts.server";
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
  /** Sprint 2: manual "Last updated" override (YYYY-MM-DD). Null = automatic mode. */
  lastUpdatedOverride: string | null;
  /** Effective date shown publicly: the override when set, else the automatic stamp. */
  lastUpdatedEffective: string | null;
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
   *
   * The one exception is `hero_perks.icon_asset_id` (migration 0015): it is
   * editorial media metadata on the PER-HERO join row, not reference text, and
   * it is written only by `upsertAdminHeroPerkIcon`. The reference sync never
   * touches that row's icon, so a re-sync cannot clobber an editor's choice.
   */
  dataSource: string;
  dataSnapshotAt: string | null;
  stwRefSlug: string | null;
  reference: {
    /** Perks this hero carries, with the join-row id the icon editor needs. */
    perks: Array<{
      id: string;
      slot: string;
      name: string;
      key: string;
      /** This hero's own override, when one is set. */
      iconAssetId: string | null;
      /** The shared perk-definition icon, when one is set. */
      defIconAssetId: string | null;
      /**
       * The shared definition's id. Surfaced so the perk editor can show which
       * definition is attached (and therefore which other heroes share it)
       * WITHOUT making this an id an editor can silently retype into an icon
       * picker.
       */
      perkDefId: string;
    }>;
    rarities: Array<{ rarity: string; tiers: number; maxPower: number | null }>;
    costRows: number;
    /**
     * Render-ready progression for the editor's read-only evolution section
     * (W7). `buildProgression` is the SAME fold the public pages use, so the CMS
     * can never show an editor a different total than the site shows a player.
     * `null` means no synced rows — the UI states that explicitly.
     */
    progression: import("./hero-reference").PublicHeroProgression | null;
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
export interface AdminListResult {
  /** One page of rows. */
  items: HeroAdminItem[];
  /** Truthful total across every page for the current filter. */
  total: number;
  /** Per-status totals for the current filter, ignoring the status filter. */
  counts: AdminStatusCounts;
  /** Derived paging state; `page` is already clamped to the real page count. */
  meta: AdminPageMeta;
}

/**
 * Heroes list page (SERVER-ONLY query path).
 *
 * Root-cause fix for the "only 50 heroes" report:
 *   - the page previously fetched `limit` rows with no total, then derived its
 *     "Showing X of Y" and every status-tab badge from that one array;
 *   - `status` and `search` were applied AFTER `LIMIT`, so filtering could only
 *     ever shrink a 50-row window instead of paging through the result set;
 *   - each row cost 2 extra queries (contents + translations), so a 50-row page
 *     was up to 101 sequential D1 round trips.
 *
 * Now search, class and status all run inside the same WHERE as the COUNT(*),
 * and the per-row lookups are batched. The query itself runs through the shared
 * `queryEntityAdminList`, which is also what bulk "select all matching" uses —
 * so the two can never disagree.
 */
async function queryAdminHeroes(
  db: import("./db.server").D1Database,
  input: AdminListSearchBase & { heroClass?: string | undefined },
): Promise<AdminListResult> {
  const { queryEntityAdminList } = await import("./admin-list.server");
  return queryEntityAdminList<AdminHeroRow, HeroAdminItem>(db, "hero", input, (row, ctx) => ({
    contentId: row.content_id,
    status: row.status,
    heroClass: row.hero_class,
    category: row.category,
    rarity: row.rarity ?? null,
    popularity: row.popularity,
    sortOrder: row.sort_order,
    defaultLocale: row.default_locale,
    updatedAt: row.updated_at,
    title: ctx.titles.get(row.content_id) ?? null,
    locales: ctx.locales.get(row.content_id) ?? [],
  }));
}

interface AdminHeroRow {
  content_id: string;
  status: string;
  hero_class: string;
  category: string | null;
  rarity: string | null;
  popularity: number;
  sort_order: number;
  default_locale: string;
  updated_at: string;
}

export const listAdminHeroes = createServerFn({ method: "GET" })
  .validator((i: Record<string, unknown>) => {
    const base = parseAdminListSearch(i);
    const heroClass = asOptionalString(i["heroClass"]);
    return { ...base, heroClass };
  })
  .handler(async ({ data }): Promise<AdminListResult> => {
    const { db } = await requireHeroSession("cms.read");
    return queryAdminHeroes(db, data);
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
    //
    // The tier rows + cost rows are folded by the SAME `buildProgression` the
    // public pages use (W7), so an editor inspecting evolution costs in the CMS
    // always sees exactly what the public page would render.
    const [refPerks, refProg, refCosts] = await Promise.all([
      db
        .prepare(
          `SELECT p.id AS id, d.slot AS slot, d.display_name AS name, d.perk_key AS perk_key,
                  p.icon_asset_id AS hero_icon_asset_id, d.icon_asset_id AS def_icon_asset_id,
                  d.id AS perk_def_id
             FROM hero_perks p JOIN hero_perk_defs d ON d.id = p.hero_perk_def_id
            WHERE p.hero_content_id = ? ORDER BY p.slot_order ASC`,
        )
        .bind(data.contentId)
        .all<{
          id: string;
          slot: string;
          name: string;
          perk_key: string;
          hero_icon_asset_id: string | null;
          def_icon_asset_id: string | null;
          perk_def_id: string;
        }>(),
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
    const { readHeroProgressionRows, readHeroProgressionCosts, buildProgression } =
      await import("./hero-reference.server");
    const [progRows, costRows] = await Promise.all([
      readHeroProgressionRows(db, [data.contentId]),
      readHeroProgressionCosts(db, [data.contentId]),
    ]);
    const progression = buildProgression(
      progRows.get(data.contentId) ?? [],
      costRows.get(data.contentId) ?? [],
      (record.rarity as string | null) ?? null,
    );
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
      lastUpdatedOverride:
        (record as { last_updated_override?: string | null }).last_updated_override ?? null,
      // Effective display: manual override wins; otherwise the automatic stamp
      // (updated_at = latest successful hero-scoped CMS save). Missing legacy
      // values stay null — never fabricate a date.
      lastUpdatedEffective:
        (record as { last_updated_override?: string | null }).last_updated_override ??
        record.updated_at ??
        null,
      recordUpdatedAt: record.updated_at ?? null,
      dataSource: record.data_source ?? "editorial",
      dataSnapshotAt: record.data_snapshot_at ?? null,
      stwRefSlug: record.stw_ref_slug ?? null,
      reference: {
        perks: refPerks.results.map((r) => ({
          id: r.id,
          slot: r.slot,
          name: r.name,
          key: r.perk_key,
          iconAssetId: r.hero_icon_asset_id ?? null,
          defIconAssetId: r.def_icon_asset_id ?? null,
          perkDefId: r.perk_def_id,
        })),
        rarities: refProg.results.map((r) => ({
          rarity: r.rarity,
          tiers: Number(r.tiers) || 0,
          maxPower: r.max_power === null ? null : Number(r.max_power),
        })),
        costRows: Number(refCosts?.n ?? 0),
        progression,
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
      /**
       * Sprint 2 manual "Last updated" override (YYYY-MM-DD). undefined =
       * preserve; null/"" = clear to automatic mode; a date = manual mode.
       * Trusted validation runs in updateHeroRecord.
       */
      lastUpdatedOverride?: string | null;
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
        lastUpdatedOverride: asOptionalStringOrNull(i.lastUpdatedOverride),
        expectedUpdatedAt: asOptionalStringOrNull(i.expectedUpdatedAt),
      }),
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireHeroSession("cms.write", true);
    const { updateHeroRecord } = await import("./heroes-loadouts.server");
    const { contentId } = data as { contentId: string };
    const { contentId: _ignored, ...patch } = data as Record<string, unknown>;
    void _ignored;
    const row = await updateHeroRecord(
      db,
      contentId,
      patch as Parameters<typeof updateHeroRecord>[2],
      { id: session.user.id, username: session.user.username },
    );
    // Returning the NEW optimistic-concurrency token is the fix for the "second
    // save fails" bug. Every update re-stamps hero_records.updated_at, so a form
    // that kept its render-time token would be rejected on its next save with a
    // misleading "changed by another editor" error. The caller adopts this token
    // immediately, so back-to-back saves from one page all succeed.
    return { ok: true as const, recordUpdatedAt: row.updated_at };
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

/* ------------------------------------------------------------------ */
/* Hero standard / commander perk assignment                            */
/* ------------------------------------------------------------------ */

/**
 * Assign (or create) the perk a hero carries in one slot.
 *
 * The editor picks EITHER an existing shared definition OR asks for a new one.
 * The slot is always supplied explicitly and re-verified against the definition
 * server-side, so a request that pairs a `commander` definition with the
 * `standard` slot is rejected rather than written.
 *
 * These are `cms.write` mutations. Saving a perk never publishes the hero —
 * lifecycle stays a separate, `cms.publish` action.
 */
export const assignAdminHeroPerk = createServerFn({ method: "POST" })
  .validator(
    (i: {
      contentId: string;
      slot: string;
      perkDefId?: string | null;
      create?: {
        displayName: string;
        description?: string;
        descriptionLocale?: string;
        iconAssetId?: string | null;
      } | null;
      replace?: boolean;
      clear?: boolean;
    }) => {
      if (i.slot !== "standard" && i.slot !== "commander") {
        throw new Error("Invalid perk slot.");
      }
      return {
        contentId: requireContentId(i.contentId),
        // Narrowed to the closed slot union so the domain service never has to
        // re-check a string the transport layer already validated.
        slot: i.slot as HeroPerkSlot,
        perkDefId: asOptionalStringOrNull(i.perkDefId) ?? null,
        create: i.create ?? null,
        replace: i.replace === true,
        clear: i.clear === true,
      };
    },
  )
  .handler(async ({ data }) => {
    const { db, session } = await requireHeroSession("cms.write", true);
    const { assignHeroPerk } = await import("./heroes-loadouts.server");
    const result = await assignHeroPerk(
      db,
      {
        heroContentId: data.contentId,
        slot: data.slot,
        perkDefId: data.perkDefId,
        create: data.create,
        replace: data.replace,
        clear: data.clear,
      },
      { id: session.user.id, username: session.user.username },
    );
    return { ok: true as const, ...result };
  });

/**
 * Shared definitions offered by the assignment picker, for one slot.
 *
 * A GET reader (guard-free by the repo's mutation contract).
 */
export const listAdminHeroPerkDefinitions = createServerFn({ method: "GET" })
  .validator((i: { slot: string; search?: string }) => {
    if (i.slot !== "standard" && i.slot !== "commander") {
      throw new Error("Invalid perk slot.");
    }
    return { slot: i.slot as HeroPerkSlot, search: asOptionalString(i.search) ?? "" };
  })
  .handler(async ({ data }) => {
    const { db } = await requireHeroSession("cms.read");
    const { listHeroPerkDefinitions } = await import("./heroes-loadouts.server");
    const items = await listHeroPerkDefinitions(db, data.slot, { search: data.search });
    return { items, slot: data.slot };
  });
/**
 * Set or clear the perk icon for ONE hero.
 *
 * `iconAssetId` is a media_assets.id, validated server-side by
 * `assertMediaUsable` (the asset must exist and not be tombstoned) — the
 * browser never gets to choose what counts as eligible media.
 *
 * `heroPerkId` is the `hero_perks` row id, NOT the perk definition id: the
 * definition is shared by many heroes, and the identity of the hero the row
 * belongs to is re-checked inside the domain service so a forged pair cannot
 * write to another hero's perk. Only that one column changes; the perk's name,
 * description, slot, slot_order and translations are never read or written.
 */
export const upsertAdminHeroPerkIcon = createServerFn({ method: "POST" })
  .validator((i: { contentId: string; heroPerkId: string; iconAssetId?: string | null }) => ({
    contentId: requireContentId(i.contentId),
    heroPerkId: requireNonEmptyString(i.heroPerkId, "heroPerkId"),
    iconAssetId: asOptionalStringOrNull(i.iconAssetId),
  }))
  .handler(async ({ data }) => {
    const { db, session } = await requireHeroSession("cms.write", true);
    const { setHeroPerkIcon } = await import("./heroes-loadouts.server");
    await setHeroPerkIcon(
      db,
      {
        heroContentId: data.contentId,
        heroPerkId: data.heroPerkId,
        iconAssetId: data.iconAssetId ?? null,
      },
      { id: session.user.id, username: session.user.username },
    );
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
