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
import type { D1Database } from "./db.server";
import { SCHEMATIC_ENTITY_TYPE, HERO_ENTITY_TYPE } from "./content-types";
import type { ValidatedHeroItem, ValidatedSchematicItem } from "./import-schemas";

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

/** Maps a validated import item onto the matching create service. */
export async function createDraftFromImportItem(
  db: D1Database,
  actor: AuditActor,
  item: { kind: string; item: ValidatedHeroItem | ValidatedSchematicItem },
): Promise<CreateDraftResult> {
  if (item.kind === HERO_ENTITY_TYPE) {
    const hero = item.item as ValidatedHeroItem;
    return createHeroDraft(db, actor, {
      heroClass: hero.heroClass,
      title: hero.title,
      category: hero.category,
      rarity: hero.rarity,
      popularity: hero.popularity,
      sortOrder: hero.sortOrder,
      portraitAssetId: hero.portraitAssetId,
      bannerAssetId: hero.bannerAssetId,
      locale: hero.locale,
      body: hero.body,
      slug: hero.slug,
      seoTitle: hero.seoTitle,
      seoDescription: hero.seoDescription,
    });
  }
  const schematic = item.item as ValidatedSchematicItem;
  return createSchematicDraft(db, actor, {
    title: schematic.title,
    weaponContentId: schematic.weaponContentId,
    trapContentId: schematic.trapContentId,
    popularity: schematic.popularity,
    sortOrder: schematic.sortOrder,
    iconAssetId: schematic.iconAssetId,
    locale: schematic.locale,
    body: schematic.body,
    slug: schematic.slug,
    seoTitle: schematic.seoTitle,
    seoDescription: schematic.seoDescription,
  });
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
  // Explicit child deletes, deepest first. Only tables this module's create
  // path can populate are listed; the rest are reached by the root cascade.
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

  if (ref.entityType === HERO_ENTITY_TYPE) {
    await db.prepare("DELETE FROM hero_records WHERE content_id = ?").bind(ref.contentId).run();
  }
  if (ref.entityType === SCHEMATIC_ENTITY_TYPE) {
    await db
      .prepare("DELETE FROM schematic_records WHERE content_id = ?")
      .bind(ref.contentId)
      .run();
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
