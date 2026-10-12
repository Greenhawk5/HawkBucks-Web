/**
 * Bulk lifecycle transitions (SERVER-ONLY).
 *
 * DESIGN RULE: this module never decides what is legal. Every record goes
 * through the SAME `setContentStatus` single-record path the row action menu
 * uses, so a bulk publish cannot bypass the lifecycle state machine, the
 * audit trail, or the `published_at` bookkeeping that the single-record path
 * already gets right.
 *
 * Why independent per-record writes rather than one transaction:
 * D1 has no interactive transactions (only `db.batch`, which is all-or-nothing
 * and cannot express "skip this one because its transition is illegal"). A
 * partially-applied bulk edit with an accurate per-record report is strictly
 * more useful to an editor than a total rollback that discards the work that WAS
 * valid — and it is what the UI has to render either way. The bound is enforced
 * in `resolveBulkTargets`, so the operation can never become unbounded.
 *
 * Stale/duplicate submissions are safe: a record already at the target status
 * is reported as `skipped`, not re-applied, so double-clicking "Publish" cannot
 * produce duplicate audit noise or re-stamp `published_at`.
 */

import "@tanstack/react-start/server-only";

import { isContentStatus, type ContentStatus } from "./publish";
import { canTransitionStatus } from "./publish";
import type { D1Database } from "./db.server";
import { runAdminStatusCounts } from "./admin-list.server";
import type { AdminStatusCounts } from "./admin-list";
import { MAX_BULK_RECORDS } from "./admin-list";

/**
 * Hard cap on how many records one bulk request may touch.
 *
 * Client-safe single source in `admin-list.ts` (re-exported here so existing
 * import sites keep working): the list UI chunks through it, the server
 * enforces it.
 */
export { MAX_BULK_RECORDS };

/** Cap on how many matching ids a cross-page "select all" may expand to. */
export const MAX_BULK_MATCHING_RECORDS = 1000;

export type BulkOutcome = "changed" | "skipped" | "failed";

export interface BulkRecordResult {
  contentId: string;
  outcome: BulkOutcome;
  /** Machine-readable reason, useful in tests and for editor-facing copy. */
  reason: BulkReason;
  /** Present on `failed` / `skipped`; the status the record is actually in. */
  status?: ContentStatus | null;
}

export type BulkReason =
  | "ok"
  | "already-in-target-status"
  | "illegal-transition"
  | "not-found"
  | "wrong-entity-type"
  | "write-failed";

export interface BulkReport {
  requested: number;
  changed: number;
  skipped: number;
  failed: number;
  results: BulkRecordResult[];
  /** Set when the requested target could not be honoured at all. */
  error?: string;
}

/** Entity types a bulk action may target. Mirrors `content-types.ts`. */
const BULK_ENTITY_TYPES = new Set([
  "hero",
  "loadout",
  "weapon",
  "trap",
  "schematic",
  "perk",
  "article",
]);

export interface BulkOptions {
  db: D1Database;
  /** Record ids chosen by the editor. Validated and de-duplicated server-side. */
  contentIds: readonly string[];
  /** Requested target. NEVER taken from a client-computed eligibility check. */
  to: ContentStatus;
  /** Restrict to these entity types; a mismatched record is reported, not changed. */
  entityTypes?: readonly string[];
  actor: { id: string; username: string };
  /** Reads and writes the single-record transition path. */
  setContentStatus: (
    db: D1Database,
    input: { contentId: string; to: ContentStatus; updatedBy?: string | null },
    actor: { id: string; username: string },
  ) => Promise<unknown>;
}

/**
 * Normalize and bound the incoming id list.
 *
 * De-duplication matters: a double-submitted selection must not produce two
 * audit events for the same record.
 */
export function normalizeBulkIds(input: readonly unknown[]): {
  ids: string[];
  overflow: number;
} {
  const seen = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const id = raw.trim();
    if (id === "" || id.length > 128) continue;
    seen.add(id);
  }
  const all = [...seen];
  return {
    ids: all.slice(0, MAX_BULK_RECORDS),
    overflow: all.length - Math.min(all.length, MAX_BULK_RECORDS),
  };
}

/**
 * Apply one lifecycle transition to a bounded set of records.
 *
 * Returns a per-record report; never throws for a per-record problem, so one
 * bad id cannot abandon the rest of the batch.
 */
export async function applyBulkStatusChange(options: BulkOptions): Promise<BulkReport> {
  const { ids, overflow } = normalizeBulkIds(options.contentIds);
  const report: BulkReport = {
    requested: options.contentIds.length,
    changed: 0,
    skipped: 0,
    failed: 0,
    results: [],
  };
  if (overflow > 0) {
    report.error =
      `Too many records selected: ${report.requested}. ` +
      `Only the first ${MAX_BULK_RECORDS} were processed.`;
  }
  if (ids.length === 0) return report;

  const allowed = options.entityTypes ? new Set(options.entityTypes) : null;

  // Read the real status + entity type in ONE query, so an illegal transition
  // or a cross-entity id is reported as such rather than surfacing as a thrown
  // error part-way through the batch.
  const existing = await readExistingRecords(options.db, ids);

  for (const contentId of ids) {
    const record = existing.get(contentId);

    if (record === undefined) {
      report.failed += 1;
      report.results.push({ contentId, outcome: "failed", reason: "not-found", status: null });
      continue;
    }
    if (allowed !== null && !allowed.has(record.entityType)) {
      report.failed += 1;
      report.results.push({
        contentId,
        outcome: "failed",
        reason: "wrong-entity-type",
        status: record.status,
      });
      continue;
    }
    if (record.status === options.to) {
      report.skipped += 1;
      report.results.push({
        contentId,
        outcome: "skipped",
        reason: "already-in-target-status",
        status: record.status,
      });
      continue;
    }
    if (!canTransitionStatus(record.status, options.to)) {
      report.skipped += 1;
      report.results.push({
        contentId,
        outcome: "skipped",
        reason: "illegal-transition",
        status: record.status,
      });
      continue;
    }

    try {
      await options.setContentStatus(
        options.db,
        { contentId, to: options.to, updatedBy: options.actor.id },
        options.actor,
      );
      report.changed += 1;
      report.results.push({ contentId, outcome: "changed", reason: "ok", status: options.to });
    } catch {
      report.failed += 1;
      report.results.push({
        contentId,
        outcome: "failed",
        reason: "write-failed",
        status: record.status,
      });
    }
  }

  return report;
}

interface ExistingRecord {
  status: ContentStatus;
  entityType: string;
}

/** Current status + entity type for many ids, in one query. */
async function readExistingRecords(
  db: D1Database,
  ids: readonly string[],
): Promise<Map<string, ExistingRecord>> {
  const out = new Map<string, ExistingRecord>();
  if (ids.length === 0) return out;
  const placeholders = ids.map(() => "?").join(", ");
  const { results } = await db
    .prepare(`SELECT id, status, entity_type FROM cms_contents WHERE id IN (${placeholders})`)
    .bind(...ids)
    .all<{ id: string; status: string; entity_type: string }>();
  for (const row of results) {
    if (isContentStatus(row.status))
      out.set(row.id, { status: row.status, entityType: row.entity_type });
  }
  return out;
}

/**
 * Resolve a cross-page "select everything matching" request.
 *
 * The client sends the FILTER, never the id list, and this recomputes the id set
 * with the same SQL the list page uses. That keeps the operation bounded and
 * makes it impossible for a crafted request to select records outside the
 * visible result set.
 */
export async function resolveBulkMatchingIds(
  db: D1Database,
  query: {
    from: string;
    where: string;
    values: readonly unknown[];
    limit?: number;
  },
): Promise<{ ids: string[]; total: number; truncated: boolean }> {
  const where = query.where.trim();
  const suffix = where === "" ? "" : ` WHERE ${where}`;
  const countRow = await db
    .prepare(`SELECT COUNT(*) AS n FROM ${query.from}${suffix}`)
    .bind(...query.values)
    .first<{ n: number }>();
  const total = Number(countRow?.n ?? 0);
  const limit = Math.min(
    Math.max(1, query.limit ?? MAX_BULK_MATCHING_RECORDS),
    MAX_BULK_MATCHING_RECORDS,
  );
  if (total === 0) return { ids: [], total: 0, truncated: false };
  const { results } = await db
    .prepare(`SELECT c.id AS id FROM ${query.from}${suffix} ORDER BY c.id ASC LIMIT ?`)
    .bind(...query.values, limit)
    .all<{ id: string }>();
  return { ids: results.map((row) => row.id), total, truncated: total > results.length };
}

/** Re-read status counts after a mutation so the tabs refresh without a reload. */
export async function recountStatuses(
  db: D1Database,
  base: { from: string; where: string; values: readonly unknown[] },
): Promise<AdminStatusCounts> {
  return runAdminStatusCounts(db, base);
}

/* ================================================================== */
/* Bulk permanent delete                                               */
/*                                                                     */
/* DESIGN RULE (same as status changes): this module never decides what */
/* is deletable. Every record goes through the SAME `deleteCmsDraft`    */
/* single-record path the row action menu uses — which re-assesses      */
/* eligibility at execution time and audits each deletion — so a bulk   */
/* delete cannot bypass the published / reference-data / inbound-       */
/* reference policy, and there is no second, weaker deletion path.      */
/*                                                                     */
/* Independent per-record writes (no cross-record transaction), for the */
/* same D1 reason documented above: one blocked record must be reported */
/* as skipped without abandoning the rest of the batch. Over-limit      */
/* batches are REFUSED, never silently trimmed: the UI chunks larger    */
/* selections through `chunkBulkIds` so every record is accounted for.  */
/* Repeated submissions are safe: an already-deleted id assesses as     */
/* not-found and is reported as skipped.                               */
/* ================================================================== */

export type BulkDeleteOutcome = "deleted" | "skipped" | "failed";

export interface BulkDeleteRecordResult {
  contentId: string;
  outcome: BulkDeleteOutcome;
  entityType?: string | null;
  /** Machine-readable blocker reason for skips (`published`, `referenced`, …). */
  reason?: string;
  /** User-safe explanation for skips and failures. */
  message?: string;
}

export interface BulkDeleteReport {
  requested: number;
  deleted: number;
  skipped: number;
  failed: number;
  results: BulkDeleteRecordResult[];
}

/**
 * Split an id list into bounded slices that each fit one server request.
 *
 * Re-exported from the client-safe `admin-list` module so the UI chunks
 * exactly the way the server cap enforces.
 */
export { chunkBulkIds } from "./admin-list";

export async function bulkDeleteCmsDrafts(
  db: D1Database,
  contentIds: readonly string[],
  actor: { id: string; username: string },
): Promise<BulkDeleteReport> {
  const seen = new Set<string>();
  for (const raw of contentIds) {
    if (typeof raw !== "string") continue;
    const id = raw.trim();
    if (id === "" || id.length > 128) continue;
    seen.add(id);
  }
  const ids = [...seen];
  if (ids.length > MAX_BULK_RECORDS) {
    throw new Error(
      `Too many records selected for one delete request (max ${MAX_BULK_RECORDS}). Split the selection into smaller chunks.`,
    );
  }
  const { deleteCmsDraft } = await import("./content-delete.server");
  const report: BulkDeleteReport = {
    requested: ids.length,
    deleted: 0,
    skipped: 0,
    failed: 0,
    results: [],
  };
  for (const contentId of ids) {
    try {
      const result = await deleteCmsDraft(db, { contentId }, actor);
      if (result.deleted) {
        report.deleted += 1;
        report.results.push({ contentId, outcome: "deleted", entityType: result.entityType });
      } else {
        const first = result.blockers?.[0];
        report.skipped += 1;
        report.results.push({
          contentId,
          outcome: "skipped",
          entityType: result.entityType,
          ...(first !== undefined ? { reason: first.reason, message: first.message } : {}),
        });
      }
    } catch (e) {
      report.failed += 1;
      report.results.push({
        contentId,
        outcome: "failed",
        message: e instanceof Error ? e.message : "Delete failed.",
      });
    }
  }
  return report;
}

export { BULK_ENTITY_TYPES };
