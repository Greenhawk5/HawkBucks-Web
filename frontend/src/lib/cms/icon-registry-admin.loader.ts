import { createServerFn } from "@tanstack/react-start";
import {
  requireNonEmptyString,
  asOptionalNumber,
  asOptionalString,
  asOptionalStringOrNull,
  asSearchFilter,
  clampAdminPaging,
  stripUndefined,
} from "./admin-inputs";

/**
 * Icon registry admin boundaries (SERVER-ONLY fns).
 *
 * Thin transport over `./icon-registry.server`, shaped exactly like
 * catalog-admin.loader.ts: input validation here via the shared `admin-inputs`
 * helpers (fail-closed before any DB I/O), domain validation in the service.
 *
 * Deliberately narrow capabilities, matching the read/write split every other
 * Game Items surface uses:
 *   read  -> cms.read  (browse the Icons tab)
 *   write -> cms.write (register, edit, remove an entry)
 *
 * NOTHING HERE CAN DESTROY AN ASSET. `deleteAdminIconRegistryEntry` removes a
 * pointer row and nothing else — the `media_assets` row and the R2 object are
 * untouched. Destroying a file stays the Media Library's job, and because a live
 * registry binding is registered as a media reference, that path refuses to
 * delete an in-use object's bytes.
 */

async function requireIconSession(cap: "cms.read" | "cms.write", mutate = false) {
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

// ---------------------------------------------------------------------------
// Reads (cms.read)
// ---------------------------------------------------------------------------

export const listAdminIconRegistry = createServerFn({ method: "GET" })
  .validator((i: Record<string, unknown>) => {
    const { limit, offset } = clampAdminPaging({ limit: i["limit"], offset: i["offset"] });
    return stripUndefined({
      search: asSearchFilter(i["search"]),
      category: asOptionalString(i["category"]),
      limit,
      offset,
    });
  })
  .handler(async ({ data }) => {
    const { db } = await requireIconSession("cms.read");
    const { listIconRegistryEntries } = await import("./icon-registry.server");
    return listIconRegistryEntries(db, data);
  });

export const getAdminIconRegistryEntry = createServerFn({ method: "GET" })
  .validator((i: { id: string }) => ({ id: requireNonEmptyString(i.id, "id") }))
  .handler(async ({ data }) => {
    const { db } = await requireIconSession("cms.read");
    const { getIconRegistryEntry } = await import("./icon-registry.server");
    return getIconRegistryEntry(db, data.id);
  });

// ---------------------------------------------------------------------------
// Writes (cms.write + same-origin)
// ---------------------------------------------------------------------------

export const createAdminIconRegistryEntry = createServerFn({ method: "POST" })
  .validator(
    (i: {
      semanticKey: string;
      displayName: string;
      category?: string;
      mediaAssetId?: string | null;
    }) =>
      stripUndefined({
        semanticKey: requireNonEmptyString(i.semanticKey, "semanticKey"),
        displayName: requireNonEmptyString(i.displayName, "displayName"),
        category: asOptionalString(i.category),
        mediaAssetId: asOptionalStringOrNull(i.mediaAssetId),
      }),
  )
  .handler(async ({ data }) => {
    const { db } = await requireIconSession("cms.write", true);
    const { createIconRegistryEntry } = await import("./icon-registry.server");
    return createIconRegistryEntry(db, data as Parameters<typeof createIconRegistryEntry>[1]);
  });

export const updateAdminIconRegistryEntry = createServerFn({ method: "POST" })
  .validator(
    (i: { id: string; displayName?: string; category?: string; mediaAssetId?: string | null }) =>
      stripUndefined({
        id: requireNonEmptyString(i.id, "id"),
        displayName: asOptionalString(i.displayName),
        category: asOptionalString(i.category),
        mediaAssetId: asOptionalStringOrNull(i.mediaAssetId),
      }),
  )
  .handler(async ({ data }) => {
    const { db } = await requireIconSession("cms.write", true);
    const { updateIconRegistryEntry } = await import("./icon-registry.server");
    return updateIconRegistryEntry(db, data as Parameters<typeof updateIconRegistryEntry>[1]);
  });

export const deleteAdminIconRegistryEntry = createServerFn({ method: "POST" })
  .validator((i: { id: string }) => ({ id: requireNonEmptyString(i.id, "id") }))
  .handler(async ({ data }) => {
    const { db } = await requireIconSession("cms.write", true);
    const { deleteIconRegistryEntry } = await import("./icon-registry.server");
    await deleteIconRegistryEntry(db, data.id);
    return { ok: true };
  });
