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

/**
 * The list-safe view of an assessment: reason codes + user-safe messages, but
 * NEVER the `references` holder ids. The list UI needs to explain WHY, not to
 * name which other records point at this one.
 */
export interface DeleteEligibility {
  eligible: boolean;
  reasons: Array<{ reason: DeleteBlocker["reason"]; message: string }>;
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
 * Read-only and side-effect free. The UI uses the verdict ADVISORILY — to
 * offer Delete where it would succeed and to explain why not elsewhere —
 * while the destructive path (`deleteCmsDraft`, single and bulk) always
 * re-assesses at execution time, so a client verdict can never authorize a
 * delete the server would refuse.
 */
export async function assessContentDeletability(
  db: D1Database,
  contentId: string,
): Promise<DeleteAssessment> {
  const byId = await assessManyContentDeletability(db, [contentId]);
  const found = byId[contentId];
  if (found === undefined) {
    return {
      contentId,
      entityType: null,
      status: null,
      eligible: false,
      blockers: [{ reason: "not-found", message: "This record no longer exists." }],
    };
  }
  return {
    contentId,
    entityType: found.entityType,
    status: found.status,
    eligible: found.eligible,
    blockers: found.blockers,
  };
}

interface BatchAssessment extends DeleteEligibility {
  entityType: string | null;
  status: ContentStatus | null;
  blockers: DeleteBlocker[];
}

/**
 * Batched deletability assessment for a list page.
 *
 * One status query + one hero-provenance query + one query per reference edge
 * for the WHOLE id set, instead of N per-row round trips. The verdicts and
 * messages are identical to the single-record path by construction — both are
 * built from the same rules below, and the parity is tested.
 */
export async function assessManyContentDeletability(
  db: D1Database,
  contentIds: readonly string[],
): Promise<Record<string, BatchAssessment>> {
  const unique = [...new Set(contentIds.filter((id) => typeof id === "string" && id !== ""))];
  const out: Record<string, BatchAssessment> = {};
  if (unique.length === 0) return out;

  const placeholders = unique.map(() => "?").join(",");
  const rows = await db
    .prepare(`SELECT id, entity_type, status FROM cms_contents WHERE id IN (${placeholders})`)
    .bind(...unique)
    .all<{ id: string; entity_type: string; status: string }>();
  const byId = new Map(rows.results.map((row) => [row.id, row]));

  const heroSources = await db
    .prepare(
      `SELECT content_id, data_source FROM hero_records WHERE content_id IN (${placeholders})`,
    )
    .bind(...unique)
    .all<{ content_id: string; data_source: string | null }>();
  const sourceByHero = new Map(heroSources.results.map((row) => [row.content_id, row.data_source]));

  // Inbound references, batched per edge: which targets (of our id set) are
  // referenced, and by which holder rows (kept server-side for the message).
  const referencedBy = new Map<string, InboundReference[]>();
  const batchSpecs: Array<{
    label: string;
    table: string;
    holder: string;
    target: string;
    restrict: boolean;
  }> = [
    {
      label: "schematic weapon slot",
      table: "schematic_records",
      holder: "content_id",
      target: "weapon_content_id",
      restrict: true,
    },
    {
      label: "schematic trap slot",
      table: "schematic_records",
      holder: "content_id",
      target: "trap_content_id",
      restrict: true,
    },
    {
      label: "loadout team perk",
      table: "loadout_records",
      holder: "content_id",
      target: "team_perk_content_id",
      restrict: true,
    },
    {
      label: "loadout schematic slot",
      table: "loadout_schematics",
      holder: "loadout_content_id",
      target: "schematic_content_id",
      restrict: true,
    },
    {
      label: "loadout hero roster",
      table: "loadout_heroes",
      holder: "loadout_content_id",
      target: "hero_content_id",
      restrict: false,
    },
    {
      label: "article entity reference",
      table: "article_entity_refs",
      holder: "article_content_id",
      target: "target_content_id",
      restrict: false,
    },
    {
      label: "related article",
      table: "article_related",
      holder: "article_content_id",
      target: "related_content_id",
      restrict: false,
    },
    {
      label: "curated related hero",
      table: "hero_related_heroes",
      holder: "hero_content_id",
      target: "related_content_id",
      restrict: false,
    },
  ];
  for (const spec of batchSpecs) {
    const hits = await db
      .prepare(
        `SELECT ${spec.target} AS target, ${spec.holder} AS entity FROM ${spec.table} WHERE ${spec.target} IN (${placeholders}) LIMIT 200`,
      )
      .bind(...unique)
      .all<{ target: string; entity: string }>();
    for (const hit of hits.results) {
      if (typeof hit.target !== "string" || typeof hit.entity !== "string") continue;
      const list = referencedBy.get(hit.target) ?? [];
      list.push({ label: spec.label, entityId: hit.entity, restrict: spec.restrict });
      referencedBy.set(hit.target, list);
    }
  }

  for (const contentId of unique) {
    const row = byId.get(contentId);
    if (row === undefined || !isContentStatus(row.status)) {
      out[contentId] = {
        eligible: false,
        entityType: row?.entity_type ?? null,
        status: null,
        blockers: [{ reason: "not-found", message: "This record no longer exists." }],
        reasons: [{ reason: "not-found", message: "This record no longer exists." }],
      };
      continue;
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
    if (row.entity_type === "hero" && (sourceByHero.get(contentId) ?? null) === "stw-sync") {
      blockers.push({
        reason: "reference-data",
        message:
          "This hero is reference-synced data (data_source = 'stw-sync'). Deleting it would be undone by the next reference sync.",
      });
    }
    const references = referencedBy.get(contentId) ?? [];
    if (references.length > 0) {
      const labels = [...new Set(references.map((r) => r.label))];
      blockers.push({
        reason: "referenced",
        message: `Still referenced by ${references.length} record(s): ${labels.join(", ")}. Remove those references first.`,
        references,
      });
    }

    out[contentId] = {
      eligible: blockers.length === 0,
      entityType: row.entity_type,
      status: row.status,
      blockers,
      reasons: blockers.map((b) => ({ reason: b.reason, message: b.message })),
    };
  }
  return out;
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
