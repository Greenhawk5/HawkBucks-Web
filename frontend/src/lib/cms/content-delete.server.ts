/**
 * Permanent deletion of disposable CMS drafts (SERVER-ONLY).
 *
 * POLICY, and why each rule exists
 * -------------------------------
 * Deletion is the one operation in this CMS that can destroy data a later
 * re-sync cannot rebuild, so it is deliberately narrow:
 *
 *   * ONLY `draft` and `archived` content may be deleted. A published record is
 *     live on the public site with a real URL; the supported workflow for
 *     retiring one is to unpublish and archive first, never to delete.
 *
 *   * ANY inbound reference from another content record blocks the delete —
 *     including the ones that would technically "succeed", because those
 *     cascade silently into unrelated content:
 *       - RESTRICT edges: the DELETE itself would fail with a raw FK error,
 *         which is not a usable message for an editor;
 *       - CASCADE edges on the REFERENCING side: the delete would quietly strip
 *         a loadout's roster row, an article's link, or a hero's curated
 *         "related" entry. Silently losing someone else's editorial decision
 *         is exactly the failure mode this check exists to prevent.
 *
 *   * `data_source = 'stw-sync'` records are reference data. Deleting one
 *     destroys synced rows that the reference snapshot would simply re-create
 *     on the next run, producing a confusing delete/undelete cycle. Blocked.
 *
 *   * Shared definitions are NEVER touched: `hero_perk_defs`,
 *     `hero_perk_def_translations`, `ability_defs`, `ability_def_translations`
 *     and `resources` are game-wide namespaces referenced by many heroes.
 *
 *   * Media assets and R2 objects are NEVER touched. Every `*_asset_id` column
 *     is `ON DELETE SET NULL`, so destroying a content record drops its
 *     references while leaving shared media and its bytes intact.
 *
 *   * `cms_audit_events` is append-only with no FK to content and is
 *     deliberately preserved, so a delete leaves its own audit trail.
 */

import "@tanstack/react-start/server-only";

import { buildAuditEvent, type AuditAction } from "./audit";
import type { D1Database } from "./db.server";
import { isContentStatus, type ContentStatus } from "./publish";

/**
 * Inbound references that BLOCK deletion.
 *
 * `restrict: true` means the database itself would reject the DELETE.
 * `restrict: false` means the delete would succeed but cascade into a record
 * the editor did not select — which we still refuse.
 */
export interface InboundReferenceSpec {
  /** Human-readable label shown in the blocking message. */
  label: string;
  /** The table that HOLDS the reference. */
  sql: string;
  /** Whether SQLite itself would reject the delete. */
  restrict: boolean;
}

/**
 * Built from `worker/migrations/*.sql`, not assumed. `blockers` are verified in
 * `test/cms-bulk-delete.test.mjs` against a real migrated schema.
 */
const INBOUND_REFERENCES: readonly InboundReferenceSpec[] = [
  {
    label: "schematic weapon slot",
    sql: "SELECT content_id AS entity FROM schematic_records WHERE weapon_content_id = ?",
    restrict: true,
  },
  {
    label: "schematic trap slot",
    sql: "SELECT content_id AS entity FROM schematic_records WHERE trap_content_id = ?",
    restrict: true,
  },
  {
    label: "loadout team perk",
    sql: "SELECT content_id AS entity FROM loadout_records WHERE team_perk_content_id = ?",
    restrict: true,
  },
  {
    label: "loadout schematic slot",
    sql: "SELECT loadout_content_id AS entity FROM loadout_schematics WHERE schematic_content_id = ?",
    restrict: true,
  },
  {
    label: "loadout hero roster",
    sql: "SELECT loadout_content_id AS entity FROM loadout_heroes WHERE hero_content_id = ?",
    restrict: false,
  },
  {
    label: "article entity reference",
    sql: "SELECT article_content_id AS entity FROM article_entity_refs WHERE target_content_id = ?",
    restrict: false,
  },
  {
    label: "related article",
    sql: "SELECT article_content_id AS entity FROM article_related WHERE related_content_id = ?",
    restrict: false,
  },
  {
    label: "curated related hero",
    sql: "SELECT hero_content_id AS entity FROM hero_related_heroes WHERE related_content_id = ?",
    restrict: false,
  },
];

export interface InboundReference {
  label: string;
  /** The content id of the record holding the reference. */
  entityId: string;
  /** True when the database would reject the DELETE outright. */
  restrict: boolean;
}

export interface DeleteBlocker {
  reason: "published" | "referenced" | "reference-data" | "not-found";
  message: string;
  references?: InboundReference[];
}

export interface DeleteAssessment {
  contentId: string;
  entityType: string | null;
  status: ContentStatus | null;
  /** True only when a permanent delete would succeed. */
  eligible: boolean;
  blockers: DeleteBlocker[];
}

/** Find every record that references this content id. */
export async function findInboundReferences(
  db: D1Database,
  contentId: string,
): Promise<InboundReference[]> {
  const found: InboundReference[] = [];
  for (const spec of INBOUND_REFERENCES) {
    const { results } = await db
      .prepare(`${spec.sql} LIMIT 20`)
      .bind(contentId)
      .all<{ entity: string }>();
    for (const row of results) {
      if (typeof row.entity === "string") {
        found.push({ label: spec.label, entityId: row.entity, restrict: spec.restrict });
      }
    }
  }
  return found;
}

/**
 * Decide whether a record may be permanently deleted, and explain why not.
 *
 * Read-only and side-effect free, so the UI can call it to decide whether to
 * offer a Delete action at all — the destructive control is simply absent for
 * records that could never be deleted.
 */
export async function assessContentDeletability(
  db: D1Database,
  contentId: string,
): Promise<DeleteAssessment> {
  const row = await db
    .prepare("SELECT entity_type, status FROM cms_contents WHERE id = ?")
    .bind(contentId)
    .first<{ entity_type: string; status: string }>();

  if (row === null || !isContentStatus(row.status)) {
    return {
      contentId,
      entityType: row?.entity_type ?? null,
      status: null,
      eligible: false,
      blockers: [{ reason: "not-found", message: "This record no longer exists." }],
    };
  }

  const blockers: DeleteBlocker[] = [];

  if (row.status === "published") {
    blockers.push({
      reason: "published",
      message:
        "This record is published and has a live public URL. Unpublish it to draft, or archive it, before deleting.",
    });
  }

  // Reference-synced rows are game data, not editorial scratch space.
  if (row.entity_type === "hero") {
    const source = await db
      .prepare("SELECT data_source FROM hero_records WHERE content_id = ?")
      .bind(contentId)
      .first<{ data_source: string | null }>();
    if ((source?.data_source ?? null) === "stw-sync") {
      blockers.push({
        reason: "reference-data",
        message:
          "This hero is reference-synced data (data_source = 'stw-sync'). Deleting it would be undone by the next reference sync.",
      });
    }
  }

  const references = await findInboundReferences(db, contentId);
  if (references.length > 0) {
    const labels = [...new Set(references.map((r) => r.label))];
    blockers.push({
      reason: "referenced",
      message: `Still referenced by ${references.length} record(s): ${labels.join(", ")}. Remove those references first.`,
      references,
    });
  }

  return {
    contentId,
    entityType: row.entity_type,
    status: row.status,
    eligible: blockers.length === 0,
    blockers,
  };
}

export interface DeleteDraftResult {
  contentId: string;
  deleted: boolean;
  entityType: string | null;
  blockers?: DeleteBlocker[];
}

/**
 * Permanently delete one draft.
 *
 * Re-checks eligibility immediately before writing, so a record that gained a
 * reference between the UI's check and this call is refused rather than
 * silently cascading.
 *
 * `actor` is recorded: a permanent delete is precisely the event an audit trail
 * must survive.
 */
export async function deleteCmsDraft(
  db: D1Database,
  input: { contentId: string; entityType?: string | null },
  actor: { id: string; username: string },
): Promise<DeleteDraftResult> {
  const assessment = await assessContentDeletability(db, input.contentId);
  if (!assessment.eligible) {
    return {
      contentId: input.contentId,
      deleted: false,
      entityType: assessment.entityType,
      blockers: assessment.blockers,
    };
  }

  await deleteDraftCascade(db, input.contentId, assessment.entityType);

  const { recordAuditEvent } = await import("./db.server");
  const action: AuditAction = "content.delete";
  await recordAuditEvent(
    db,
    buildAuditEvent({
      actor,
      action,
      entityType: assessment.entityType ?? "unknown",
      entityId: input.contentId,
      metadata: { op: "content.delete.permanent", previousStatus: assessment.status },
    }),
  );

  return { contentId: input.contentId, deleted: true, entityType: assessment.entityType };
}

/**
 * Remove the record and everything that hangs off it.
 *
 * Ordering rule: tables that REFERENCE the record (RESTRICT or CASCADE) are
 * cleared before the root row, so no FK can block the delete. Tables that are
 * SHARED game definitions and tables holding MEDIA are never touched.
 */
async function deleteDraftCascade(
  db: D1Database,
  contentId: string,
  entityType: string | null,
): Promise<void> {
  const run = (sql: string) => db.prepare(sql).bind(contentId).run();

  // --- Inbound relationship rows owned by OTHER records -------------------
  await run("DELETE FROM loadout_heroes WHERE hero_content_id = ?");
  await run("DELETE FROM loadout_schematics WHERE schematic_content_id = ?");
  await run("DELETE FROM article_entity_refs WHERE target_content_id = ?");
  await run("DELETE FROM article_related WHERE related_content_id = ?");
  await run("DELETE FROM hero_related_heroes WHERE related_content_id = ?");

  // --- Relationship rows this record owns (deepest first) -----------------
  await run(
    "DELETE FROM hero_ability_translations WHERE ability_id IN (SELECT id FROM hero_abilities WHERE hero_content_id = ?)",
  );
  await run("DELETE FROM hero_abilities WHERE hero_content_id = ?");
  await run("DELETE FROM schematic_perks WHERE schematic_content_id = ?");
  await run("DELETE FROM schematic_perks WHERE perk_content_id = ?");
  await run("DELETE FROM perk_translations WHERE perk_content_id = ?");
  await run("DELETE FROM loadout_heroes WHERE loadout_content_id = ?");
  await run("DELETE FROM loadout_schematics WHERE loadout_content_id = ?");
  await run("DELETE FROM article_media WHERE article_content_id = ?");
  await run("DELETE FROM article_tag_links WHERE article_content_id = ?");
  await run("DELETE FROM article_entity_refs WHERE article_content_id = ?");
  await run("DELETE FROM article_related WHERE article_content_id = ?");
  await run("DELETE FROM article_bodies WHERE article_content_id = ?");

  // --- Per-entity record row ---------------------------------------------
  switch (entityType) {
    case "hero":
      await run("DELETE FROM hero_records WHERE content_id = ?");
      break;
    case "loadout":
      await run("DELETE FROM loadout_records WHERE content_id = ?");
      break;
    case "weapon":
      await run("DELETE FROM weapon_records WHERE content_id = ?");
      break;
    case "trap":
      await run("DELETE FROM trap_records WHERE content_id = ?");
      break;
    case "perk":
      await run("DELETE FROM perk_records WHERE content_id = ?");
      break;
    case "schematic":
      await run("DELETE FROM schematic_records WHERE content_id = ?");
      break;
    default:
      // An entity type with no record table (or an unexpected value): the root
      // CASCADE still runs, and the RESTRICT-bearing relationship rows above
      // were already cleared, so this cannot deadlock.
      break;
  }

  // --- Translation + slug rows, then the root -----------------------------
  await run("DELETE FROM cms_content_translations WHERE content_id = ?");
  await run("DELETE FROM cms_preview_tokens WHERE content_id = ?");
  await run("DELETE FROM cms_slugs WHERE content_id = ?");
  await run("DELETE FROM cms_contents WHERE id = ?");
}
