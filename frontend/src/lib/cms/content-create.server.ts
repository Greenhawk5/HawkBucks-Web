/**
 * Wave 1 — shared content-draft creation service (SERVER-ONLY).
 *
 * WHY THIS EXISTS
 * ---------------
 * Before Wave 1, "create a draft" was written out inline inside each
 * `createAdmin*` server function:
 *
 *   createContent → create<Kind>Record → upsertContentTranslation
 *   ...with a compensating `DELETE FROM cms_contents` in the catch.
 *
 * That sequence is the domain rule for making a draft, and duplicating it a
 * second time inside a JSON importer is exactly the "Normal Create" vs "JSON
 * Import Create" divergence the brief forbids. So the sequence moved HERE, and
 * both callers now invoke the same function.
 *
 *   admin create dialog ─┐
 *                        ├─► createHeroDraft / createSchematicDraft ─► drafts
 *   JSON importer ────────┘
 *
 * Everything the domain requires is already enforced by the services called
 * here — `createContent` forces status 'draft', `create*Record` runs
 * `assertMediaUsable` plus the entity's enum/number rules, and
 * `upsertContentTranslation` owns slug normalisation and collision resolution.
 * This module adds no rules of its own.
 */

import "@tanstack/react-start/server-only";

import type { AuditActor } from "./audit";
import type { D1Database, ContentRow } from "./db.server";
import {
  ARTICLE_ENTITY_TYPE,
  HERO_ENTITY_TYPE,
  LOADOUT_ENTITY_TYPE,
  PERK_ENTITY_TYPE,
  SCHEMATIC_ENTITY_TYPE,
  TRAP_ENTITY_TYPE,
  WEAPON_ENTITY_TYPE,
} from "./content-types";
import type {
  ValidatedArticleItem,
  ValidatedHeroItem,
  ValidatedImportItem,
  ValidatedLoadoutItem,
  ValidatedPerkItem,
  ValidatedSchematicItem,
  ValidatedTrapItem,
  ValidatedWeaponItem,
} from "./import-schemas";

export interface CreateHeroDraftInput {
  heroClass: string;
  title: string;
  category?: string | null | undefined;
  rarity?: string | null | undefined;
  popularity?: number | undefined;
  sortOrder?: number | undefined;
  portraitAssetId?: string | null | undefined;
  bannerAssetId?: string | null | undefined;
  locale?: string | undefined;
  body?: string | undefined;
  slug?: string | null | undefined;
  seoTitle?: string | null | undefined;
  seoDescription?: string | null | undefined;
}

export interface CreateDraftResult {
  contentId: string;
  /**
   * The slug actually reserved, which may differ from the requested one:
   * `upsertContentTranslation` resolves collisions by suffixing. Callers that
   * report results back to a human (the JSON importer) MUST return this rather
   * than the requested slug, or they will report a URL that does not exist.
   */
  slug: string;
}

export async function createHeroDraft(
  db: D1Database,
  actor: AuditActor,
  input: CreateHeroDraftInput,
): Promise<CreateDraftResult> {
  const { createContent, upsertContentTranslation } = await import("./db.server");
  const { createHeroRecord } = await import("./heroes-loadouts.server");

  const content = await createContent(
    db,
    { entityType: HERO_ENTITY_TYPE, defaultLocale: input.locale ?? "en", createdBy: actor.id },
    actor,
  );
  try {
    await createHeroRecord(
      db,
      content,
      {
        heroClass: input.heroClass,
        category: input.category ?? null,
        rarity: input.rarity ?? null,
        popularity: input.popularity ?? 0,
        sortOrder: input.sortOrder ?? 0,
        portraitAssetId: input.portraitAssetId ?? null,
        bannerAssetId: input.bannerAssetId ?? null,
      },
      actor,
    );
    const result = await upsertContentTranslation(
      db,
      content,
      {
        contentId: content.id,
        locale: input.locale ?? "en",
        title: input.title,
        body: input.body ?? "",
        slug: input.slug ?? input.title,
        ...(input.seoTitle !== undefined && input.seoTitle !== null
          ? { seoTitle: input.seoTitle }
          : {}),
        ...(input.seoDescription !== undefined && input.seoDescription !== null
          ? { seoDescription: input.seoDescription }
          : {}),
      },
      actor,
    );
    return { contentId: content.id, slug: result.slug };
  } catch (e) {
    await rollbackCreatedDrafts(db, [{ entityType: HERO_ENTITY_TYPE, contentId: content.id }]);
    throw e;
  }
}

export async function createSchematicDraft(
  db: D1Database,
  actor: AuditActor,
  input: {
    title: string;
    weaponContentId?: string | null | undefined;
    trapContentId?: string | null | undefined;
    popularity?: number | undefined;
    sortOrder?: number | undefined;
    iconAssetId?: string | null | undefined;
    locale?: string | undefined;
    body?: string | undefined;
    slug?: string | null | undefined;
    seoTitle?: string | null | undefined;
    seoDescription?: string | null | undefined;
  },
): Promise<CreateDraftResult> {
  const { createContent, upsertContentTranslation } = await import("./db.server");
  const { createSchematicRecord } = await import("./schematics-inventory.server");

  const content = await createContent(
    db,
    { entityType: SCHEMATIC_ENTITY_TYPE, defaultLocale: input.locale ?? "en", createdBy: actor.id },
    actor,
  );
  try {
    await createSchematicRecord(
      db,
      content,
      {
        weaponContentId: input.weaponContentId ?? null,
        trapContentId: input.trapContentId ?? null,
        popularity: input.popularity ?? 0,
        sortOrder: input.sortOrder ?? 0,
        iconAssetId: input.iconAssetId ?? null,
      },
      actor,
    );
    const result = await upsertContentTranslation(
      db,
      content,
      {
        contentId: content.id,
        locale: input.locale ?? "en",
        title: input.title,
        body: input.body ?? "",
        slug: input.slug ?? input.title,
        ...(input.seoTitle !== undefined && input.seoTitle !== null
          ? { seoTitle: input.seoTitle }
          : {}),
        ...(input.seoDescription !== undefined && input.seoDescription !== null
          ? { seoDescription: input.seoDescription }
          : {}),
      },
      actor,
    );
    return { contentId: content.id, slug: result.slug };
  } catch (e) {
    await rollbackCreatedDrafts(db, [{ entityType: SCHEMATIC_ENTITY_TYPE, contentId: content.id }]);
    throw e;
  }
}

/**
 * Loadout draft, INCLUDING its roster relationships.
 *
 * The roster is part of what makes a loadout usable, so it is written inside the
 * same create step (and therefore inside the same compensating rollback) rather
 * than as a second phase the importer has to remember. `setLoadoutHeroes` and
 * `setLoadoutSchematics` — the same functions the Roster section of the editor
 * calls — apply the commander-required, max-6, max-12 and no-duplicates rules.
 */
export async function createLoadoutDraft(
  db: D1Database,
  actor: AuditActor,
  input: CreateLoadoutDraftInput,
): Promise<CreateDraftResult> {
  const { createContent, upsertContentTranslation } = await import("./db.server");
  const { createLoadoutRecord, setLoadoutHeroes, setLoadoutSchematics } =
    await import("./heroes-loadouts.server");

  const content = await createContent(
    db,
    { entityType: LOADOUT_ENTITY_TYPE, defaultLocale: input.locale ?? "en", createdBy: actor.id },
    actor,
  );
  try {
    await createLoadoutRecord(
      db,
      content,
      {
        loadoutType: input.loadoutType ?? "custom",
        popularity: input.popularity ?? 0,
        sortOrder: input.sortOrder ?? 0,
        coverAssetId: input.coverAssetId ?? null,
        ...(input.teamPerkContentId !== undefined
          ? { teamPerkContentId: input.teamPerkContentId }
          : {}),
      },
      actor,
    );
    const result = await upsertContentTranslation(
      db,
      content,
      translationInput(content.id, input),
      actor,
    );
    // Roster LAST, so a roster rule violation is reported against a loadout
    // whose record and translation already exist and will be rolled back.
    if (input.heroSlots !== undefined && input.heroSlots.length > 0) {
      await setLoadoutHeroes(db, content.id, input.heroSlots, actor);
    }
    if (input.schematicContentIds !== undefined && input.schematicContentIds.length > 0) {
      await setLoadoutSchematics(db, content.id, input.schematicContentIds, actor);
    }
    return { contentId: content.id, slug: result.slug };
  } catch (e) {
    await rollbackCreatedDrafts(db, [{ entityType: LOADOUT_ENTITY_TYPE, contentId: content.id }]);
    throw e;
  }
}

export interface CreateLoadoutDraftInput {
  title: string;
  loadoutType?: string | undefined;
  popularity?: number | undefined;
  sortOrder?: number | undefined;
  coverAssetId?: string | null | undefined;
  teamPerkContentId?: string | null | undefined;
  /** Sparse slot list, exactly as `setLoadoutHeroes` expects. */
  heroSlots?: ReadonlyArray<string | null> | undefined;
  schematicContentIds?: readonly string[] | undefined;
  locale?: string | undefined;
  body?: string | undefined;
  slug?: string | null | undefined;
  seoTitle?: string | null | undefined;
  seoDescription?: string | null | undefined;
}

/**
 * Shared translation payload.
 *
 * Every kind builds its cms_content_translations row the same way, including
 * the conditional SEO keys — `exactOptionalPropertyTypes` means an explicit
 * `undefined` is not the same as an absent key, and passing one through would
 * clear a stored value.
 */
function translationInput(
  contentId: string,
  input: {
    title: string;
    locale?: string | undefined;
    body?: string | undefined;
    slug?: string | null | undefined;
    seoTitle?: string | null | undefined;
    seoDescription?: string | null | undefined;
  },
) {
  return {
    contentId,
    locale: input.locale ?? "en",
    title: input.title,
    body: input.body ?? "",
    slug: input.slug ?? input.title,
    ...(input.seoTitle !== undefined && input.seoTitle !== null
      ? { seoTitle: input.seoTitle }
      : {}),
    ...(input.seoDescription !== undefined && input.seoDescription !== null
      ? { seoDescription: input.seoDescription }
      : {}),
  };
}

/**
 * Generic draft creation for the inventory kinds.
 *
 * One function rather than four: the sequence is identical (content →
 * entity record → translation) and only the entity_type and the record writer
 * differ. The real `ContentRow` is handed to the record writer — every
 * `create*Record` asserts on `base.entity_type`, so fabricating a partial row
 * would either fail the assert or force an unsafe cast. Behaviour that goes
 * beyond that sequence (perks' extra perk_translations row) is supplied by the
 * caller's writer, inside the same try block, so it rolls back too.
 */
async function createInventoryDraft(
  db: D1Database,
  actor: AuditActor,
  entityType: string,
  writeRecord: (base: ContentRow) => Promise<void>,
  input: {
    title: string;
    locale?: string | undefined;
    body?: string | undefined;
    slug?: string | null | undefined;
    seoTitle?: string | null | undefined;
    seoDescription?: string | null | undefined;
  },
): Promise<CreateDraftResult> {
  const { createContent, upsertContentTranslation } = await import("./db.server");
  const content = await createContent(
    db,
    { entityType, defaultLocale: input.locale ?? "en", createdBy: actor.id },
    actor,
  );
  try {
    await writeRecord(content);
    const result = await upsertContentTranslation(
      db,
      content,
      translationInput(content.id, input),
      actor,
    );
    return { contentId: content.id, slug: result.slug };
  } catch (e) {
    await rollbackCreatedDrafts(db, [{ entityType, contentId: content.id }]);
    throw e;
  }
}

/** Fields every non-hero draft shares. */
interface DraftCommonFields {
  title: string;
  locale?: string | undefined;
  body?: string | undefined;
  slug?: string | null | undefined;
  seoTitle?: string | null | undefined;
  seoDescription?: string | null | undefined;
  popularity?: number | undefined;
  sortOrder?: number | undefined;
  rarity?: string | null | undefined;
  iconAssetId?: string | null | undefined;
}

export async function createWeaponDraft(
  db: D1Database,
  actor: AuditActor,
  input: DraftCommonFields & { weaponSubtype?: string | undefined },
): Promise<CreateDraftResult> {
  const { createWeaponRecord } = await import("./schematics-inventory.server");
  return createInventoryDraft(
    db,
    actor,
    WEAPON_ENTITY_TYPE,
    async (base) => {
      await createWeaponRecord(
        db,
        base,
        {
          weaponSubtype: input.weaponSubtype ?? "other",
          rarity: input.rarity ?? null,
          popularity: input.popularity ?? 0,
          sortOrder: input.sortOrder ?? 0,
          iconAssetId: input.iconAssetId ?? null,
        },
        actor,
      );
    },
    input,
  );
}

export async function createTrapDraft(
  db: D1Database,
  actor: AuditActor,
  input: DraftCommonFields & {
    trapSubtype?: string | undefined;
    trapPlacement?: string | null | undefined;
  },
): Promise<CreateDraftResult> {
  const { createTrapRecord } = await import("./schematics-inventory.server");
  return createInventoryDraft(
    db,
    actor,
    TRAP_ENTITY_TYPE,
    async (base) => {
      await createTrapRecord(
        db,
        base,
        {
          trapSubtype: input.trapSubtype ?? "other",
          trapPlacement: input.trapPlacement ?? null,
          rarity: input.rarity ?? null,
          popularity: input.popularity ?? 0,
          sortOrder: input.sortOrder ?? 0,
          iconAssetId: input.iconAssetId ?? null,
        },
        actor,
      );
    },
    input,
  );
}

/**
 * Perk draft.
 *
 * Unlike the other inventory kinds, a perk writes TWO tables: the generic
 * translation plus `perk_translations` (name/description live there, not in
 * cms_content_translations). `upsertPerkTranslation` is called from inside the
 * writer callback, so a failure there is rolled back with everything else.
 */
export async function createPerkDraft(
  db: D1Database,
  actor: AuditActor,
  input: {
    title: string;
    perkKey: string;
    perkType?: string | undefined;
    perkName?: string | null | undefined;
    perkDescription?: string | null | undefined;
    popularity?: number | undefined;
    sortOrder?: number | undefined;
    iconAssetId?: string | null | undefined;
    locale?: string | undefined;
    body?: string | undefined;
    slug?: string | null | undefined;
    seoTitle?: string | null | undefined;
    seoDescription?: string | null | undefined;
  },
): Promise<CreateDraftResult> {
  const { createPerkRecord, upsertPerkTranslation } = await import("./schematics-inventory.server");
  const locale = input.locale ?? "en";
  return createInventoryDraft(
    db,
    actor,
    PERK_ENTITY_TYPE,
    async (base) => {
      await createPerkRecord(
        db,
        base,
        {
          perkKey: input.perkKey,
          perkType: input.perkType ?? "other",
          popularity: input.popularity ?? 0,
          sortOrder: input.sortOrder ?? 0,
          iconAssetId: input.iconAssetId ?? null,
        },
        actor,
      );
      await upsertPerkTranslation(
        db,
        base.id,
        {
          locale,
          name: input.perkName ?? input.title,
          description: input.perkDescription ?? "",
        },
        actor,
      );
    },
    { ...input, locale },
  );
}

/**
 * Article draft, WITH its structured body.
 *
 * The body is stored exactly as the editor stores it: `upsertArticleBody`
 * re-validates the document through `validateArticleDocument`, writes
 * `body_json`, and derives the excerpt server-side. The article is therefore a
 * complete object on arrival, not a shell that needs a second save — and
 * because the whole call sits inside the try block, a bad block or an unusable
 * media id rolls the article back with everything else.
 */
export async function createArticleDraft(
  db: D1Database,
  actor: AuditActor,
  input: {
    title: string;
    body: unknown;
    locale?: string | undefined;
    slug?: string | null | undefined;
    seoTitle?: string | null | undefined;
    seoDescription?: string | null | undefined;
    coverAssetId?: string | null | undefined;
    categoryId?: string | null | undefined;
  },
): Promise<CreateDraftResult> {
  const { createContent, upsertContentTranslation } = await import("./db.server");
  const { upsertArticleBody } = await import("./articles.server");
  const locale = input.locale ?? "en";
  const content = await createContent(
    db,
    { entityType: ARTICLE_ENTITY_TYPE, defaultLocale: locale, createdBy: actor.id },
    actor,
  );
  try {
    // Articles carry no plain-text body on the translation row: the editor
    // creates them with body: "" and stores the real content in article_bodies.
    const result = await upsertContentTranslation(
      db,
      content,
      { ...translationInput(content.id, { ...input, body: "" }), locale },
      actor,
    );
    await upsertArticleBody(
      db,
      content.id,
      {
        locale,
        body: input.body,
        categoryId: input.categoryId ?? null,
        coverAssetId: input.coverAssetId ?? null,
      },
      actor,
    );
    return { contentId: content.id, slug: result.slug };
  } catch (e) {
    await rollbackCreatedDrafts(db, [{ entityType: ARTICLE_ENTITY_TYPE, contentId: content.id }]);
    throw e;
  }
}

/** Maps a validated import item onto the matching create service. */
export async function createDraftFromImportItem(
  db: D1Database,
  actor: AuditActor,
  entry: ValidatedImportItem,
): Promise<CreateDraftResult> {
  switch (entry.kind) {
    case HERO_ENTITY_TYPE: {
      const hero = entry.item as ValidatedHeroItem;
      return createHeroDraft(db, actor, hero);
    }
    case LOADOUT_ENTITY_TYPE: {
      const loadout = entry.item as ValidatedLoadoutItem;
      return createLoadoutDraft(db, actor, {
        title: loadout.title,
        loadoutType: loadout.loadoutType,
        popularity: loadout.popularity,
        sortOrder: loadout.sortOrder,
        coverAssetId: loadout.coverAssetId,
        teamPerkContentId: loadout.teamPerkContentId,
        heroSlots: loadout.heroSlots,
        schematicContentIds: loadout.schematicContentIds,
        locale: loadout.locale,
        body: loadout.body,
        slug: loadout.slug,
        seoTitle: loadout.seoTitle,
        seoDescription: loadout.seoDescription,
      });
    }
    case WEAPON_ENTITY_TYPE: {
      const weapon = entry.item as ValidatedWeaponItem;
      return createWeaponDraft(db, actor, weapon);
    }
    case TRAP_ENTITY_TYPE: {
      const trap = entry.item as ValidatedTrapItem;
      return createTrapDraft(db, actor, trap);
    }
    case PERK_ENTITY_TYPE: {
      const perk = entry.item as ValidatedPerkItem;
      return createPerkDraft(db, actor, perk);
    }
    case SCHEMATIC_ENTITY_TYPE: {
      const schematic = entry.item as ValidatedSchematicItem;
      return createSchematicDraft(db, actor, schematic);
    }
    case ARTICLE_ENTITY_TYPE: {
      const article = entry.item as ValidatedArticleItem;
      return createArticleDraft(db, actor, article);
    }
    default: {
      // Unreachable: ImportEntityKind is a closed union of the seven kinds
      // above. Present so a future kind added to the union fails to compile
      // here rather than silently falling through.
      const exhaustive: never = entry;
      throw new Error(`Unsupported import kind: ${JSON.stringify(exhaustive)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Rollback
// ---------------------------------------------------------------------------

export interface CreatedDraftRef {
  entityType: string;
  contentId: string;
}

export interface RollbackReport {
  attempted: number;
  removed: number;
  /** contentIds whose rows could not be removed, plus why. */
  failures: Array<{ contentId: string; reason: string }>;
}

/**
 * Remove every row a failed create wrote for the given contents.
 *
 * RELATIONSHIP MAP (verified against worker/migrations, not assumed)
 * -----------------------------------------------------------------
 * Every table this module's create path writes hangs off `cms_contents`:
 *
 *   cms_contents
 *     ├─ cms_content_translations   ON DELETE CASCADE  (0006:129)
 *     ├─ cms_slugs                   ON DELETE CASCADE  (0006:161)
 *     ├─ cms_preview_tokens          ON DELETE CASCADE  (0006:205)
 *     ├─ hero_records                ON DELETE CASCADE  (0007:3)
 *     │    └─ hero_abilities         ON DELETE CASCADE  (0007:21)
 *     │         └─ hero_ability_translations  CASCADE  (0007:32)
 *     ├─ loadout_records             ON DELETE CASCADE  (0007:42)
 *     ├─ weapon_records              ON DELETE CASCADE  (0008:19)
 *     ├─ trap_records                ON DELETE CASCADE  (0008:33)
 *     ├─ perk_records                ON DELETE CASCADE  (0008:47)
 *     │    └─ perk_translations      ON DELETE CASCADE  (0008:63)
 *     └─ schematic_records           ON DELETE CASCADE  (0008:73)
 *          └─ schematic_perks        ON DELETE CASCADE  (0008:92)
 *
 * Deleting the `cms_contents` root therefore reaches every descendant, and no
 * orphan is possible. The explicit child deletes below are NOT redundant in
 * intent: they make the cleanup correct-by-construction and reviewable, and
 * they are what a reader can verify against the migration map above. They are
 * also ordered so that RESTRICT-bearing edges (0008:74 `weapon_content_id`,
 * 0008:75 `trap_content_id`, 0013:19 `loadout_schematics.schematic_content_id`,
 * 0012:48 `team_perk_content_id`) can never block the root delete: child rows go
 * first, in reverse creation order.
 *
 * cms_audit_events is intentionally NOT deleted. The audit table is append-only
 * and has no FK to content (0006:179); a rolled-back import leaving its trail is
 * correct, and the caller records the rollback itself as an audit event.
 *
 * NEVER throws: a rollback that fails must surface the failure as data so the
 * caller can report it, rather than masking the original error.
 */
export async function rollbackCreatedDrafts(
  db: D1Database,
  created: readonly CreatedDraftRef[],
  actor?: AuditActor,
): Promise<RollbackReport> {
  const report: RollbackReport = { attempted: created.length, removed: 0, failures: [] };
  // Reverse creation order: a later draft may reference an earlier one.
  const ordered = [...created].reverse();
  for (const ref of ordered) {
    try {
      await deleteDraftRows(db, ref);
      report.removed += 1;
    } catch (e) {
      report.failures.push({
        contentId: ref.contentId,
        reason: e instanceof Error ? e.message : "unknown rollback failure",
      });
    }
  }
  if (actor !== undefined && created.length > 0) {
    try {
      const { recordAuditEvent } = await import("./db.server");
      const { buildAuditEvent } = await import("./audit");
      await recordAuditEvent(
        db,
        buildAuditEvent({
          actor,
          action: "content.import.rollback",
          entityType: "import",
          entityId: `rollback_${created.length}`,
          metadata: {
            attempted: report.attempted,
            removed: report.removed,
            failed: report.failures.length,
          },
        }),
      );
    } catch {
      // Telemetry must never turn a successful rollback into a failure.
    }
  }
  return report;
}

async function deleteDraftRows(db: D1Database, ref: CreatedDraftRef): Promise<void> {
  // Explicit child deletes, deepest first. Relationship tables come first
  // because they reference the entity rows. Every table this module's create
  // path can populate is listed explicitly; anything not listed is reached by
  // the root ON DELETE CASCADE documented above.
  await db
    .prepare(
      "DELETE FROM hero_ability_translations WHERE ability_id IN (SELECT id FROM hero_abilities WHERE hero_content_id = ?)",
    )
    .bind(ref.contentId)
    .run();
  await db
    .prepare("DELETE FROM hero_abilities WHERE hero_content_id = ?")
    .bind(ref.contentId)
    .run();
  await db
    .prepare("DELETE FROM schematic_perks WHERE schematic_content_id = ?")
    .bind(ref.contentId)
    .run();
  await db
    .prepare("DELETE FROM perk_translations WHERE perk_content_id = ?")
    .bind(ref.contentId)
    .run();
  // Loadout roster rows (loadout_heroes / loadout_schematics). These CASCADE
  // from loadout_records, but deleting them explicitly keeps the path correct
  // even for a loadout whose record row is already gone.
  await db
    .prepare("DELETE FROM loadout_heroes WHERE loadout_content_id = ?")
    .bind(ref.contentId)
    .run();
  await db
    .prepare("DELETE FROM loadout_schematics WHERE loadout_content_id = ?")
    .bind(ref.contentId)
    .run();
  // Article side tables. article_entity_refs and article_related point at OTHER
  // content ids as well, so both directions are cleared — otherwise a rolled
  // back article would leave dangling references in unrelated records.
  await db
    .prepare("DELETE FROM article_media WHERE article_content_id = ?")
    .bind(ref.contentId)
    .run();
  await db
    .prepare("DELETE FROM article_tag_links WHERE article_content_id = ?")
    .bind(ref.contentId)
    .run();
  await db
    .prepare("DELETE FROM article_entity_refs WHERE article_content_id = ?")
    .bind(ref.contentId)
    .run();
  await db
    .prepare("DELETE FROM article_entity_refs WHERE target_content_id = ?")
    .bind(ref.contentId)
    .run();
  await db
    .prepare("DELETE FROM article_related WHERE article_content_id = ?")
    .bind(ref.contentId)
    .run();
  await db
    .prepare("DELETE FROM article_related WHERE related_content_id = ?")
    .bind(ref.contentId)
    .run();
  await db
    .prepare("DELETE FROM article_bodies WHERE article_content_id = ?")
    .bind(ref.contentId)
    .run();

  // Per-entity record rows.
  if (ref.entityType === HERO_ENTITY_TYPE) {
    await db.prepare("DELETE FROM hero_records WHERE content_id = ?").bind(ref.contentId).run();
  }
  if (ref.entityType === SCHEMATIC_ENTITY_TYPE) {
    await db
      .prepare("DELETE FROM schematic_records WHERE content_id = ?")
      .bind(ref.contentId)
      .run();
  }
  if (ref.entityType === LOADOUT_ENTITY_TYPE) {
    await db.prepare("DELETE FROM loadout_records WHERE content_id = ?").bind(ref.contentId).run();
  }
  if (ref.entityType === WEAPON_ENTITY_TYPE) {
    await db.prepare("DELETE FROM weapon_records WHERE content_id = ?").bind(ref.contentId).run();
  }
  if (ref.entityType === TRAP_ENTITY_TYPE) {
    await db.prepare("DELETE FROM trap_records WHERE content_id = ?").bind(ref.contentId).run();
  }
  if (ref.entityType === PERK_ENTITY_TYPE) {
    await db.prepare("DELETE FROM perk_records WHERE content_id = ?").bind(ref.contentId).run();
  }

  // Translation-side rows, then the root. cms_slugs must go before the content
  // row so a replayed slug reservation cannot outlive its content.
  await db
    .prepare("DELETE FROM cms_content_translations WHERE content_id = ?")
    .bind(ref.contentId)
    .run();
  await db.prepare("DELETE FROM cms_preview_tokens WHERE content_id = ?").bind(ref.contentId).run();
  await db.prepare("DELETE FROM cms_slugs WHERE content_id = ?").bind(ref.contentId).run();
  await db.prepare("DELETE FROM cms_contents WHERE id = ?").bind(ref.contentId).run();
}
