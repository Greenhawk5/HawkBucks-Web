/**
 * Bulk lifecycle + draft deletion server functions (cross-entity boundary).
 *
 * These live in their own boundary rather than inside one content type's loader
 * because they apply uniformly to heroes, articles, loadouts, weapons, traps,
 * perks and schematics.
 *
 * Authoritative behaviour lives in the service modules:
 *   * `bulk-actions.server.ts`  — bounded id resolution + transition reporting
 *   * `content-delete.server.ts`— deletability policy + cascade
 *
 * The client never supplies a status it believes is legal, an eligibility
 * verdict, or a capability it believes it has: all three are re-derived here
 * from the database and the session.
 */

import { createServerFn } from "@tanstack/react-start";

import { requireContentId, requireNonEmptyString } from "./admin-inputs";
import { MAX_BULK_RECORDS } from "./admin-list";
import { isContentStatus, type ContentStatus } from "./publish";

async function requireLifecycleSession(capability: "cms.write" | "cms.publish", mutate = false) {
  const { resolveRequestCmsDb } = await import("./db.server");
  const { resolveRequestSession, hasCapability, CmsAuthError, assertSameOriginForMutation } =
    await import("./auth.server");
  if (mutate) assertSameOriginForMutation();
  const { db } = await resolveRequestCmsDb();
  const session = await resolveRequestSession(db);
  if (!session) throw new CmsAuthError(401, "CMS authentication required.");
  if (!hasCapability(session.user.role, capability)) throw new CmsAuthError(403, "Forbidden.");
  return { db, session };
}

/** Hard cap enforced here as well as in the service, at the transport edge. */
const MAX_SELECTED = MAX_BULK_RECORDS;

export interface BulkStatusRequest {
  /** Explicit page selection. Mutually exclusive with `allMatching`. */
  contentIds?: string[];
  /**
   * Cross-page selection. The client sends the FILTER and the server recomputes
   * the id set with the same query the list page used, so a crafted request
   * cannot reach records outside the visible result set.
   */
  allMatching?: BulkAllMatchingFilter | undefined;
  to: string;
}

export interface BulkAllMatchingFilter {
  entityType: string;
  q?: string;
  status?: string;
  heroClass?: string;
}

export const bulkSetContentStatus = createServerFn({ method: "POST" })
  .validator((input: BulkStatusRequest) => {
    if (!isContentStatus(input.to)) throw new Error("Invalid status transition.");
    const ids = Array.isArray(input.contentIds) ? input.contentIds : [];
    if (ids.length > MAX_SELECTED) {
      throw new Error(`Too many records selected (max ${MAX_SELECTED}).`);
    }
    // Only the closed entity-type union is accepted, and the filter is carried
    // through verbatim — never a pre-resolved id list from the client.
    const allMatching: BulkAllMatchingFilter | undefined =
      input.allMatching === undefined || input.allMatching === null
        ? undefined
        : {
            entityType: requireNonEmptyString(input.allMatching.entityType, "entityType"),
            q: typeof input.allMatching.q === "string" ? input.allMatching.q : "",
            status: typeof input.allMatching.status === "string" ? input.allMatching.status : "",
            heroClass:
              typeof input.allMatching.heroClass === "string" ? input.allMatching.heroClass : "",
          };
    if (allMatching === undefined && ids.length === 0) {
      throw new Error("Select at least one record.");
    }
    return { contentIds: ids, allMatching, to: input.to };
  })
  .handler(async ({ data }) => {
    const to = data.to as ContentStatus;
    // Publishing needs the stronger capability, decided server-side from the
    // requested target rather than from anything the client asserted.
    const { db, session } = await requireLifecycleSession(
      to === "published" ? "cms.publish" : "cms.write",
      true,
    );
    const { applyBulkStatusChange, resolveBulkMatchingIds, recountStatuses } =
      await import("./bulk-actions.server");
    const { setContentStatus } = await import("./db.server");
    const { buildEntityListFilter } = await import("./admin-list-filters");

    const entityTypes = [data.allMatching?.entityType].filter(
      (value): value is string => typeof value === "string",
    );
    const scope = entityTypes.length > 0 ? entityTypes : allKnownEntityTypes;

    let contentIds = data.contentIds;
    let recountBase: { from: string; where: string; values: unknown[] } | null = null;

    if (data.allMatching !== undefined) {
      const filter = buildEntityListFilter(data.allMatching.entityType, {
        q: data.allMatching.q ?? "",
        status: data.allMatching.status ?? "",
        heroClass: data.allMatching.heroClass ?? "",
      });
      const resolved = await resolveBulkMatchingIds(db, {
        from: filter.from,
        where: filter.where,
        values: filter.values,
      });
      contentIds = resolved.ids;
      if (resolved.truncated) {
        // Surfaced rather than silently applied to a subset.
        throw new Error(
          `Too many records match the current filters (${resolved.total}). Narrow the search before selecting everything.`,
        );
      }
      recountBase = { from: filter.from, where: filter.where, values: filter.values };
    }

    const report = await applyBulkStatusChange({
      db,
      contentIds,
      to,
      entityTypes: scope,
      actor: { id: session.user.id, username: session.user.username },
      setContentStatus,
    });

    // Re-read the facet counts for exactly the scope that was mutated, so the
    // status tabs update without a full browser reload and never show a count
    // for a different filter than the one on screen.
    const counts = recountBase === null ? null : await recountStatuses(db, recountBase);

    return { ...report, counts };
  });

/**
 * Entity types a bulk status change may target.
 *
 * Declared here so a crafted request cannot widen the scope: without an
 * explicit entityType the action is allowed across all CMS content, which is
 * still constrained per-record by the capability check and the transition rules.
 */
const allKnownEntityTypes = [
  "hero",
  "loadout",
  "weapon",
  "trap",
  "schematic",
  "perk",
  "article",
] as const;

export const deleteAdminDraftContent = createServerFn({ method: "POST" })
  .validator((i: { contentId: string }) => ({ contentId: requireContentId(i.contentId) }))
  .handler(async ({ data }) => {
    const { db, session } = await requireLifecycleSession("cms.write", true);
    const { deleteCmsDraft } = await import("./content-delete.server");
    const result = await deleteCmsDraft(
      db,
      { contentId: data.contentId },
      {
        id: session.user.id,
        username: session.user.username,
      },
    );
    if (!result.deleted) {
      // Not an exception: the caller gets a structured, explainable refusal so
      // the confirmation dialog can show exactly what blocked the delete.
      const message =
        result.blockers?.map((b) => b.message).join(" ") ?? "This record cannot be deleted.";
      return { ...result, message };
    }
    return { ...result, message: "Record permanently deleted." };
  });

/**
 * Read-only deletability probe, so the UI can offer Delete where it would
 * succeed and explain WHY elsewhere — instead of silently hiding the action
 * for records that could never be deleted. Advisory only: the destructive
 * paths always re-assess at execution time.
 */
export const getAdminDraftDeletability = createServerFn({ method: "GET" })
  .validator((i: { contentId: string }) => ({ contentId: requireContentId(i.contentId) }))
  .handler(async ({ data }) => {
    const { db } = await requireLifecycleSession("cms.write");
    const { assessContentDeletability } = await import("./content-delete.server");
    return { assessment: await assessContentDeletability(db, data.contentId) };
  });

/**
 * Batched deletability probe for a list page: one round trip for the whole
 * visible id set, with identical verdicts to the single probe (tested
 * parity). Returns reason codes + user-safe messages, never reference holder
 * ids.
 */
export const getAdminDraftDeletabilityMany = createServerFn({ method: "GET" })
  .validator((i: { contentIds: unknown }) => {
    const raw = Array.isArray(i.contentIds) ? i.contentIds : [];
    if (raw.length > MAX_SELECTED) {
      throw new Error(`Too many records selected (max ${MAX_SELECTED}).`);
    }
    return { contentIds: raw.map((id) => requireContentId(id)) };
  })
  .handler(async ({ data }) => {
    const { db } = await requireLifecycleSession("cms.write");
    const { assessManyContentDeletability } = await import("./content-delete.server");
    const full = await assessManyContentDeletability(db, data.contentIds);
    const eligibilities: Record<
      string,
      { eligible: boolean; reasons: Array<{ reason: string; message: string }> }
    > = {};
    for (const [id, assessment] of Object.entries(full)) {
      eligibilities[id] = { eligible: assessment.eligible, reasons: assessment.reasons };
    }
    return { eligibilities };
  });

/**
 * Bulk permanent delete.
 *
 * Reuses `bulkDeleteCmsDrafts`, which routes every record through the SAME
 * `deleteCmsDraft` single-record path (re-assessed eligibility + per-record
 * audit) — there is no weaker bulk-only deletion path. Bounded at the
 * transport edge; larger selections must arrive as multiple bounded chunks.
 */
export const bulkDeleteDraftContent = createServerFn({ method: "POST" })
  .validator((i: { contentIds: unknown }) => {
    const raw = Array.isArray(i.contentIds) ? i.contentIds : [];
    if (raw.length === 0) throw new Error("Select at least one record.");
    if (raw.length > MAX_SELECTED) {
      throw new Error(
        `Too many records selected for one delete request (max ${MAX_SELECTED}). Split the selection into smaller chunks.`,
      );
    }
    return { contentIds: raw.map((id) => requireContentId(id)) };
  })
  .handler(async ({ data }) => {
    const { db, session } = await requireLifecycleSession("cms.write", true);
    const { bulkDeleteCmsDrafts } = await import("./bulk-actions.server");
    return bulkDeleteCmsDrafts(db, data.contentIds, {
      id: session.user.id,
      username: session.user.username,
    });
  });
